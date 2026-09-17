with open('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx', 'r') as f:
    lines = f.readlines()

# Find the start of unusedLegacyRead and the start of handleContactSubmit
start_idx = None
end_idx = None

for i, line in enumerate(lines):
    if "const unusedLegacyRead = async () => {" in line:
        start_idx = i
    if "  // Submit Contact Us form" in line and start_idx is not None and end_idx is None:
        end_idx = i

if start_idx is not None and end_idx is not None:
    print(f"Removing lines {start_idx} to {end_idx}")
    lines = lines[:start_idx] + ["\n"] + lines[end_idx:]

with open('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx', 'w') as f:
    f.writelines(lines)

print("Cleaned legacy read block successfully")
