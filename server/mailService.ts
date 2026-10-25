import crypto from "crypto";

const USER_AGENT = "TempMailGenerator/2.0 (Mozilla/5.0 compatible)";
const API_BASE = "https://api.mail.tm";

export interface MailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  downloadUrl?: string;
}

export interface MailMessageSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  intro?: string;
}

export interface MailMessageDetails {
  id: string;
  from: string;
  subject: string;
  date: string;
  attachments: MailAttachment[];
  body: string;
  textBody: string;
  htmlBody: string;
}

export interface MailSession {
  id: string;
  address: string;
  password: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

const sessionsByAddress = new Map<string, MailSession>();
const addressByAlias = new Map<string, string>();
let cachedDomains: { domains: string[]; expiresAt: number } | null = null;

const configuredCookieSecret = process.env.JWT_SECRET;
let cookieKey = configuredCookieSecret
  ? crypto.createHash("sha256").update(configuredCookieSecret).digest()
  : null;

export function configureCookieSecret(secret?: string): void {
  if (secret) cookieKey = crypto.createHash("sha256").update(secret).digest();
}

function getCookieKey(): Buffer {
  if (!cookieKey) throw new Error("JWT_SECRET must be configured before mailbox sessions are used.");
  return cookieKey;
}

function pruneExpiredSessions(now = Date.now()): void {
  sessionsByAddress.forEach((session, address) => {
    if (session.expiresAt <= now) {
      sessionsByAddress.delete(address);
    }
  });

  addressByAlias.forEach((address, alias) => {
    if (!sessionsByAddress.has(address)) {
      addressByAlias.delete(alias);
    }
  });
}

export function encodeSessionCookie(session: MailSession): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getCookieKey(), iv);
  const payload = JSON.stringify({
    address: session.address,
    password: session.password,
    token: session.token,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  });
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function restoreSessionCookie(value?: string): MailSession | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, "base64url");
    if (raw.length < 29) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", getCookieKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const parsed = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8"));
    const createdAt = Number(parsed.createdAt);
    const expiresAt = Number(parsed.expiresAt);
    if (!parsed.address || !parsed.password || !parsed.token) return null;
    if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) return null;
    if (expiresAt <= Date.now() || expiresAt > createdAt + 60 * 60 * 1000) return null;
    const session: MailSession = {
      id: parsed.address,
      address: normalizeAddress(parsed.address),
      password: String(parsed.password),
      token: String(parsed.token),
      createdAt,
      expiresAt,
    };
    pruneExpiredSessions();
    sessionsByAddress.set(session.address, session);
    return session;
  } catch {
    return null;
  }
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

function normalizeKey(login: string, domain: string): string {
  return `${login.trim().toLowerCase()}@${domain.trim().toLowerCase()}`;
}

export async function getActiveDomains(): Promise<string[]> {
  const now = Date.now();
  if (cachedDomains && cachedDomains.expiresAt > now) {
    return cachedDomains.domains;
  }

  try {
    const res = await fetch(`${API_BASE}/domains`, {
      headers: { "User-Agent": USER_AGENT },
    });

    if (res.ok) {
      const data: any = await res.json();
      const raw = (data["hydra:member"] || [])
        .filter((d: any) => d.isActive !== false)
        .map((d: any) => String(d.domain).toLowerCase());

      const unique = Array.from(new Set<string>(raw));
      if (unique.length > 0) {
        cachedDomains = {
          domains: unique,
          expiresAt: now + 5 * 60 * 1000,
        };
        return unique;
      }
    }
  } catch (error) {
    console.error("[MailService] Failed to fetch active domains:", error);
  }

  return cachedDomains?.domains || ["mail.tm"];
}

