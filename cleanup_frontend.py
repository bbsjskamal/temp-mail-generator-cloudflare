from pathlib import Path
import re

app_path = Path('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx')
text = app_path.read_text()

# Add a readable timer formatter once, next to date parsing helpers.
needle = '  // Theme State (Premium Light Theme with white background is standard)\n'
insert = '''  const formatCountdown = (seconds: number) => {\n    const safe = Math.max(0, Math.floor(seconds));\n    const minutes = Math.floor(safe / 60).toString().padStart(2, "0");\n    const remainingSeconds = (safe % 60).toString().padStart(2, "0");\n    return `${minutes}:${remainingSeconds}`;\n  };\n\n'''
if insert not in text:
    text = text.replace(needle, insert + needle)

# Remove the live-sync badge entirely.
text = re.sub(r'\n\s*\{\/\* Live Syncing Badge moved below the message box card \*\/\}[\s\S]*?\n\s*<\/AnimatePresence>\n\n\s*\{\/\* 3\. INTERACTIVE MESSAGES', '\n\n        {/* 3. INTERACTIVE MESSAGES', text, count=1)

# Add the actual 10-minute countdown to the mailbox card.
timer_needle = '''              {/* Card Subtitle and Optional Power Actions Underneath */}\n              <div className="flex flex-col sm:flex-row items-center justify-between pt-1 text-xs gap-3">'''
timer_block = '''              {/* Per-mailbox expiration countdown */}\n              <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/25 px-4 py-3">\n                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">\n                  <Clock className="w-4 h-4" />\n                  <span className="text-xs font-bold uppercase tracking-wider">Mailbox expires in</span>\n                </div>\n                <span className={`font-mono text-xl font-black tracking-widest ${timeLeft <= 60 ? "text-red-500" : "text-emerald-700 dark:text-emerald-300"}`}>\n                  {formatCountdown(timeLeft)}\n                </span>\n              </div>\n\n              {/* Card Subtitle and Optional Power Actions Underneath */}\n              <div className="flex flex-col sm:flex-row items-center justify-between pt-1 text-xs gap-3">'''
if 'Mailbox expires in' not in text:
    text = text.replace(timer_needle, timer_block)

# Remove extension/PWA references from the security tools and footer.
text = text.replace('              { name: "PWA Mobile App", icon: Smartphone, label: "Add to Home", color: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/15" },\n', '')
text = text.replace('                        { title: "PWA Mobile App", desc: "Simply install directly from your mobile browser settings for standalone full-screen access.", icon: Smartphone },\n', '')
text = re.sub(r'\n\s*\{\/\* PWA \/ Mobile Web Optimized Info Badge \*\/\}[\s\S]*?\n\s*<\/div>\n\n\s*\{\/\* Dummy Social Media Icons', '\n\n            {/* Social links */', text, count=1)
text = re.sub(r'\n\s*<div>\n\s*<h4 className="text-white uppercase tracking-wider font-mono text-\[10px\] font-bold mb-3\.5">Apps & Extensions<\/h4>[\s\S]*?\n\s*<\/div>\n\s*<div>\n\s*<h4 className="text-white uppercase', '\n            <div>\n              <h4 className="text-white uppercase', text, count=1)
text = text.replace('                <li><button onClick={() => setActiveModal("download")} className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Telegram Bot</button></li>\n', '')

# Add a cookie-policy link beside privacy and terms.
footer_terms = '<li><button onClick={() => setActiveModal("terms")} className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Terms of Service</button></li>'
if 'setActiveModal("cookies")' not in text:
    text = text.replace(footer_terms, footer_terms + '\n                <li><button onClick={() => setActiveModal("cookies")} className="hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Cookie Policy</button></li>')

