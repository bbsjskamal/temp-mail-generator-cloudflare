from pathlib import Path
import re
p = Path('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx')
s = p.read_text()
# Remove the complete fake apps/extensions marketing section.
s = re.sub(r'\n\s*\{\/\* 5\. APPS AND EXTENSIONS GRID[\s\S]*?\n\s*\{\/\* 6\.', '\n\n        {/* 6.', s, count=1)
# The earlier regex leaves a malformed comment from the PWA removal.
s = s.replace('{/* Social links */ */}', '{/* Social links */}')
p.write_text(s)
print('Removed fake extensions/apps section and fixed JSX comment')
