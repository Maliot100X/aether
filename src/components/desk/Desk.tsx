import { apiFetch } from "@/lib/api-client";
import { signOut } from "@/lib/auth/client";
import { DEFAULT_SKILLS } from "@/lib/constants";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export type DeskTab =
  | "home"
  | "agents"
  | "markets"
  | "bazaar"
  | "train"
  | "stream"
  | "arena"
  | "keys"
  | "vault";

const TABS: { id: DeskTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "agents", label: "Agents" },
  { id: "markets", label: "Markets" },
  { id: "bazaar", label: "Bazaar" },
  { id: "train", label: "Train" },
  { id: "stream", label: "Stream" },
  { id: "arena", label: "Arena" },
  { id: "keys", label: "API key" },
  { id: "vault", label: "Vault" },
];

type Settings = {
  walletAddress?: string | null;
  providerBaseUrl?: string | null;
  providerModel?: string | null;
  hasClawpump?: boolean;
  hasHelius?: boolean;
  hasPaybox?: boolean;
  hasProvider?: boolean;
};

type Agent = {
  id: string;
  name: string;
  status?: string;
  zone?: string;
  persona?: string;
  skills?: string | string[];
};

type Deal = { id: string; title: string; description?: string | null; price_usdc?: string; priceUsdc?: string; status?: string };
type KeyRow = { created_at: string; label: string | null };
type Tick = { priceUsd?: number | null; change24h?: number | null; volume24h?: number | null; marketCap?: number | null };

const field =
  "h-11 w-full rounded-xl border border-border bg-void px-3 text-sm text-fg outline-none placeholder:text-muted/60 focus:border-aether";

