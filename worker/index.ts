import { env } from "cloudflare:workers";
import type { MailSession } from "../server/mailService";

interface WorkerEnv {
  JWT_SECRET?: string;
  APP_URL?: string;
  FRONTEND_ORIGINS?: string;
}

const workerEnv = env as unknown as WorkerEnv;

process.env["CF_WORKERS"] = "1";
if (workerEnv.JWT_SECRET) process.env.JWT_SECRET = workerEnv.JWT_SECRET;
process.env.APP_URL = workerEnv.APP_URL || "https://temp-mail-generator.site";

const mailService = await import("../server/mailService");
const {
  configureCookieSecret,
  createMailSession,
  deleteMessage,
  encodeSessionCookie,
  extendSessionLifetime,
  fetchAttachmentBuffer,
  fetchMessageDetails,
  fetchMessages,
  getActiveDomains,
  restoreSessionCookie,
} = mailService;

configureCookieSecret(workerEnv.JWT_SECRET);

const allowedOrigins = new Set(
  (workerEnv.FRONTEND_ORIGINS || "https://temp-mail-generator.site")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

const requestLimits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const DEFAULT_LIMIT = 30;

function headersFor(request: Request, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const origin = request.headers.get("Origin");
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.append("Vary", "Origin");
  }
  headers.set("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return headers;
}

function json(request: Request, data: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = headersFor(request, extra);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}

function text(request: Request, data: string, contentType: string, status = 200): Response {
  const headers = headersFor(request);
  headers.set("Content-Type", contentType);
  return new Response(data, { status, headers });
}

function requestKey(request: Request): string {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "anonymous";
}

function allowRequest(request: Request, limit = DEFAULT_LIMIT): Response | null {
  const now = Date.now();
  const key = requestKey(request);
  const current = requestLimits.get(key);
  const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  entry.count += 1;
  requestLimits.set(key, entry);
  if (requestLimits.size > 5000) {
    requestLimits.forEach((item, ip) => {
      if (item.resetAt <= now) requestLimits.delete(ip);
    });
  }
  if (entry.count > limit) {
    return json(request, { error: "Too many requests. Please wait a minute and try again." }, 429, { "Retry-After": "60" });
  }
  return null;
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
    return ["https://api.mail.tm", "https://api.mail.gw"].includes(parsed.origin) ? url : "";
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

function readMailboxCookie(request: Request): MailSession | null {
  const raw = request.headers.get("Cookie") || "";
  const match = raw.match(/(?:^|;\s*)tm_session=([^;]+)/);
  return restoreSessionCookie(match?.[1]);
}

function requireMailboxSession(request: Request, login: string, domain: string): MailSession | Response {
  const session = readMailboxCookie(request);
  const requestedAddress = `${login.trim().toLowerCase()}@${domain.trim().toLowerCase()}`;
  if (!session || session.address !== requestedAddress || session.expiresAt <= Date.now()) {
    return json(request, { error: "This mailbox session is missing, expired, or not authorized." }, 403);
  }
  return session;
}

function mailboxCookie(session: MailSession): string {
  const maxAge = Math.max(1, Math.floor((session.expiresAt - Date.now()) / 1000));
  return `tm_session=${encodeSessionCookie(session)}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax; Path=/`;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function appUrl(): string {
  return process.env.APP_URL || "https://temp-mail-generator.site";
}

async function handle(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headersFor(request) });

  const url = new URL(request.url);
  const path = url.pathname;

  if (!workerEnv.JWT_SECRET) {
    return json(request, { error: "Worker secret configuration is incomplete." }, 503);
  }

  if (path === "/api/health" && request.method === "GET") {
    try {
      const domains = await getActiveDomains();
      return json(request, { status: "ok", provider: "mail.gw", domainsCount: domains.length, domains, timestamp: new Date().toISOString() });
    } catch {
      return json(request, { status: "error", message: "Health check temporarily unavailable." }, 503);
    }
  }

  if (path === "/api/domains" && request.method === "GET") {
    return json(request, await getActiveDomains());
  }

  if (path === "/api/mailbox/new" && request.method === "POST") {
    const limited = allowRequest(request, 12);
    if (limited) return limited;
    try {
      const body = await readJson(request);
      const session = await createMailSession(cleanParam(body.login, 64) || undefined, cleanParam(body.domain, 255) || undefined);
      return json(request, { success: true, address: session.address, expiresInSeconds: Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)), createdAt: session.createdAt }, 200, { "Set-Cookie": mailboxCookie(session) });
    } catch (error) {
      return json(request, { success: false, error: publicError(error, "Mailbox creation is temporarily unavailable. Please try again shortly.") }, 503);
    }
  }

  if (path === "/api/mailbox/extend" && request.method === "POST") {
    const limited = allowRequest(request, 12);
    if (limited) return limited;
    const body = await readJson(request);
    const login = cleanParam(body.login, 64);
    const domain = cleanParam(body.domain, 255);
    if (!login || !domain) return json(request, { error: "Parameters 'login' and 'domain' are required" }, 400);
    const owned = requireMailboxSession(request, login, domain);
    if (!(owned instanceof Object) || !("address" in owned)) return owned;
    const minutes = Number(body.minutes);
    const secondsLeft = extendSessionLifetime(login, domain, Number.isFinite(minutes) ? Math.min(10, Math.max(1, minutes)) : 10, owned as MailSession);
    if (!secondsLeft) return json(request, { error: "This mailbox session has expired." }, 403);
    return json(request, { success: true, expiresInSeconds: secondsLeft }, 200, { "Set-Cookie": mailboxCookie(owned as MailSession) });
  }

  const login = cleanParam(url.searchParams.get("login"), 64);
  const domain = cleanParam(url.searchParams.get("domain"), 255);

  if (path === "/api/messages" && request.method === "GET") {
    const limited = allowRequest(request);
    if (limited) return limited;
    if (!login || !domain) return json(request, { error: "Parameters 'login' and 'domain' are required" }, 400);
    const owned = requireMailboxSession(request, login, domain);
    if (!(owned instanceof Object) || !("address" in owned)) return owned;
    try { return json(request, await fetchMessages(login, domain, owned as MailSession)); }
    catch (error) { return json(request, { error: publicError(error, "Inbox temporarily unavailable. Please try refreshing shortly.") }, 503); }
  }

  if (path === "/api/message" && request.method === "GET") {
    const limited = allowRequest(request);
    if (limited) return limited;
    const id = safeMessageId(url.searchParams.get("id"));
    if (!login || !domain || !id) return json(request, { error: "Parameters 'login', 'domain', and 'id' are required" }, 400);
    const owned = requireMailboxSession(request, login, domain);
    if (!(owned instanceof Object) || !("address" in owned)) return owned;
    try { return json(request, await fetchMessageDetails(login, domain, id, owned as MailSession)); }
    catch (error) { return json(request, { error: publicError(error, "Message content temporarily unavailable.") }, 503); }
  }

  if (path === "/api/download-attachment" && request.method === "GET") {
    const limited = allowRequest(request);
    if (limited) return limited;
    const downloadUrl = safeAttachmentUrl(url.searchParams.get("downloadUrl"));
    if (!login || !domain || !downloadUrl) return json(request, { error: "Parameters 'login', 'domain', and 'downloadUrl' are required" }, 400);
    const owned = requireMailboxSession(request, login, domain);
    if (!(owned instanceof Object) || !("address" in owned)) return owned;
    try {
      const result = await fetchAttachmentBuffer(login, domain, downloadUrl, owned as MailSession);
      return new Response(result.buffer as unknown as BodyInit, { status: 200, headers: headersFor(request, { "Content-Type": result.contentType, "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"` }) });
    } catch (error) { return json(request, { error: publicError(error, "Attachment temporarily unavailable.") }, 503); }
  }

  if (path === "/api/eml" && request.method === "GET") {
    const limited = allowRequest(request);
    if (limited) return limited;
    const id = safeMessageId(url.searchParams.get("id"));
    if (!login || !domain || !id) return json(request, { error: "Parameters 'login', 'domain', and 'id' are required" }, 400);
    const owned = requireMailboxSession(request, login, domain);
    if (!(owned instanceof Object) || !("address" in owned)) return owned;
    try {
      const details = await fetchMessageDetails(login, domain, id, owned as MailSession);
      const content = [`From: ${details.from}`, `To: ${login}@${domain}`, `Subject: ${details.subject}`, `Date: ${new Date(details.date || Date.now()).toUTCString()}`, "MIME-Version: 1.0", "Content-Type: text/html; charset=utf-8", "X-Mailer: TempMailGenerator/2.0", "", details.htmlBody || details.body || ""].join("\r\n");
      return new Response(content, { status: 200, headers: headersFor(request, { "Content-Disposition": `attachment; filename="message-${id}.eml"`, "Content-Type": "message/rfc822" }) });
    } catch (error) { return json(request, { error: publicError(error, "Message export temporarily unavailable.") }, 503); }
  }

  if (path === "/api/message" && request.method === "DELETE") {
    const limited = allowRequest(request);
    if (limited) return limited;
    const id = safeMessageId(url.searchParams.get("id"));
    if (!login || !domain || !id) return json(request, { error: "Parameters 'login', 'domain', and 'id' are required" }, 400);
    const owned = requireMailboxSession(request, login, domain);
    if (!(owned instanceof Object) || !("address" in owned)) return owned;
    try { return json(request, { success: await deleteMessage(login, domain, id, owned as MailSession) }); }
    catch (error) { return json(request, { error: publicError(error, "Message deletion temporarily unavailable.") }, 503); }
  }

  if (path === "/api/contact" && request.method === "POST") {
    const limited = allowRequest(request, 5);
    if (limited) return limited;
    const body = await readJson(request);
    const name = cleanParam(body.name, 80);
    const email = cleanParam(body.email, 254);
    const subject = cleanParam(body.subject, 160);
    const message = cleanParam(body.message, 4000);
    if (!name || !email || !subject || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(request, { error: "All contact fields are required." }, 400);
    return json(request, { success: true, message: "Thank you! Your message has been received." });
  }

  if (path === "/api/indexnow" && request.method === "POST") {
    const limited = allowRequest(request, 3);
    if (limited) return limited;
    const body = await readJson(request);
    const host = cleanParam(body.host, 253).toLowerCase();
    const key = cleanParam(body.key, 128);
    const keyLocation = cleanParam(body.keyLocation, 2048);
    const urlList = Array.isArray(body.urlList)
      ? body.urlList.filter((item): item is string => typeof item === "string").map((item) => item.trim()).slice(0, 100)
      : [];
    let keyUrl: URL;
    try {
      keyUrl = new URL(keyLocation);
    } catch {
      return json(request, { error: "A valid key location URL is required." }, 400);
    }
    const validUrls = urlList.length > 0 && urlList.every((item) => {
      try {
        const itemUrl = new URL(item);
        return itemUrl.protocol === "https:" && itemUrl.hostname === host;
      } catch {
        return false;
      }
    });
    if (!host || !/^[a-z0-9.-]+$/.test(host) || !/^[A-Za-z0-9_-]{16,128}$/.test(key) || keyUrl.protocol !== "https:" || !validUrls) {
      return json(request, { error: "Provide a valid HTTPS host, key, key location, and same-host URL list." }, 400);
    }
    try {
      const upstream = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key, keyLocation, urlList }),
      });
      return json(request, {
        success: upstream.ok,
        message: upstream.ok ? "Successfully submitted to IndexNow." : "IndexNow could not accept the submission.",
      }, upstream.ok ? 200 : 502);
    } catch {
      return json(request, { success: false, error: "IndexNow is temporarily unavailable." }, 503);
    }
  }

  if (path === "/robots.txt" && request.method === "GET") return text(request, `User-agent: *\nAllow: /\nSitemap: ${appUrl()}/sitemap-index.xml\n`, "text/plain; charset=utf-8");
  if (path === "/sitemap-index.xml" && request.method === "GET") return text(request, `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${appUrl()}/sitemap-pages.xml</loc></sitemap></sitemapindex>`, "application/xml; charset=utf-8");
  if (path === "/sitemap-pages.xml" && request.method === "GET") return text(request, `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${appUrl()}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url></urlset>`, "application/xml; charset=utf-8");
  if (path === "/sitemap.xml" && request.method === "GET") return Response.redirect(`${appUrl()}/sitemap-index.xml`, 301);

  return json(request, { error: "Not found" }, 404);
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      return await handle(request);
    } catch {
      return json(request, { error: "The API is temporarily unavailable." }, 503);
    }
  },
};
