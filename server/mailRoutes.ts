import express from "express";
import {
  getActiveDomains,
  createMailSession,
  getOrRefreshSession,
  fetchMessages,
  fetchMessageDetails,
  fetchAttachmentBuffer,
  extendSessionLifetime,
  deleteMessage,
} from "./mailService";
import { getSampleVerificationMessage } from "./sampleVerification";

export function registerMailApiRoutes(app: express.Express) {
  // Health & diagnostics
  app.get("/api/health", async (_req, res) => {
    try {
      const domains = await getActiveDomains();
      res.json({
        status: "ok",
        provider: "mail.tm",
        domainsCount: domains.length,
        domains,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: String(error) });
    }
  });

  // Active domains list
  app.get("/api/domains", async (_req, res) => {
    try {
      const domains = await getActiveDomains();
      res.json(domains);
    } catch (error) {
      console.error("[API] /api/domains failed:", error);
      res.json(["mail.tm"]);
    }
  });

  // Explicit session creation / generation endpoint
  app.post("/api/mailbox/new", async (req, res) => {
    try {
      const { login, domain } = req.body || {};
      const session = await createMailSession(login, domain);
      res.json({
        success: true,
        address: session.address,
        expiresInSeconds: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
        createdAt: session.createdAt,
      });
    } catch (error: any) {
      console.error("[API] /api/mailbox/new failed:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to create mailbox" });
    }
  });

  // Extend mailbox lifetime
  app.post("/api/mailbox/extend", async (req, res) => {
    try {
      const { login, domain, minutes } = req.body || {};
      if (!login || !domain) {
        return res.status(400).json({ error: "Parameters 'login' and 'domain' are required" });
      }
      const secondsLeft = extendSessionLifetime(String(login), String(domain), Number(minutes) || 10);
      res.json({ success: true, expiresInSeconds: secondsLeft });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to extend lifetime" });
    }
  });

  // Inbox list endpoint
  app.get("/api/messages", async (req, res) => {
    const { login, domain, simulate } = req.query;
    if (!login || !domain) {
      return res.status(400).json({ error: "Parameters 'login' and 'domain' are required" });
    }

    try {
      const list = await fetchMessages(String(login), String(domain));
      if (list.length === 0 && simulate === "true") {
        const sample = getSampleVerificationMessage(`${login}@${domain}`);
        return res.json([sample.summary]);
      }
      res.json(list);
    } catch (error: any) {
      console.error("[API] /api/messages failed:", error);
      if (simulate === "true") {
        const sample = getSampleVerificationMessage(`${login}@${domain}`);
        return res.json([sample.summary]);
      }
      res.status(500).json({ error: error.message || "Failed to load inbox" });
    }
  });

  // Message details endpoint
  app.get("/api/message", async (req, res) => {
    const { login, domain, id } = req.query;
    if (!login || !domain || !id) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'id' are required" });
    }

    if (id === "sample-verification-code") {
      const sample = getSampleVerificationMessage(`${login}@${domain}`);
      return res.json(sample.details);
    }

    try {
      const details = await fetchMessageDetails(String(login), String(domain), String(id));
      res.json(details);
    } catch (error: any) {
      console.error("[API] /api/message failed:", error);
      res.status(500).json({ error: error.message || "Failed to load message content" });
    }
  });

  // Attachment download endpoint
  app.get("/api/download-attachment", async (req, res) => {
    const { login, domain, downloadUrl } = req.query;
    if (!login || !domain || !downloadUrl) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'downloadUrl' are required" });
    }

    if (String(downloadUrl).includes("sample-attachment")) {
      const sampleContent = Buffer.from("Verification Confirmation: Your trial account for Temp-Mail-Generator.site is active.\nStatus: Inbound-only verification enabled.\n");
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Content-Disposition", 'attachment; filename="terms-confirmation.txt"');
      return res.send(sampleContent);
    }

    try {
      const { buffer, contentType, filename } = await fetchAttachmentBuffer(
        String(login),
        String(domain),
        String(downloadUrl)
      );

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error("[API] /api/download-attachment failed:", error);
      res.status(500).json({ error: error.message || "Failed to download attachment" });
    }
  });

  // EML export endpoint
  app.get("/api/eml", async (req, res) => {
    const { login, domain, id } = req.query;
    if (!login || !domain || !id) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'id' are required" });
    }

    try {
      let details;
      if (id === "sample-verification-code") {
        details = getSampleVerificationMessage(`${login}@${domain}`).details;
      } else {
        details = await fetchMessageDetails(String(login), String(domain), String(id));
      }

      const emlContent = [
        `From: ${details.from}`,
        `To: ${login}@${domain}`,
        `Subject: ${details.subject}`,
        `Date: ${new Date(details.date || Date.now()).toUTCString()}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `X-Mailer: TempMailGenerator/2.0`,
        ``,
        details.htmlBody || details.body || "",
      ].join("\r\n");

      res.setHeader("Content-Disposition", `attachment; filename="message-${id}.eml"`);
      res.setHeader("Content-Type", "message/rfc822");
      res.send(emlContent);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to export EML" });
    }
  });

  // Delete message
  app.delete("/api/message", async (req, res) => {
    const { login, domain, id } = req.query;
    if (!login || !domain || !id) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'id' are required" });
    }

    try {
      const ok = await deleteMessage(String(login), String(domain), String(id));
      res.json({ success: ok });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to delete message" });
    }
  });

  // Contact form submission
  app.post("/api/contact", (req, res) => {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All contact fields are required." });
    }

    console.log(`[Contact Submission] From: ${name} <${email}> | Subject: ${subject}`);
    res.json({ success: true, message: "Thank you! Your message has been received." });
  });

  // Anti-abuse check (rate limiter helper)
  const creationsPerIp = new Map<string, { count: number; resetAt: number }>();
  app.post("/api/abuse-check", (req, res) => {
    const forwarded = req.headers["x-forwarded-for"] as string;
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "anonymous";
    const now = Date.now();
    const entry = creationsPerIp.get(ip) || { count: 0, resetAt: now + 3 * 60 * 1000 };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + 3 * 60 * 1000;
    }

    entry.count++;
    creationsPerIp.set(ip, entry);

    res.json({
      requiresCaptcha: entry.count > 15,
      remainingAllowance: Math.max(0, 15 - entry.count),
    });
  });

  // Search Engine & Sitemap verification endpoints
  app.get("/googled87c6cde125caf0b.html", (_req, res) => {
    res.type("text/html");
    res.send("google-site-verification: googled87c6cde125caf0b.html");
  });

  app.get("/googlecbd160f3afc3ad7c.html", (_req, res) => {
    res.type("text/html");
    res.send("google-site-verification: googlecbd160f3afc3ad7c.html");
  });

  app.get("/d4f2c0ecf9004ddea86b01655385f1da.txt", (_req, res) => {
    res.type("text/plain; charset=utf-8");
    res.send("d4f2c0ecf9004ddea86b01655385f1da");
  });

  // IndexNow submission proxy
  app.post("/api/indexnow", async (req, res) => {
    const { host, key, keyLocation, urlList } = req.body || {};
    if (!host || !key || !keyLocation || !Array.isArray(urlList) || urlList.length === 0) {
      return res.status(400).json({ error: "Missing required parameters (host, key, keyLocation, urlList)." });
    }

    try {
      const upstream = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key, keyLocation, urlList }),
      });
      const data = await upstream.text().catch(() => "");
      res.json({
        success: upstream.ok,
        status: upstream.status,
        message: upstream.ok ? "Successfully submitted to IndexNow." : `IndexNow responded with status ${upstream.status}`,
        data,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Robots & Sitemaps
  app.get("/robots.txt", (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || `${protocol}://${req.get("host")}`;
    res.type("text/plain");
    res.send(`User-agent: *\nAllow: /\nSitemap: ${appUrl}/sitemap-index.xml\n`);
  });

  app.get("/sitemap-index.xml", (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || `${protocol}://${req.get("host")}`;
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${appUrl}/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>${appUrl}/sitemap-domains.xml</loc></sitemap>
</sitemapindex>`.trim());
  });

  app.get("/sitemap-pages.xml", (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || `${protocol}://${req.get("host")}`;
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${appUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>${appUrl}/#home</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
  <url><loc>${appUrl}/#faq</loc><priority>0.8</priority><changefreq>weekly</changefreq></url>
  <url><loc>${appUrl}/#about</loc><priority>0.7</priority><changefreq>monthly</changefreq></url>
  <url><loc>${appUrl}/#contact</loc><priority>0.7</priority><changefreq>monthly</changefreq></url>
</urlset>`.trim());
  });

  app.get("/sitemap-domains.xml", async (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || `${protocol}://${req.get("host")}`;
    const domains = await getActiveDomains();
    const urls = domains.map((domain: string) => `  <url><loc>${appUrl}/domain/${domain}</loc><priority>0.8</priority><changefreq>daily</changefreq></url>`).join("\n");
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`.trim());
  });

  app.get("/sitemap.xml", (_req, res) => {
    res.redirect(301, "/sitemap-index.xml");
  });
}
