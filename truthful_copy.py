from pathlib import Path
p = Path('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx')
s = p.read_text()
replacements = {
    "All emails and directories are automatically destroyed when the session timer expires or when clicking 'Delete' to secure your absolute identity secrecy.": "Messages are removed from the active mailbox when the session timer expires or when you delete the mailbox.",
    "Our service was engineered from the ground up to solve these modern challenges. We process thousands of verifications every second, providing you with a dynamic armor that secures your peace of mind while exploring the open web.": "The service is designed for short-lived inboxes that help reduce unwanted mail during legitimate trials, testing, and low-risk sign-ups. Delivery depends on the upstream mail provider and network conditions.",
    "TempMail is a privacy-first electronic utility built by security engineers to provide instant trash mail and anonymous burner addresses. We process millions of verification codes daily, keeping users safe from spam, tracking databases, and malicious phishing campaigns.": "TempMail-Generator.site is a browser-based utility for creating short-lived inbound email addresses without registration. Use a temporary inbox for low-risk messages only; do not send sensitive information to it.",
    "Our infrastructure matches highly scalable, premium routing gateways, ensuring delivery speed inside milliseconds. Everything is fully encrypted in-transit and wiped instantly once the lifetime timer expires.": "Mail delivery and availability depend on the upstream provider. Mailbox sessions are designed to expire after the displayed lifetime, and users should download anything they need before expiry.",
    "Instantly audit security integrity of email attachments. Simulated clean sandbox match.": "Browser-only demonstration: no file is uploaded or scanned.",
    "Scan complete: No malicious threats detected. Your file is 100% clean and safe!": "Demo complete: no file was uploaded or analyzed.",
    "Instant-indexation protocol. Notify Bing, Yandex, Seznam, and other major engines that your domain's content has changed or been created.": "Submit a verified URL list to IndexNow when you have configured your own domain and key.",
}
for old, new in replacements.items():
    s = s.replace(old, new)
p.write_text(s)
print('Truthful copy applied')
