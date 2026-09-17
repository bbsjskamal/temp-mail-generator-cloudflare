from pathlib import Path
import re
p = Path('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx')
s = p.read_text()
s = re.sub(r'\n\s*\{\/\* DOWNLOAD CLIENTS \*\/\}[\s\S]*?\n\s*\{\/\* ABOUT US \*\/', '\n\n                {/* ABOUT US */', s, count=1)
s = s.replace('{activeModal === "download" && "Apps & Extensions Client"}', '{activeModal === "cookies" && "Cookie Policy"}')
s = s.replace('  Smartphone, Play, Bot, Zap, Chrome, ChevronDown, ChevronUp,\n', '  ChevronDown, ChevronUp,\n')
p.write_text(s)
print('Removed obsolete download modal')