# Add a concise, honest cookie policy modal before the QR modal.
qr_marker = '                {/* QR CODE DISPLAY */}'
cookie_modal = '''                {/* COOKIE POLICY */}\n                {activeModal === "cookies" && (\n                  <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-3 text-[11px] sm:text-xs text-left font-medium text-gray-600 dark:text-gray-300 scrollbar-thin">\n                    <div className="border-b border-gray-100 dark:border-gray-800 pb-3">\n                      <p className="text-[10px] text-gray-400 font-mono">Last updated: September 17, 2026</p>\n                      <p className="mt-2">Temp-Mail-Generator.site uses a small number of cookies and browser storage items to keep the site functional. We do not use cookies to read the contents of your inbox.</p>\n                    </div>\n                    <div className="space-y-2">\n                      <h5 className="font-extrabold text-gray-900 dark:text-white uppercase tracking-wider text-xs">Essential storage</h5>\n                      <p>We use a local browser preference to remember your language, theme, saved messages, and cookie-consent choice. The mailbox session itself is handled by a secure, HttpOnly server cookie and expires with the temporary mailbox.</p>\n                    </div>\n                    <div className="space-y-2">\n                      <h5 className="font-extrabold text-gray-900 dark:text-white uppercase tracking-wider text-xs">Analytics and advertising</h5>\n                      <p>If analytics or advertising is enabled in a future deployment, those providers may set their own cookies only under their published policies and applicable consent requirements. The current application does not require advertising cookies to generate or receive email.</p>\n                    </div>\n                    <div className="space-y-2">\n                      <h5 className="font-extrabold text-gray-900 dark:text-white uppercase tracking-wider text-xs">Your choices</h5>\n                      <p>You can clear browser storage or block cookies in your browser settings. Blocking essential storage may prevent the site from remembering preferences or maintaining the active mailbox session.</p>\n                    </div>\n                  </div>\n                )}\n\n'''
if 'COOKIE POLICY' not in text:
    text = text.replace(qr_marker, cookie_modal + qr_marker)

# Replace unsupported/overclaiming privacy language with accurate service-specific language.
text = text.replace('Since we do not collect, store, or sell any personal data of any users, we are fully CCPA compliant.', 'We do not sell personal information. Temporary mailbox content is processed to deliver the requested service and is automatically removed when the mailbox expires, subject to provider and operational limits.')
text = text.replace('all received emails entirely in-memory and perform automated wipes on expiration, no permanent personal records are maintained on our systems.', 'mail content is retained only for the short active-mailbox period needed to display it; users should not send sensitive personal, financial, medical, or confidential information to a disposable address.')

app_path.write_text(text)

# Replace metadata with stronger search/social metadata and structured data.
html_path = Path('/home/ubuntu/temp-mail-generator-site/client/index.html')
html = html_path.read_text()
html = html.replace('<meta name="robots" content="index, follow" />', '<meta name="robots" content="index, follow, max-image-preview:large" />\n    <meta name="author" content="Temp-Mail-Generator.site" />\n    <meta name="theme-color" content="#00b074" />\n    <meta property="og:type" content="website" />\n    <meta property="og:site_name" content="Temp-Mail-Generator.site" />\n    <meta property="og:title" content="Free 10-Minute Temporary Email Generator" />\n    <meta property="og:description" content="Create a disposable email address instantly and receive verification messages without registration." />\n    <meta property="og:url" content="https://temp-mail-generator.site/" />\n    <meta name="twitter:card" content="summary" />\n    <meta name="twitter:title" content="Free Temporary Email Generator" />\n    <meta name="twitter:description" content="A simple 10-minute disposable inbox for trials, testing, and spam protection." />')
jsonld = '''\n    <script type="application/ld+json">\n      {\n        "@context": "https://schema.org",\n        "@type": "WebApplication",\n        "name": "Temp-Mail-Generator.site",\n        "url": "https://temp-mail-generator.site/",\n        "applicationCategory": "UtilitiesApplication",\n        "operatingSystem": "Any",\n        "description": "Free temporary email generator with a short-lived inbox for legitimate trials, testing, and spam protection",\n        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }\n      }\n    </script>\n'''
html = html.replace('  </head>', jsonld + '  </head>')
html_path.write_text(html)

print('Frontend cleanup complete')
''
