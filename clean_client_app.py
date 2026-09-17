with open('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx', 'r') as f:
    text = f.read()

# Replace relative imports
text = text.replace('from "./types"', 'from "../types"')
text = text.replace('from "./data"', 'from "../data"')
text = text.replace('from "./translations"', 'from "../translations"')

# Replace handleReadMessage implementation
read_func_target = """  // Read message details
  const handleReadMessage = async (msgId: string | number) => {
    if (!username || !activeDomain || !emailAddress) return;
    setIsLoadingContent(true);


    try {"""

new_read_func = """  // Read message details
  const handleReadMessage = async (msgId: string | number) => {
    if (!username || !activeDomain || !emailAddress) return;
    setIsLoadingContent(true);

    try {
      const res = await fetch(`/api/message?login=${encodeURIComponent(username)}&domain=${encodeURIComponent(activeDomain)}&id=${encodeURIComponent(String(msgId))}`);
      if (res.ok) {
        const details = await res.json();
        setSelectedMessage(details);
      } else {
        console.warn("Message could not be retrieved or has expired");
      }
    } catch (e) {
      console.error("Failed to read message details", e);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const unusedLegacyRead = async () => {"""

text = text.replace(read_func_target, new_read_func)

# Replace the closing of the old read function before handleContactSubmit
old_before_contact = """  // Submit Contact Us form
  const handleContactSubmit = async (e: React.FormEvent) => {"""

text = text.replace(old_before_contact, """  };

  // Submit Contact Us form
  const handleContactSubmit = async (e: React.FormEvent) => {""")

# Update policy mentions of Firestore to Memory & Zero-Log policy
text = text.replace(
    '<li><span className="font-bold text-gray-800 dark:text-white">Firestore Synchronization:</span> To secure temporary access for active users, email payloads received during an active session may be synchronized to temporary cloud persistence. These remain private and are subject to automated cleanup policies.</li>',
    '<li><span className="font-bold text-gray-800 dark:text-white">In-Memory Lifecycle:</span> All messages and temporary sessions are handled strictly in-memory during active sessions. Upon timer expiration or deletion, all addresses and incoming payloads are permanently erased without persistent storage.</li>'
)

with open('/home/ubuntu/temp-mail-generator-site/client/src/pages/TempMailApp.tsx', 'w') as f:
    f.write(text)

print("Updated TempMailApp.tsx clean implementation")
