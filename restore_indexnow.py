from pathlib import Path
p = Path('/home/ubuntu/temp-mail-generator-site/server/mailRoutes.ts')
s = p.read_text()
marker = '  // Robots & Sitemaps\n'
route = '''  // IndexNow submission proxy with strict same-host URL validation.
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
    const validUrls = urlList.length > 0 && urlList.every((item) => {
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

'''
if 'app.post("/api/indexnow"' not in s:
    s = s.replace(marker, route + marker)
p.write_text(s)
print('IndexNow route restored securely')
''
