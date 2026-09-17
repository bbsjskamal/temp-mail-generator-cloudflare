from pathlib import Path
import re

root = Path('/home/ubuntu/temp-mail-generator-site')

# Server bootstrap: reduce parser limits and add safe default headers.
p = root / 'server/_core/index.ts'
s = p.read_text()
s = s.replace('  const app = express();\n  const server = createServer(app);\n  // Configure body parser with larger size limit for file uploads\n  app.use(express.json({ limit: "50mb" }));\n  app.use(express.urlencoded({ limit: "50mb", extended: true }));', '''  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });
  // This service accepts small JSON form requests; it does not need multi-megabyte uploads.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));''')
p.write_text(s)

# Routes: validation, bounded in-memory abuse controls, and no demo data in production.
p = root / 'server/mailRoutes.ts'
s = p.read_text()
s = s.replace('import { getSampleVerificationMessage } from "./sampleVerification";\n', '')
marker = 'function readMailboxCookie(req: express.Request) {'
helpers = '''const requestLimits = new Map<string, { count: number; resetAt: number }>();
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

function publicError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : "";
  if (/429|rate limit|too many/i.test(message)) return "The mail provider is temporarily busy. Please try again shortly.";
  if (/expired|not found|404/i.test(message)) return "This mailbox or message has expired.";
  return fallback;
}

'''
if 'const requestLimits' not in s:
    s = s.replace(marker, helpers + marker)

s = s.replace('  app.post("/api/mailbox/new", async (req, res) => {\n    try {\n      const { login, domain } = req.body || {};\n      const session = await createMailSession(login, domain);', '''  app.post("/api/mailbox/new", async (req, res) => {
    if (!allowRequest(req, res, 12)) return;
    try {
      const body = req.body || {};
      const login = cleanParam(body.login, 64);
      const domain = cleanParam(body.domain, 255);
      const session = await createMailSession(login || undefined, domain || undefined);''')
s = s.replace('      res.status(500).json({ success: false, error: error.message || "Failed to create mailbox" });', '      res.status(/429|rate limit/i.test(String(error)) ? 429 : 503).json({ success: false, error: publicError(error, "Mailbox creation is temporarily unavailable. Please try again shortly.") });')

s = s.replace('  app.get("/api/messages", async (req, res) => {\n    const { login, domain, simulate } = req.query;\n    if (!login || !domain) {', '''  app.get("/api/messages", async (req, res) => {
    if (!allowRequest(req, res)) return;
    const login = cleanParam(req.query.login, 64);
    const domain = cleanParam(req.query.domain, 255);
    if (!login || !domain) {''')
s = s.replace('      readMailboxCookie(req);\n      const list = await fetchMessages(String(login), String(domain));\n      if (list.length === 0 && simulate === "true") {\n        const sample = getSampleVerificationMessage(`${login}@${domain}`);\n        return res.json([sample.summary]);\n      }\n      res.json(list);', '      readMailboxCookie(req);\n      const list = await fetchMessages(login, domain);\n      res.json(list);')
s = s.replace('      if (simulate === "true") {\n        const sample = getSampleVerificationMessage(`${login}@${domain}`);\n        return res.json([sample.summary]);\n      }\n      res.status(500).json({ error: error.message || "Failed to load inbox" });', '      res.status(503).json({ error: publicError(error, "Inbox temporarily unavailable. Please try refreshing shortly.") });')

# Remove the sample message shortcut entirely.
s = re.sub(r'\n\s*if \(id === "sample-verification-code"\) \{[\s\S]*?\n\s*\}\n', '\n', s, count=1)
s = re.sub(r'\n\s*if \(id === "sample-verification-code"\) \{[\s\S]*?\n\s*\}\n', '\n', s, count=1)
s = re.sub(r'\n\s*if \(String\(downloadUrl\)\.includes\("sample-attachment"\)\) \{[\s\S]*?\n\s*\}\n', '\n', s, count=1)

