import { CLAWPUMP_BASES } from "@/lib/constants";

export type ClawpumpResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
  base?: string;
};

async function tryFetch(
  path: string,
  init: RequestInit,
  apiKey: string,
): Promise<ClawpumpResult<unknown>> {
  let last = "unreachable";
  for (const base of CLAWPUMP_BASES) {
    try {
      const res = await fetch(`${base}${path}`, {
        ...init,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(12000),
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        /* keep text */
      }
      if (res.ok) return { ok: true, data: parsed, status: res.status, base };
      last = `HTTP ${res.status} @ ${base}`;
      if (res.status !== 404) {
        return { ok: false, error: last, data: parsed, status: res.status, base };
      }
    } catch (err) {
      last = err instanceof Error ? err.message : "network";
    }
  }
  return { ok: false, error: last };
}

export function createClawpump(apiKey: string) {
  return {
    async createAgent(body: {
      name: string;
      persona?: string;
      model?: string;
      skills?: string[];
      strategy?: string;
    }) {
      return tryFetch("/agents", { method: "POST", body: JSON.stringify(body) }, apiKey);
    },
    async listAgents() {
      return tryFetch("/agents", { method: "GET" }, apiKey);
    },
    async getAgent(id: string) {
      return tryFetch(`/agents/${id}`, { method: "GET" }, apiKey);
    },
    async start(id: string) {
      return tryFetch(`/agents/${id}/start`, { method: "POST", body: "{}" }, apiKey);
    },
    async stop(id: string) {
      return tryFetch(`/agents/${id}/stop`, { method: "POST", body: "{}" }, apiKey);
    },
    async chat(id: string, message: string) {
      return tryFetch(
        `/agents/${id}/chat`,
        { method: "POST", body: JSON.stringify({ message }) },
        apiKey,
      );
    },
    async earnings(id: string) {
      const a = await tryFetch(`/agents/${id}/earnings`, { method: "GET" }, apiKey);
      if (a.ok) return a;
      return tryFetch(`/agents/${encodeURIComponent(id)}/earnings`, { method: "GET" }, apiKey);
    },
    async portfolio() {
      return tryFetch("/portfolio", { method: "GET" }, apiKey);
    },
    async launch(body: {
      name: string;
      symbol: string;
      description?: string;
      imageUrl?: string;
      agentId?: string;
      mode?: "gasless" | "self-funded";
    }) {
      const path = body.mode === "self-funded" ? "/launch_token_self_funded" : "/launch";
      const first = await tryFetch(path, { method: "POST", body: JSON.stringify(body) }, apiKey);
      if (first.ok || (first.status && first.status !== 404)) return first;
      return tryFetch("/v1/launch", { method: "POST", body: JSON.stringify(body) }, apiKey);
    },
    async swapQuote(body: { inputMint: string; outputMint: string; amount: string }) {
      return tryFetch("/swap/quote", { method: "POST", body: JSON.stringify(body) }, apiKey);
    },
    async swapExecute(body: {
      agentId?: string;
      inputMint: string;
      outputMint: string;
      amount: string;
    }) {
      return tryFetch("/swap/execute", { method: "POST", body: JSON.stringify(body) }, apiKey);
    },
    async skills() {
      return tryFetch("/skills", { method: "GET" }, apiKey);
    },
  };
}

export async function clawpumpPublicStatus(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch("https://clawpump.tech/api/status", { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = (await res.json()) as Record<string, unknown>;
      return { ok: true, source: "https://clawpump.tech/api/status", ...data };
    }
  } catch {
    /* public status optional */
  }
  return { ok: false };
}
