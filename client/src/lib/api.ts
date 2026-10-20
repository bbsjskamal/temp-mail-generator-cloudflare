const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || "").trim().replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!configuredApiBase) return path;
  return `${configuredApiBase}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const resolved = typeof input === "string" ? apiUrl(input) : input instanceof URL ? apiUrl(input.toString()) : input;
  return globalThis.fetch(resolved, {
    ...init,
    credentials: "include",
  });
}

export const API_BASE_URL = configuredApiBase;
