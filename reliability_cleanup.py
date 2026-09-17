from pathlib import Path
import re
p = Path('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx')
s = p.read_text()
s = s.replace("  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');\n", "  const [backendStatus, setBackendStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');\n  const [mailboxError, setMailboxError] = useState<string>(\"\");\n")
s = s.replace('  const generateNewMailbox = async (customDomainList?: string[]) => {\n    try {', '  const generateNewMailbox = async (customDomainList?: string[]) => {\n    setMailboxError(\"\");\n    try {')
s = s.replace('    } catch (e) {\n      console.error("Failed to generate mailbox", e);\n      setBackendStatus("unavailable");\n    }\n  };', '    } catch (e) {\n      console.error("Failed to generate mailbox", e);\n      setBackendStatus("unavailable");\n      setMailboxError(e instanceof Error ? e.message : "Mailbox creation is temporarily unavailable. Please try again.");\n    }\n  };', 1)
# Never advertise unrelated providers if the configured provider is unavailable.
s = re.sub(r'    const fallback = \[[\s\S]*?    setDomains\(fallback\);\n    return fallback;', '    const fallback = ["mail.tm"];\n    setDomains(fallback);\n    return fallback;', s, count=1)
# Remove direct third-party Guerrilla Mail fallback block.
s = re.sub(r'        // Check if we should try a direct fetch \(Static Fallback\)[\s\S]*?        \} else \{\n          const res = await fetch\(apiEndpoint\);', '        const res = await fetch(apiEndpoint);', s, count=1)
# Close the now-unconditional fetch block correctly by removing its old matching else close.
s = s.replace('          }\n        }\n        return apiMessages;', '          }\n        return apiMessages;', 1)
# Report final inbox failures without exposing raw network errors.
s = s.replace('    if (apiMessages === null) {\n      if (!isAutoRefresh) setIsRefreshing(false);\n      return;\n    }', '    if (apiMessages === null) {\n      setMailboxError("Inbox temporarily unavailable. Try refresh again in a moment.");\n      if (!isAutoRefresh) setIsRefreshing(false);\n      return;\n    }')
s = s.replace('    } catch (e) {\n      console.error("Failed to fetch messages with Firestore backup", e);\n    } finally {', '    } catch (e) {\n      console.error("Failed to fetch messages", e);\n      setMailboxError("Inbox temporarily unavailable. Try refresh again in a moment.");\n    } finally {')
s = s.replace('          generateNewMailbox();\n          return 600;', '          generateNewMailbox();\n          return 0;')
# Add an accessible error region below the mailbox expiry note.
needle = '              {/* Card Subtitle and Optional Power Actions Underneath */}\n'
error = '''              {mailboxError && (\n                <div role="alert" aria-live="polite" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">\n                  {mailboxError}\n                </div>\n              )}\n\n              {/* Card Subtitle and Optional Power Actions Underneath */}\n'''
if 'role="alert" aria-live="polite"' not in s:
    s = s.replace(needle, error, 1)
p.write_text(s)

# Remove the now-unreferenced demo service from the server source tree only if it is not imported.
# Keep the file harmlessly present for project history; production routes no longer expose it.
print('Reliability cleanup applied')
''