# Sanitize remaining server error payloads.
s = s.replace('res.status(500).json({ status: "error", message: String(error) });', 'res.status(503).json({ status: "error", message: "Health check temporarily unavailable." });')
s = s.replace('res.status(500).json({ error: error.message || "Failed to load message content" });', 'res.status(503).json({ error: publicError(error, "Message content temporarily unavailable.") });')
s = s.replace('res.status(500).json({ error: error.message || "Failed to download attachment" });', 'res.status(503).json({ error: publicError(error, "Attachment temporarily unavailable.") });')
s = s.replace('res.status(500).json({ error: error.message || "Failed to export EML" });', 'res.status(503).json({ error: publicError(error, "Message export temporarily unavailable.") });')
s = s.replace('res.status(500).json({ error: error.message || "Failed to delete message" });', 'res.status(503).json({ error: publicError(error, "Message deletion temporarily unavailable.") });')
# Limit and validate contact input; never log message contents.
s = s.replace('    const { name, email, subject, message } = req.body || {};\n    if (!name || !email || !subject || !message) {', '    if (!allowRequest(req, res, 5)) return;\n    const name = cleanParam(req.body?.name, 80);\n    const email = cleanParam(req.body?.email, 254);\n    const subject = cleanParam(req.body?.subject, 160);\n    const message = cleanParam(req.body?.message, 4000);\n    if (!name || !email || !subject || !message || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {')
s = s.replace('    console.log(`[Contact Submission] From: ${name} <${email}> | Subject: ${subject}`);', '    console.log(`[Contact Submission] Received a support request with subject length ${subject.length}`);')
# Disable the unsafe public IndexNow proxy from the client surface.
s = re.sub(r'\n\s*// IndexNow submission proxy[\s\S]*?\n\s*// Robots & Sitemaps', '\n\n  // Robots & Sitemaps', s, count=1)
# The static dynamic sitemap should list only real crawlable routes; hash fragments are not pages.
s = re.sub(r'  app\.get\("/sitemap-pages\.xml",[\s\S]*?\n  \}\);\n\n  app\.get\("/sitemap-domains\.xml"', '''  app.get("/sitemap-pages.xml", (req, res) => {
    const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
    const appUrl = process.env.APP_URL || `${protocol}://${req.get("host")}`;
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${appUrl}/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>
</urlset>`.trim());
  });

  app.get("/sitemap-domains.xml"''', s, count=1)
# Do not advertise domain URLs that have no crawlable route.
s = s.replace('  <sitemap><loc>${appUrl}/sitemap-domains.xml</loc></sitemap>\n', '')
p.write_text(s)

# Add a small local favicon and richer document metadata.
favicon = root / 'client/public/favicon.svg'
favicon.write_text('''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#eefbf6"/><path d="M14 20h36a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4Z" fill="none" stroke="#00a873" stroke-width="5"/><path d="m12 25 20 15 20-15" fill="none" stroke="#00a873" stroke-width="5" stroke-linejoin="round"/></svg>''')
p = root / 'client/index.html'
s = p.read_text()
if '<link rel="icon"' not in s:
    s = s.replace('    <link rel="canonical" href="https://temp-mail-generator.site" />', '    <link rel="canonical" href="https://temp-mail-generator.site/" />\n    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />\n    <link rel="alternate icon" href="/favicon.svg" />')
s = s.replace('<meta name="keywords" content="temp mail, tempmail, disposable email, temporary email, anonymous email, burner email, fake email, 10 minute mail, trash mail, spam protection" />', '<meta name="keywords" content="temporary email, disposable email, 10 minute mail, inbox for trials, spam protection" />')
p.write_text(s)

# Make robots advertise one canonical sitemap only.
(root / 'client/public/robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://temp-mail-generator.site/sitemap-index.xml\n')
(root / 'client/public/sitemap-index.xml').write_text('''<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap><loc>https://temp-mail-generator.site/sitemap-pages.xml</loc></sitemap>\n</sitemapindex>\n''')
(root / 'client/public/sitemap.xml').write_text((root / 'client/public/sitemap-index.xml').read_text())
(root / 'client/public/sitemap-pages.xml').write_text('''<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://temp-mail-generator.site/</loc><priority>1.0</priority><changefreq>daily</changefreq></url>\n</urlset>\n''')
print('Launch hardening applied')
''
