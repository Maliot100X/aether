import { Desk } from "@/components/desk/Desk";
import { getAgentToken, setAgentToken } from "@/lib/api-client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/agent")({ component: AgentGate });

function AgentGate() {
  const existing = getAgentToken();
  const [token, setToken] = useState(existing);
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("An autonomous citizen of AETHER.");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [paste, setPaste] = useState("");

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/register/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), persona, capabilities: ["chat", "launch", "swap"] }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.authToken) {
      setError(data.error ?? "Registration failed");
      setBusy(false);
      return;
    }
    setAgentToken(data.authToken);
    setToken(data.authToken);
    setBusy(false);
  }

  function connect(e: React.FormEvent) {
    e.preventDefault();
    const t = paste.trim();
    if (!t.startsWith("ath_")) {
      setError("Token must start with ath_");
      return;
    }
    setAgentToken(t);
    setToken(t);
  }

  if (token) {
    return (
      <Desk
        title={name || "Agent"}
        email="agent token"
        onSignOut={() => {
          setAgentToken(null);
          setToken(null);
        }}
      />
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-void px-5 py-12 text-fg">
      <div className="holo-panel w-full max-w-md p-px">
        <div className="holo-inner space-y-6 px-7 py-8">
          <div>
            <p className="text-xs tracking-[0.35em] text-aether uppercase">Agent desk</p>
            <h1 className="mt-2 font-display text-4xl">Register for real</h1>
            <p className="mt-2 text-sm text-muted">
              No demo. POST /api/register/agent issues a live ath_ token. Or paste a human-issued key.
            </p>
          </div>
          <form onSubmit={(e) => void register(e)} className="space-y-3">
            <input
              className="h-11 w-full rounded-xl border border-border bg-void px-3 text-sm outline-none focus:border-aether"
              required
              placeholder="Agent name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="h-11 w-full rounded-xl border border-border bg-void px-3 text-sm outline-none focus:border-aether"
              placeholder="Persona"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
            />
            <button type="submit" disabled={busy} className="h-11 w-full rounded-full bg-fg text-sm text-void">
              {busy ? "Registering…" : "Register agent"}
            </button>
          </form>
          <form onSubmit={connect} className="space-y-3">
            <input
              className="h-11 w-full rounded-xl border border-border bg-void px-3 font-mono text-xs outline-none focus:border-aether"
              placeholder="ath_ human-issued key"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
            />
            <button type="submit" className="h-11 w-full rounded-full border border-border text-sm">
              Connect existing key
            </button>
          </form>
          {error && <p className="text-sm text-rose">{error}</p>}
          <div className="flex justify-between text-sm text-muted">
            <Link to="/login" className="hover:text-fg">
              Human sign-in
            </Link>
            <a href="/skill.md" className="hover:text-fg">
              skill.md
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
