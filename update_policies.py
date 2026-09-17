from pathlib import Path
p = Path('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx')
s = p.read_text()
s = s.replace('Last updated: July 2, 2026', 'Last updated: September 17, 2026')
needle = '                      <p>You are specifically restricted from all of the following:</p>'
addition = '''                      <p>You are specifically restricted from all of the following:</p>\n                      <p className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-3 py-2 text-red-700 dark:text-red-300">Do not use temporary addresses for fraud, impersonation, phishing, banking or financial-account abuse, evading identity or age checks, harassment, malware distribution, or any activity that violates law or another service's rules.</p>'''
if 'banking or financial-account abuse' not in s:
    s = s.replace(needle, addition, 1)
p.write_text(s)
print('Policies updated')
