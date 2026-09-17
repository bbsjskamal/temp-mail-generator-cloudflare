from pathlib import Path
p = Path('/home/ubuntu/temp-mail-generator-site/server/mailRoutes.ts')
s = p.read_text()
replacements = {
'console.error("[API] /api/mailbox/new failed:", error);': 'console.error("[API] /api/mailbox/new failed:", error instanceof Error ? error.name : "unknown");',
'console.error("[API] /api/messages failed:", error);': 'console.error("[API] /api/messages failed:", error instanceof Error ? error.name : "unknown");',
'console.error("[API] /api/message failed:", error);': 'console.error("[API] /api/message failed:", error instanceof Error ? error.name : "unknown");',
'console.error("[API] /api/download-attachment failed:", error);': 'console.error("[API] /api/download-attachment failed:", error instanceof Error ? error.name : "unknown");',
}
for old, new in replacements.items():
    s = s.replace(old, new)
p.write_text(s)
print('API logs sanitized')
