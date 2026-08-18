export type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

export type LlmConfig = {
  baseUrl?: string | null;
  apiKey?: string | null;
  model?: string | null;
};

export type LlmReply = { ok: true; text: string; model: string } | { ok: false; error: string };

function resolveProvider(cfg: LlmConfig): {
  url: string;
  key: string | null;
  model: string;
  label: string;
} | null {
  if (cfg.baseUrl && cfg.apiKey) {
    const base = cfg.baseUrl.replace(/\/$/, "");
    return {
      url: `${base}/chat/completions`,
      key: cfg.apiKey,
      model: cfg.model || "gpt-4o-mini",
      label: "custom",
    };
  }
  const xai = process.env.XAI_API_KEY;
  if (xai) {
    return {
      url: "https://api.x.ai/v1/chat/completions",
      key: xai,
      model: cfg.model || "grok-4.5",
      label: "xai",
    };
  }
  return null;
}

export function llmAvailable(cfg: LlmConfig): boolean {
  return Boolean(resolveProvider(cfg));
}

export async function chatComplete(cfg: LlmConfig, messages: ChatTurn[]): Promise<LlmReply> {
  const provider = resolveProvider(cfg);
  if (!provider || !provider.key) {
    return {
      ok: false,
      error:
        "No language model is connected. AETHER uses the built-in Grok path when available, or paste any OpenAI-compatible base URL + key in Settings.",
    };
  }
  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages,
        max_tokens: 700,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `${provider.label} ${res.status}: ${text.slice(0, 180)}` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return {
      ok: true,
      text: body.choices?.[0]?.message?.content ?? "",
      model: provider.model,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "model request failed" };
  }
}

export async function speakText(text: string): Promise<{ ok: boolean; audio?: ArrayBuffer; error?: string }> {
  const key = process.env.XAI_API_KEY;
  if (!key) return { ok: false, error: "Voice requires the built-in Grok voice path." };
  try {
    const res = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ text: text.slice(0, 800), voice_id: "eve" }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return { ok: false, error: `tts ${res.status}` };
    return { ok: true, audio: await res.arrayBuffer() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "tts failed" };
  }
}
