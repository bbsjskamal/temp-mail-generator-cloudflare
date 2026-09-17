import urllib.request
import json
import time
import socket

def test_flow():
    # 1. Create a mailbox
    url = "http://localhost:3000/api/mailbox/new"
    data = json.dumps({"login": "livetest"}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    
    mailbox = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                mailbox = json.loads(resp.read().decode())
                break
        except Exception as e:
            print(f"Creation attempt {attempt + 1} waiting due to: {e}")
            time.sleep(2)

    if not mailbox or not mailbox.get("success"):
        print("Failed to create mailbox:", mailbox)
        return

    address = mailbox["address"]
    login, domain = address.split("@")
    print(f"Created temporary mailbox: {address}")

    # 2. Poll messages (should be 0)
    inbox_url = f"http://localhost:3000/api/messages?login={login}&domain={domain}"
    req_inbox = urllib.request.Request(inbox_url)
    with urllib.request.urlopen(req_inbox, timeout=10) as resp:
        initial = json.loads(resp.read().decode())
    print("Initial messages count:", len(initial))

if __name__ == "__main__":
    test_flow()
