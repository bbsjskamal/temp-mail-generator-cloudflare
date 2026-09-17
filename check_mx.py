import socket
import urllib.request
import json

# Use Cloudflare DNS-over-HTTPS to check MX
req = urllib.request.Request("https://cloudflare-dns.com/dns-query?name=uberip.com&type=MX", headers={"Accept": "application/dns-json"})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
print("DNS MX for uberip.com:", data.get("Answer"))
