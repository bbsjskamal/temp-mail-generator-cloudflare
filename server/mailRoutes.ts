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
  encodeSessionCookie,
  restoreSessionCookie,
  type MailSession,
} from "./mailService";

const requestLimits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

function requestIp(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || "anonymous";
}

function allowRequest(req: express.Request, res: express.Response, limit = MAX_REQUESTS_PER_WINDOW): boolean {
  const now = Date.now();
  const key = requestIp(req);
  const current = requestLimits.get(key);
  const entry = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : current;
  entry.count += 1;
  requestLimits.set(key, entry);
  if (requestLimits.size > 5000) {
    requestLimits.forEach((item, ip) => {
      if (item.resetAt <= now) requestLimits.delete(ip);
    });
  }
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit - entry.count));
  if (entry.count > limit) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Too many requests. Please wait a minute and try again." });
    return false;
  }
  return true;
}

function cleanParam(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function safeMessageId(value: unknown): string {
  const id = cleanParam(value, 128);
  return /^[A-Za-z0-9_-]+$/.test(id) ? id : "";
}

function safeAttachmentUrl(value: unknown): string {
  const url = cleanParam(value, 1024);
  if (url.startsWith("/api/") && !url.includes("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.origin === "https://api.mail.tm" ? url : "";
  } catch {
    return "";
  }
}

function publicError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (/429|rate limit|too many/i.test(message)) return "The mail provider is temporarily busy. Please try again shortly.";
  if (/expired|not found|404/i.test(message)) return "This mailbox or message has expired.";
  return fallback;
}

function readMailboxCookie(req: express.Request) {
  const raw = req.headers.cookie || "";
  const match = raw.match(/(?:^|;\s*)tm_session=([^;]+)/);
  return restoreSessionCookie(match?.[1]);
}

function requireMailboxSession(
  req: express.Request,
  res: express.Response,
  login: string,
  domain: string,
): MailSession | null {
  const session = readMailboxCookie(req);
  const requestedAddress = `${login.trim().toLowerCase()}@${domain.trim().toLowerCase()}`;
  if (!session || session.address !== requestedAddress || session.expiresAt <= Date.now()) {
    res.status(403).json({ error: "This mailbox session is missing, expired, or not authorized." });
    return null;
  }
  return session;
}

function setMailboxCookie(res: express.Response, session: Awaited<ReturnType<typeof createMailSession>>) {
  res.cookie("tm_session", encodeSessionCookie(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || process.env.CF_WORKERS === "1",
    sameSite: "lax",
    maxAge: Math.max(1, session.expiresAt - Date.now()),
    path: "/",
  });
}

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
      res.status(503).json({ status: "error", message: "Health check temporarily unavailable." });
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
    if (!allowRequest(req, res, 12)) return;
    try {
      const body = req.body || {};
      const login = cleanParam(body.login, 64);
      const domain = cleanParam(body.domain, 255);
      const session = await createMailSession(login || undefined, domain || undefined);
      setMailboxCookie(res, session);
      res.json({
        success: true,
        address: session.address,
        expiresInSeconds: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)),
        createdAt: session.createdAt,
      });
    } catch (error: any) {
      console.error("[API] /api/mailbox/new failed:", error instanceof Error ? error.name : "unknown");
      res.status(/429|rate limit/i.test(String(error)) ? 429 : 503).json({ success: false, error: publicError(error, "Mailbox creation is temporarily unavailable. Please try again shortly.") });
    }
  });

  // Extend mailbox lifetime
  app.post("/api/mailbox/extend", async (req, res) => {
    if (!allowRequest(req, res, 12)) return;
    try {
      const login = cleanParam(req.body?.login, 64);
      const domain = cleanParam(req.body?.domain, 255);
      const minutes = Number(req.body?.minutes);
      if (!login || !domain) {
        return res.status(400).json({ error: "Parameters 'login' and 'domain' are required" });
      }
      const session = requireMailboxSession(req, res, login, domain);
      if (!session) return;
      const secondsLeft = extendSessionLifetime(login, domain, Number.isFinite(minutes) ? Math.min(10, Math.max(1, minutes)) : 10, session);
      if (!secondsLeft) return res.status(403).json({ error: "This mailbox session has expired." });
      setMailboxCookie(res, session);
      res.json({ success: true, expiresInSeconds: secondsLeft });
    } catch (error: any) {
      res.status(503).json({ error: publicError(error, "Mailbox lifetime could not be extended right now.") });
    }
  });

  // Inbox list endpoint
  app.get("/api/messages", async (req, res) => {
    if (!allowRequest(req, res)) return;
    const login = cleanParam(req.query.login, 64);
    const domain = cleanParam(req.query.domain, 255);
    if (!login || !domain) {
      return res.status(400).json({ error: "Parameters 'login' and 'domain' are required" });
    }

    try {
      const session = requireMailboxSession(req, res, login, domain);
      if (!session) return;
      const list = await fetchMessages(login, domain, session);
      res.json(list);
    } catch (error: any) {
      console.error("[API] /api/messages failed:", error instanceof Error ? error.name : "unknown");
      res.status(503).json({ error: publicError(error, "Inbox temporarily unavailable. Please try refreshing shortly.") });
    }
  });

  // Message details endpoint
  app.get("/api/message", async (req, res) => {
    if (!allowRequest(req, res)) return;
    const { login, domain } = req.query;
    const id = safeMessageId(req.query.id);
    if (!login || !domain || !id) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'id' are required" });
    }

    try {
      const session = requireMailboxSession(req, res, String(login), String(domain));
      if (!session) return;
      const details = await fetchMessageDetails(String(login), String(domain), String(id), session);
      res.json(details);
    } catch (error: any) {
      console.error("[API] /api/message failed:", error instanceof Error ? error.name : "unknown");
      res.status(503).json({ error: publicError(error, "Message content temporarily unavailable.") });
    }
  });

  // Attachment download endpoint
  app.get("/api/download-attachment", async (req, res) => {
    if (!allowRequest(req, res)) return;
    const { login, domain } = req.query;
    const downloadUrl = safeAttachmentUrl(req.query.downloadUrl);
    if (!login || !domain || !downloadUrl) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'downloadUrl' are required" });
    }

    try {
      const session = requireMailboxSession(req, res, String(login), String(domain));
      if (!session) return;
      const { buffer, contentType, filename } = await fetchAttachmentBuffer(
        String(login),
        String(domain),
        String(downloadUrl),
        session,
      );

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      res.send(buffer);
    } catch (error: any) {
      console.error("[API] /api/download-attachment failed:", error instanceof Error ? error.name : "unknown");
      res.status(503).json({ error: publicError(error, "Attachment temporarily unavailable.") });
    }
  });

  // EML export endpoint
  app.get("/api/eml", async (req, res) => {
    if (!allowRequest(req, res)) return;
    const { login, domain } = req.query;
    const id = safeMessageId(req.query.id);
    if (!login || !domain || !id) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'id' are required" });
    }

    try {
      const session = requireMailboxSession(req, res, String(login), String(domain));
      if (!session) return;
      const details = await fetchMessageDetails(String(login), String(domain), String(id), session);
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
      res.status(503).json({ error: publicError(error, "Message export temporarily unavailable.") });
    }
  });

  // Delete message
  app.delete("/api/message", async (req, res) => {
    if (!allowRequest(req, res)) return;
    const { login, domain } = req.query;
    const id = safeMessageId(req.query.id);
    if (!login || !domain || !id) {
      return res.status(400).json({ error: "Parameters 'login', 'domain', and 'id' are required" });
    }

    try {
      const session = requireMailboxSession(req, res, String(login), String(domain));
      if (!session) return;
      const ok = await deleteMessage(String(login), String(domain), String(id), session);
      res.json({ success: ok });
    } catch (error: any) {
      res.status(503).json({ error: publicError(error, "Message deletion temporarily unavailable.") });
    }
  });

  // Contact form submission
  app.post("/api/contact", (req, res) => {
    if (!allowRequest(req, res, 5)) return;
    const name = cleanParam(req.body?.name, 80);
    const email = cleanParam(req.body?.email, 254);
    const subject = cleanParam(req.body?.subject, 160);
    const message = cleanParam(req.body?.message, 4000);
    if (!name || !email || !subject || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "All contact fields are required." });
    }

    console.log(`[Contact Submission] Received a support request with subject length ${subject.length}`);
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

  // IndexNow submission proxy with strict same-host URL validation.
  app.post("/api/indexnow", async (req, res) => {
    if (!allowRequest(req, res, 3)) return;
    const host = cleanParam(req.body?.host, 253).toLowerCase();
    const key = cleanParam(req.body?.key, 128);
    const keyLocation = cleanParam(req.body?.keyLocation, 2048);
    const urlList = Array.isArray(req.body?.urlList)
      ? req.body.urlList.filter((item: unknown): item is string => typeof item === "string").map((item: string) => item.trim()).slice(0, 100)
      : [];
    let keyUrl: URL;
    try {
      keyUrl = new URL(keyLocation);
    } catch {
      return res.status(400).json({ error: "A valid key location URL is required." });
    }
    const validUrls = urlList.length > 0 && urlList.every((item: string) => {
      try {
        const url = new URL(item);
        return url.protocol === "https:" && url.hostname === host;
      } catch {
        return false;
      }
    });
    if (!host || !/^[a-z0-9.-]+$/.test(host) || !/^[A-Za-z0-9_-]{16,128}$/.test(key) || keyUrl.protocol !== "https:" || !validUrls) {
      return res.status(400).json({ error: "Provide a valid HTTPS host, key, key location, and same-host URL list." });
    }
    try {
      const upstream = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key, keyLocation, urlList }),
      });
      res.status(upstream.ok ? 200 : 502).json({
        success: upstream.ok,
        message: upstream.ok ? "Successfully submitted to IndexNow." : "IndexNow could not accept the submission.",
      });
    } catch (error) {
      console.error("[API] IndexNow request failed:", error instanceof Error ? error.name : "unknown");
      res.status(503).json({ success: false, error: "IndexNow is temporarily unavailable." });
    }
  });

  // Robots & Sitemaps
  app.get("/robots.txt", (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || "https://temp-mail-generator.site";
    res.type("text/plain");
    res.send(`User-agent: *\nAllow: /\nSitemap: ${appUrl}/sitemap-index.xml\n`);
  });

  app.get("/sitemap-index.xml", (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || "https://temp-mail-generator.site";
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${appUrl}/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`.trim());
  });

  app.get("/sitemap-pages.xml", (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || "https://temp-mail-generator.site";
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${appUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
</urlset>`.trim());
  });

  app.get("/sitemap.xml", (_req, res) => {
    res.redirect(301, "/sitemap-index.xml");
  });
}
