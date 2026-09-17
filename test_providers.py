import urllib.request, json

def check(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            print(url, "status:", resp.status, "data:", data)
    except Exception as e:
        print(url, "error:", e)

check("https://api.mail.gw/domains")
check("https://api.mail.tm/domains")