async function loginToMailtm(address: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ address, password }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mail.tm token acquisition failed (${res.status}): ${text}`);
  }

  const json: any = await res.json();
  if (!json.token) {
    throw new Error("Mail.tm response lacked token");
  }

  return json.token;
}

async function createAccountWithRetry(address: string, password: string): Promise<Response> {
  let response = await fetch(`${API_BASE}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ address, password }),
  });

  for (let attempt = 0; attempt < 2 && response.status === 429; attempt++) {
    const retryAfter = Number(response.headers.get("retry-after") || 2);
    await new Promise((resolve) => setTimeout(resolve, Math.min(10_000, Math.max(1_000, retryAfter * 1_000))));
    response = await fetch(`${API_BASE}/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ address, password }),
    });
  }

  return response;
}

export async function createMailSession(requestedLogin?: string, requestedDomain?: string): Promise<MailSession> {
  const activeDomains = await getActiveDomains();
  const domain = requestedDomain && activeDomains.includes(requestedDomain.toLowerCase())
    ? requestedDomain.toLowerCase()
    : activeDomains[0] || "mail.tm";

  const cleanPrefix = (requestedLogin || "")
    .toLowerCase()
    .replace(/[^a-z0-9._+-]/g, "")
    // Mail providers can impose shorter local-part limits per domain.
    .slice(0, 12);

  const finalLogin = cleanPrefix && cleanPrefix.length >= 3
    ? cleanPrefix
    : `user${crypto.randomInt(100000, 999999)}`;

  const address = `${finalLogin}@${domain}`;
  const password = `Tmp_${crypto.randomBytes(9).toString("hex")}!9A`;

  // Try creating an account
  const createRes = await createAccountWithRetry(address, password);

  let accountId = "";
  if (createRes.ok) {
    const created: any = await createRes.json();
    accountId = created.id || "";
  } else if (createRes.status === 422) {
    // If username is taken, generate unique address
    const uniqueLogin = `${finalLogin}${crypto.randomInt(100, 999)}`;
    const uniqueAddress = `${uniqueLogin}@${domain}`;
    const uniqueRes = await createAccountWithRetry(uniqueAddress, password);

    if (!uniqueRes.ok) {
      const errText = await uniqueRes.text().catch(() => "");
      throw new Error(`Unable to register account on ${domain}: ${errText}`);
    }

    const uniqueJson: any = await uniqueRes.json();
    accountId = uniqueJson.id || "";
    return storeSession(uniqueAddress, password, accountId);
  } else {
    const errText = await createRes.text().catch(() => "");
    throw new Error(`Account creation rejected (${createRes.status}): ${errText}`);
  }

  return storeSession(address, password, accountId);
}

async function storeSession(address: string, password: string, accountId: string): Promise<MailSession> {
  const token = await loginToMailtm(address, password);
  const now = Date.now();
  const session: MailSession = {
    id: accountId || address,
    address: normalizeAddress(address),
    password,
    token,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000,
  };

  sessionsByAddress.set(session.address, session);
  return session;
}

export async function getOrRefreshSession(login: string, domain: string, ownedSession?: MailSession): Promise<MailSession> {
  pruneExpiredSessions();
  const key = normalizeKey(login, domain);

  if (ownedSession) {
    if (normalizeAddress(ownedSession.address) !== key || ownedSession.expiresAt <= Date.now()) {
      throw new Error("Mailbox session expired or does not match the requested mailbox.");
    }
    sessionsByAddress.set(ownedSession.address, ownedSession);
    return ownedSession;
  }

  const existing = sessionsByAddress.get(key);

  if (existing) {
    return existing;
  }

  // Check alias map
  const mapped = addressByAlias.get(key);
  if (mapped && sessionsByAddress.has(mapped)) {
    return sessionsByAddress.get(mapped)!;
  }

  // Create real session
  const created = await createMailSession(login, domain);
  if (created.address !== key) {
    addressByAlias.set(key, created.address);
  }
  return created;
}

export function extendSessionLifetime(login: string, domain: string, addedMinutes = 10, ownedSession?: MailSession): number {
  pruneExpiredSessions();
  const key = normalizeKey(login, domain);
  if (ownedSession && normalizeAddress(ownedSession.address) !== key) return 0;
  const targetKey = ownedSession?.address || addressByAlias.get(key) || key;
  const session = sessionsByAddress.get(targetKey);
  const now = Date.now();

  if (session) {
    const newExpiry = Math.min(Math.max(session.expiresAt, now) + addedMinutes * 60 * 1000, now + 60 * 60 * 1000);
    session.expiresAt = newExpiry;
    return Math.max(0, Math.floor((newExpiry - now) / 1000));
  }

  return addedMinutes * 60;
}

export async function fetchMessages(login: string, domain: string, ownedSession?: MailSession): Promise<MailMessageSummary[]> {
  const session = await getOrRefreshSession(login, domain, ownedSession);

  const res = await fetch(`${API_BASE}/messages`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (res.status === 401) {
    // Refresh token once
    session.token = await loginToMailtm(session.address, session.password);
    const retryRes = await fetch(`${API_BASE}/messages`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "User-Agent": USER_AGENT,
      },
    });
    if (!retryRes.ok) {
      return [];
    }
    const data: any = await retryRes.json();
    return formatMessageList(data["hydra:member"] || []);
  }

  if (!res.ok) {
    return [];
  }

  const data: any = await res.json();
  return formatMessageList(data["hydra:member"] || []);
}

function formatMessageList(raw: any[]): MailMessageSummary[] {
  return raw.map((item) => {
    const fromName = item.from?.name ? `${item.from.name} ` : "";
    const fromAddr = item.from?.address ? `<${item.from.address}>` : item.from || "Unknown Sender";
    const combinedFrom = `${fromName}${fromAddr}`.trim();

    return {
      id: String(item.id),
      from: combinedFrom,
      subject: item.subject || "(No Subject)",
      date: item.createdAt || new Date().toISOString(),
      intro: item.intro || "",
    };
  });
}

export async function fetchMessageDetails(login: string, domain: string, messageId: string, ownedSession?: MailSession): Promise<MailMessageDetails> {
  const session = await getOrRefreshSession(login, domain, ownedSession);

  let res = await fetch(`${API_BASE}/messages/${messageId}`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (res.status === 401) {
    session.token = await loginToMailtm(session.address, session.password);
    res = await fetch(`${API_BASE}/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "User-Agent": USER_AGENT,
      },
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Failed to load message ${messageId} (${res.status}): ${errText}`);
  }

  const data: any = await res.json();
  const htmlBody = Array.isArray(data.html) ? data.html.join("") : (data.html || "");
  const textBody = Array.isArray(data.text) ? data.text.join("") : (data.text || "");
  const body = htmlBody || textBody || "";

  const fromName = data.from?.name ? `${data.from.name} ` : "";
  const fromAddr = data.from?.address ? `<${data.from.address}>` : data.from || "Unknown";

  const attachments: MailAttachment[] = (data.attachments || []).map((att: any) => ({
    id: String(att.id || ""),
    filename: att.filename || "attachment",
    contentType: att.contentType || "application/octet-stream",
    size: Number(att.size || 0),
    downloadUrl: att.downloadUrl || "",
  }));

  return {
    id: String(data.id),
    from: `${fromName}${fromAddr}`.trim(),
    subject: data.subject || "(No Subject)",
    date: data.createdAt || new Date().toISOString(),
    attachments,
    body,
    textBody,
    htmlBody,
  };
}

export async function fetchAttachmentBuffer(login: string, domain: string, downloadUrl: string, ownedSession?: MailSession): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const session = await getOrRefreshSession(login, domain, ownedSession);
  const url = downloadUrl.startsWith("http") ? downloadUrl : `${API_BASE}${downloadUrl}`;
  const parsedUrl = new URL(url);
  if (parsedUrl.origin !== API_BASE || !parsedUrl.pathname.startsWith("/attachments/")) {
    throw new Error("Invalid attachment URL");
  }

  let res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      "User-Agent": USER_AGENT,
    },
  });

  if (res.status === 401) {
    session.token = await loginToMailtm(session.address, session.password);
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "User-Agent": USER_AGENT,
      },
    });
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch attachment (${res.status})`);
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const contentDisposition = res.headers.get("content-disposition") || 'attachment; filename="attachment"';
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : "attachment";

  const arrayBuffer = await res.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
    filename,
  };
}

export async function deleteMessage(login: string, domain: string, messageId: string, ownedSession?: MailSession): Promise<boolean> {
  const session = await getOrRefreshSession(login, domain, ownedSession);
  const res = await fetch(`${API_BASE}/messages/${messageId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "User-Agent": USER_AGENT,
    },
  });

  return res.ok || res.status === 404;
}
