import socket
import sys

def test_smtp():
    host = "in.mail.tm"
    port = 25
    print(f"Connecting to {host}:{port}...")
    try:
        s = socket.create_connection((host, port), timeout=5)
        banner = s.recv(1024)
        print("Connected! Banner:", banner)
        s.close()
    except Exception as e:
        print("Failed to connect to SMTP directly:", e)

test_smtp()
