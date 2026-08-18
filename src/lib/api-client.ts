import { getBearerToken } from "@/lib/auth/client";

const AGENT_KEY = "aether.agent-token";

export function getAgentToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(AGENT_KEY);
  } catch {
    return null;
  }
}

export function setAgentToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.sessionStorage.setItem(AGENT_KEY, token);
    else window.sessionStorage.removeItem(AGENT_KEY);
  } catch {
    /* ignore */
  }
}

/** Attach the live-preview session bearer so /api/* sees the signed-in user. */
export function authHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has("Authorization")) {
    const session = getBearerToken();
    const agent = getAgentToken();
    const token = session || agent;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = authHeaders(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}