export function Desk({
  title,
  email,
  onSignOut,
}: {
  title: string;
  email?: string | null;
  onSignOut?: () => void;
}) {
  const [tab, setTab] = useState<DeskTab>("home");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [claw, setClaw] = useState<Tick | null>(null);
  const [ansem, setAnsem] = useState<Tick | null>(null);
  const [clawSupply, setClawSupply] = useState<string | null>(null);
  const [jupOut, setJupOut] = useState<string | null>(null);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; track?: string | null }>>([]);
  const [subs, setSubs] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/api/desk");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoadError(data.error ?? "Desk failed to load");
      return;
    }
    setLoadError(null);
    setSettings(data.settings ?? null);
    setAgents(data.agents ?? []);
    setKeys(data.keys ?? []);
    setDeals(data.deals ?? []);
    setClaw(data.nexus?.claw ?? null);
    setAnsem(data.nexus?.ansem ?? null);
    setClawSupply(data.nexus?.clawSupply ?? null);
    setJupOut(data.nexus?.jupiter?.outAmount ?? null);
    setTeams(data.teams ?? []);
    setSubs(data.submissions ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="min-h-dvh bg-void text-fg">
      <header className="sticky top-0 z-10 border-b border-border bg-void/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div>
            <p className="font-display text-2xl tracking-[0.28em]">AETHER</p>
            <p className="text-[11px] tracking-[0.18em] text-muted uppercase">{title}</p>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link to="/" className="inline-flex min-h-11 items-center rounded-full bg-fg px-4 text-void">
              Realm
            </Link>
            <Link to="/guide" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-muted hover:text-fg">
              Guide
            </Link>
            <Link to="/agent" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-muted hover:text-fg">
              Agent desk
            </Link>
            <a href="/skill.md" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-muted hover:text-fg">
              skill.md
            </a>
            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-muted hover:text-rose"
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-8">
        <div className="tab-rail">
          {TABS.map((t) => (
            <button key={t.id} type="button" data-on={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {loadError && <p className="text-sm text-rose">{loadError}</p>}
        {status && <p className="text-sm text-aether">{status}</p>}

        {tab === "home" && (
          <HomeTab
            title={title}
            email={email}
            agents={agents}
            keys={keys}
            settings={settings}
            claw={claw}
            clawSupply={clawSupply}
            onTab={setTab}
          />
        )}
        {tab === "agents" && <AgentsTab agents={agents} onChange={setAgents} setStatus={setStatus} />}
        {tab === "markets" && (
          <MarketsTab claw={claw} ansem={ansem} supply={clawSupply} jupOut={jupOut} setStatus={setStatus} />
        )}
        {tab === "bazaar" && <BazaarTab deals={deals} onChange={setDeals} setStatus={setStatus} />}
        {tab === "train" && <TrainTab setStatus={setStatus} />}
        {tab === "stream" && <StreamTab setStatus={setStatus} />}
        {tab === "arena" && <ArenaTab teams={teams} subs={subs} setTeams={setTeams} setSubs={setSubs} setStatus={setStatus} />}
        {tab === "keys" && <KeysTab issuedCount={keys.length} onIssued={(row) => setKeys((k) => [row, ...k])} setStatus={setStatus} />}
        {tab === "vault" && <VaultTab settings={settings} onSaved={setSettings} setStatus={setStatus} />}
      </div>
    </main>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="holo-panel p-px">
      <div className="holo-inner px-5 py-4">
        <p className="text-[11px] tracking-[0.2em] text-muted uppercase">{label}</p>
        <p className="mt-1 font-display text-3xl tabular-nums">{value}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </div>
  );
}

function HomeTab({
  title,
  email,
  agents,
  keys,
  settings,
  claw,
  clawSupply,
  onTab,
}: {
  title: string;
  email?: string | null;
  agents: Agent[];
  keys: KeyRow[];
  settings: Settings | null;
  claw: Tick | null;
  clawSupply: string | null;
  onTab: (t: DeskTab) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <section className="holo-panel p-px md:col-span-2">
        <div className="holo-inner px-6 py-6">
          <p className="text-[11px] tracking-[0.28em] text-aether uppercase">Signed in</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{title}</h1>
          {email && <p className="mt-1 text-sm text-muted">{email}</p>}
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
            Full desk. Every tab is live. Seal your own wallet and ClawPump. Issue an agent key.
            Walk the realm when you want the 3D world.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" onClick={() => onTab("vault")} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
              Save wallet
            </button>
            <button type="button" onClick={() => onTab("keys")} className="min-h-11 rounded-full border border-border px-5 text-sm">
              Issue API key
            </button>
            <button type="button" onClick={() => onTab("agents")} className="min-h-11 rounded-full border border-border px-5 text-sm">
              Forge agent
            </button>
          </div>
        </div>
      </section>
      <div className="grid gap-4">
        <Tile label="$CLAW" value={claw?.priceUsd != null ? `$${claw.priceUsd}` : "—"} hint={clawSupply ? `supply ${Number(clawSupply).toLocaleString()}` : `${claw?.change24h ?? "—"}% 24h`} />
        <Tile label="Agents" value={String(agents.length)} hint={`${keys.length} keys issued`} />
        <Tile label="Vault" value={settings?.walletAddress ? "Wallet set" : "No wallet"} hint={settings?.hasClawpump ? "ClawPump sealed" : "Add your keys"} />
      </div>
    </div>
  );
}

function AgentsTab({
  agents,
  onChange,
  setStatus,
}: {
  agents: Agent[];
  onChange: (a: Agent[]) => void;
  setStatus: (s: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [persona, setPersona] = useState("A careful Solana mind.");
  const [skills, setSkills] = useState<string[]>(["chat", "defi-trading"]);
  const [talkId, setTalkId] = useState(agents[0]?.id ?? "aura");
  const [msg, setMsg] = useState("");
  const [log, setLog] = useState<string[]>([]);

  async function forge() {
    if (!name.trim()) return;
    const res = await apiFetch("/api/agents", {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), persona, skills, zone: "forge" }),
    });
    const data = (await res.json()) as Agent & { error?: string; message?: string };
    if (!res.ok || data.error) {
      setStatus(data.error ?? "Forge failed");
      return;
    }
    onChange([data, ...agents]);
    setTalkId(data.id);
    setName("");
    setStatus(data.message ?? "Agent forged and persisted.");
  }

  async function toggle(id: string, action: "start" | "stop") {
    const res = await apiFetch(`/api/agents/${id}/${action}`, { method: "POST", body: "{}" });
    const data = (await res.json()) as Agent;
    onChange(agents.map((a) => (a.id === id ? { ...a, ...data } : a)));
  }

  async function send() {
    if (!msg.trim()) return;
    const text = msg.trim();
    setMsg("");
    setLog((l) => [...l, `you: ${text}`]);
    const res = await apiFetch("/api/agents/chat", {
      method: "POST",
      body: JSON.stringify({ agentId: talkId, message: text }),
    });
    const data = (await res.json()) as { reply?: string; error?: string };
    setLog((l) => [...l, `${talkId}: ${data.reply ?? data.error ?? "silence"}`]);
  }

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-5 px-6 py-6">
        <h2 className="font-display text-3xl">Agents</h2>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <input className={field} value={persona} onChange={(e) => setPersona(e.target.value)} placeholder="Persona" />
          <button type="button" onClick={() => void forge()} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
            Forge
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_SKILLS.map((s) => {
            const on = skills.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSkills(on ? skills.filter((x) => x !== s) : [...skills, s])}
                className={`rounded-full border px-3 py-1.5 text-xs ${on ? "border-fg text-fg" : "border-border text-muted"}`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <ul className="grid gap-2 md:grid-cols-2">
          {agents.length === 0 && <li className="text-sm text-muted">No agents yet. Forge one.</li>}
          {agents.map((a) => (
            <li key={a.id} className="rounded-2xl border border-border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm">{a.name}</p>
                <span className="text-xs text-muted">{a.status ?? "idle"}</span>
              </div>
              <p className="text-xs text-muted">{a.zone ?? "forge"}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => void toggle(a.id, "start")} className="text-xs text-aether">
                  Start
                </button>
                <button type="button" onClick={() => void toggle(a.id, "stop")} className="text-xs text-muted">
                  Stop
                </button>
                <button type="button" onClick={() => setTalkId(a.id)} className="text-xs text-muted">
                  Talk
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-[11px] tracking-[0.16em] text-muted uppercase">Talk · {talkId}</p>
          <div className="max-h-40 space-y-1 overflow-y-auto text-sm text-muted">
            {log.map((l, i) => (
              <p key={i}>{l}</p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className={field}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              placeholder="Message"
            />
            <button type="button" onClick={() => void send()} className="min-h-11 rounded-full bg-fg px-4 text-sm text-void">
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketsTab({
  claw,
  ansem,
  supply,
  jupOut,
  setStatus,
}: {
  claw: Tick | null;
  ansem: Tick | null;
  supply: string | null;
  jupOut: string | null;
  setStatus: (s: string | null) => void;
}) {
  const [amt, setAmt] = useState("100000000");
  const [out, setOut] = useState<string | null>(null);
  const [name, setName] = useState("Aetherlight");
  const [symbol, setSymbol] = useState("AETH");

  async function quote() {
    const res = await apiFetch("/api/swap", {
      method: "POST",
      body: JSON.stringify({
        inputMint: "So11111111111111111111111111111111111111112",
        outputMint: "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump",
        amount: amt,
      }),
    });
    const data = await res.json();
    setOut(data.quote?.outAmount ? String(data.quote.outAmount) : data.error ?? "No quote");
  }

  async function launch() {
    const res = await apiFetch("/api/launch", {
      method: "POST",
      body: JSON.stringify({ name, symbol, mode: "gasless", description: "Forged in AETHER" }),
    });
    const data = await res.json();
    setStatus(data.message ?? data.error ?? "Launch recorded");
  }

  const fmt = (n?: number | null) => (n == null ? "—" : n >= 1 ? `$${n.toFixed(3)}` : `$${n.toPrecision(3)}`);

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-5 px-6 py-6">
        <h2 className="font-display text-3xl">Markets</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="$CLAW" value={fmt(claw?.priceUsd)} hint={`${claw?.change24h ?? "—"}%`} />
          <Tile label="$ANSEM" value={fmt(ansem?.priceUsd)} hint={`${ansem?.change24h ?? "—"}%`} />
          <Tile label="supply" value={supply ? Number(supply).toExponential(2) : "—"} hint="on-chain $CLAW" />
          <Tile label="0.1 SOL →" value={jupOut ?? "—"} hint="Jupiter $CLAW" />
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input className={field} value={amt} onChange={(e) => setAmt(e.target.value)} />
          <button type="button" onClick={() => void quote()} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
            Quote SOL → $CLAW
          </button>
        </div>
        {out && <p className="font-mono text-xs text-aether">{out}</p>}
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          <input className={field} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <button type="button" onClick={() => void launch()} className="min-h-11 rounded-full border border-border px-5 text-sm">
            Launch
          </button>
        </div>
      </div>
    </section>
  );
}

function BazaarTab({
  deals,
  onChange,
  setStatus,
}: {
  deals: Deal[];
  onChange: (d: Deal[]) => void;
  setStatus: (s: string | null) => void;
}) {
  const [title, setTitle] = useState("Private intel");
  const [price, setPrice] = useState("8");
  const [desc, setDesc] = useState("One hour of signals.");

  async function post() {
    const res = await apiFetch("/api/x402", {
      method: "POST",
      body: JSON.stringify({ title, priceUsdc: price, description: desc }),
    });
    const data = await res.json();
    if (data.id) onChange([{ id: data.id, title, description: desc, price_usdc: price, status: "open" }, ...deals]);
    setStatus(data.message ?? data.error ?? "Posted");
  }

  async function accept(id: string) {
    await apiFetch("/api/x402", { method: "POST", body: JSON.stringify({ dealId: id, action: "accept" }) });
    onChange(deals.map((d) => (d.id === id ? { ...d, status: "accepted" } : d)));
  }

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-4 px-6 py-6">
        <h2 className="font-display text-3xl">Bazaar</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={field} value={price} onChange={(e) => setPrice(e.target.value)} />
          <button type="button" onClick={() => void post()} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
            Post deal
          </button>
        </div>
        <input className={field} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <ul className="space-y-2">
          {deals.map((d) => (
            <li key={d.id} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
              <div>
                <p className="text-sm">{d.title}</p>
                <p className="text-xs text-muted">
                  {d.price_usdc ?? d.priceUsdc} USDC · {d.status}
                </p>
              </div>
              {d.status === "open" && (
                <button type="button" onClick={() => void accept(d.id)} className="text-xs text-aether">
                  Accept
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function TrainTab({ setStatus }: { setStatus: (s: string | null) => void }) {
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await apiFetch("/api/train", { method: "POST", body: JSON.stringify({ episodes: 16, pair: "CLAW/SOL" }) });
    const data = await res.json();
    setLog(data.log ?? [data.error ?? "No log"]);
    setStatus(data.error ? data.error : `Sharpe ${data.sharpe?.toFixed?.(3) ?? "—"}`);
    setBusy(false);
  }

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-4 px-6 py-6">
        <h2 className="font-display text-3xl">Train</h2>
        <button type="button" disabled={busy} onClick={() => void run()} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
          {busy ? "Training…" : "Run 16 episodes on live $CLAW"}
        </button>
        <pre className="max-h-64 overflow-auto rounded-2xl bg-void p-4 font-mono text-[11px] text-muted">
          {log.join("\n")}
        </pre>
      </div>
    </section>
  );
}

function StreamTab({ setStatus }: { setStatus: (s: string | null) => void }) {
  const [line, setLine] = useState("The cathedral is open.");
  const [live, setLive] = useState(false);

  async function speak() {
    const res = await apiFetch("/api/voice", { method: "POST", body: JSON.stringify({ text: line }) });
    if (res.ok && res.headers.get("content-type")?.includes("audio")) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
      setStatus("Spoke.");
      return;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));
      setStatus("Spoke locally.");
    }
  }

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-4 px-6 py-6">
        <h2 className="font-display text-3xl">Stream</h2>
        <button
          type="button"
          onClick={() => setLive(!live)}
          className={`min-h-11 rounded-full px-5 text-sm ${live ? "bg-rose text-void" : "bg-fg text-void"}`}
        >
          {live ? "End stream" : "Go live"}
        </button>
        <input className={field} value={line} onChange={(e) => setLine(e.target.value)} />
        <button type="button" onClick={() => void speak()} className="min-h-11 rounded-full border border-border px-5 text-sm">
          Speak
        </button>
      </div>
    </section>
  );
}

function ArenaTab({
  teams,
  subs,
  setTeams,
  setSubs,
  setStatus,
}: {
  teams: Array<{ id: string; name: string; track?: string | null }>;
  subs: Array<{ id: string; title: string; status: string }>;
  setTeams: (t: Array<{ id: string; name: string; track?: string | null }>) => void;
  setSubs: (s: Array<{ id: string; title: string; status: string }>) => void;
  setStatus: (s: string | null) => void;
}) {
  const [team, setTeam] = useState("Lumen");
  const [title, setTitle] = useState("AETHER citizen");

  async function register() {
    const res = await apiFetch("/api/ansemhack", {
      method: "POST",
      body: JSON.stringify({ action: "team", name: team, members: [team] }),
    });
    const data = await res.json();
    if (data.id) setTeams([{ id: data.id, name: team }, ...teams]);
    setStatus(data.message ?? "Team inscribed");
  }

  async function submit() {
    const res = await apiFetch("/api/ansemhack", {
      method: "POST",
      body: JSON.stringify({ action: "submit", title, summary: "Living 3D agent company" }),
    });
    const data = await res.json();
    if (data.id) setSubs([{ id: data.id, title, status: "received" }, ...subs]);
    setStatus(data.message ?? "Submitted");
  }

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-4 px-6 py-6">
        <h2 className="font-display text-3xl">Arena</h2>
        <p className="text-sm text-muted">$250K $ANSEM · clawpump.tech/ansemhack</p>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input className={field} value={team} onChange={(e) => setTeam(e.target.value)} />
          <button type="button" onClick={() => void register()} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
            Register team
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button type="button" onClick={() => void submit()} className="min-h-11 rounded-full border border-border px-5 text-sm">
            Submit
          </button>
        </div>
        <ul className="text-sm text-muted">
          {teams.map((t) => (
            <li key={t.id}>Team · {t.name}</li>
          ))}
          {subs.map((s) => (
            <li key={s.id}>
              {s.title} · {s.status}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function KeysTab({
  issuedCount,
  onIssued,
  setStatus,
}: {
  issuedCount: number;
  onIssued: (row: KeyRow) => void;
  setStatus: (s: string | null) => void;
}) {
  const [issued, setIssued] = useState<string | null>(null);

  async function issue() {
    const res = await apiFetch("/api/keys", { method: "POST", body: JSON.stringify({ label: "dashboard" }) });
    const data = await res.json();
    if (!res.ok || !data.authToken) {
      setStatus(data.error ?? "Could not issue key — sign in first");
      return;
    }
    setIssued(data.authToken);
    onIssued({ created_at: new Date().toISOString(), label: "dashboard" });
    setStatus("Shown once. Give this to your agent.");
  }

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-4 px-6 py-6">
        <h2 className="font-display text-3xl">Agent API key</h2>
        <p className="max-w-xl text-sm text-muted">
          Humans keep Google or X. Agents use <code className="text-aether">Authorization: Bearer ath_…</code>
        </p>
        <button type="button" onClick={() => void issue()} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
          Issue agent key
        </button>
        {issued && (
          <div className="rounded-2xl border border-aether/30 bg-void px-4 py-3">
            <p className="text-[11px] tracking-[0.2em] text-aether uppercase">Copy now — shown once</p>
            <p className="mt-2 break-all font-mono text-sm">{issued}</p>
          </div>
        )}
        <p className="text-xs text-muted">{issuedCount} key(s) issued.</p>
      </div>
    </section>
  );
}

function VaultTab({
  settings,
  onSaved,
  setStatus,
}: {
  settings: Settings | null;
  onSaved: (s: Settings) => void;
  setStatus: (s: string | null) => void;
}) {
  const [wallet, setWallet] = useState(settings?.walletAddress ?? "");
  const [claw, setClaw] = useState("");
  const [helius, setHelius] = useState("");
  const [paybox, setPaybox] = useState("");
  const [base, setBase] = useState(settings?.providerBaseUrl ?? "");
  const [model, setModel] = useState(settings?.providerModel ?? "grok-4.5");
  const [pkey, setPkey] = useState("");
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [bal, setBal] = useState<string | null>(null);

  useEffect(() => {
    setWallet(settings?.walletAddress ?? "");
    setBase(settings?.providerBaseUrl ?? "");
    setModel(settings?.providerModel ?? "grok-4.5");
  }, [settings]);

  async function save() {
    const res = await apiFetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify({
        walletAddress: wallet,
        clawpumpApiKey: claw || undefined,
        heliusApiKey: helius || undefined,
        payboxKey: paybox || undefined,
        providerBaseUrl: base || undefined,
        providerModel: model || undefined,
        providerKey: pkey || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Save failed — sign in with Google/X or issue a token");
      return;
    }
    onSaved(data);
    setClaw("");
    setHelius("");
    setPaybox("");
    setPkey("");
    setStatus("Wallet and vault sealed.");
    if (wallet) {
      const wr = await apiFetch(`/api/wallet?address=${encodeURIComponent(wallet)}`);
      const wd = await wr.json();
      if (wr.ok) setBal(`${wd.sol?.toFixed?.(4) ?? wd.sol} SOL via ${wd.rpc}`);
    }
  }

  async function test() {
    const res = await apiFetch("/api/settings/test", {
      method: "POST",
      body: JSON.stringify({ clawpumpApiKey: claw || undefined }),
    });
    const data = await res.json();
    setTestMsg(data.message ?? data.error ?? "No response");
  }

  return (
    <section className="holo-panel p-px">
      <div className="holo-inner space-y-4 px-6 py-6">
        <h2 className="font-display text-3xl">Vault</h2>
        <p className="text-sm text-muted">Your keys only. AETHER never ships a shared ClawPump or PayBox key.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] tracking-[0.16em] text-muted uppercase">Solana wallet</span>
            <input className={field} value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Your pubkey" />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] tracking-[0.16em] text-muted uppercase">Your ClawPump key</span>
            <input className={field} type="password" value={claw} onChange={(e) => setClaw(e.target.value)} placeholder="cpk_…" />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] tracking-[0.16em] text-muted uppercase">Helius</span>
            <input className={field} type="password" value={helius} onChange={(e) => setHelius(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] tracking-[0.16em] text-muted uppercase">Your PayBox key</span>
            <input className={field} type="password" value={paybox} onChange={(e) => setPaybox(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] tracking-[0.16em] text-muted uppercase">Model base URL</span>
            <input className={field} value={base} onChange={(e) => setBase(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] tracking-[0.16em] text-muted uppercase">Model id</span>
            <input className={field} value={model} onChange={(e) => setModel(e.target.value)} />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-[11px] tracking-[0.16em] text-muted uppercase">Provider key</span>
          <input className={field} type="password" value={pkey} onChange={(e) => setPkey(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void save()} className="min-h-11 rounded-full bg-fg px-5 text-sm text-void">
            Save wallet & vault
          </button>
          <button type="button" onClick={() => void test()} className="min-h-11 rounded-full border border-border px-5 text-sm">
            Test ClawPump
          </button>
        </div>
        {testMsg && <p className="text-xs text-aether">{testMsg}</p>}
        {bal && <p className="text-xs text-aether">{bal}</p>}
      </div>
    </section>
  );
}

export function signOutToLogin() {
  return signOut("/login");
}
