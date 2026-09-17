from pathlib import Path
p = Path('/home/ubuntu/temp-mail-generator-site/server/mailRoutes.ts')
s = p.read_text()
s = s.replace('process.env.APP_URL || `${protocol}://${req.get("host")}`', 'process.env.APP_URL || "https://temp-mail-generator.site"')
# Add strict message id and attachment URL helpers.
needle = 'function publicError(error: unknown, fallback: string): string {'
helper = '''function safeMessageId(value: unknown): string {
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

'''
if 'function safeMessageId' not in s:
    s = s.replace(needle, helper + needle)
# Replace repeated presence checks with strict values in routes.
s = s.replace('    const { login, domain, id } = req.query;\n    if (!login || !domain || !id) {', '    const { login, domain } = req.query;\n    const id = safeMessageId(req.query.id);\n    if (!login || !domain || !id) {')
s = s.replace('    const { login, domain, downloadUrl } = req.query;\n    if (!login || !domain || !downloadUrl) {', '    const { login, domain } = req.query;\n    const downloadUrl = safeAttachmentUrl(req.query.downloadUrl);\n    if (!login || !domain || !downloadUrl) {')
p.write_text(s)

p = Path('/home/ubuntu/temp-mail-generator-site/server/mailService.ts')
s = p.read_text()
s = s.replace('  const url = downloadUrl.startsWith("http") ? downloadUrl : `${API_BASE}${downloadUrl}`;', '  const url = downloadUrl.startsWith("http") ? downloadUrl : `${API_BASE}${downloadUrl}`;\n  const parsedUrl = new URL(url);\n  if (parsedUrl.origin !== API_BASE || !parsedUrl.pathname.startsWith("/attachments/")) {\n    throw new Error("Invalid attachment URL");\n  }')
p.write_text(s)
print('Security follow-up applied')
