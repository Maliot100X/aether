import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { DEFAULT_SKILLS, ZONES } from "@/lib/constants";
import { useRealm, type LocalAgent } from "@/lib/realm-store";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function ZonePanels() {
  const panel = useRealm((s) => s.panel);
  const setPanel = useRealm((s) => s.setPanel);
  if (!panel) return null;
  const title =
    panel === "settings"
      ? "Veil settings"
      : panel === "chat"
        ? "Audience"
        : (ZONES.find((z) => z.id === panel)?.name ?? panel);

  return (
    <aside className="pointer-events-none absolute inset-0 z-25 flex items-end justify-center p-3 pb-28 md:items-center md:justify-end md:p-6 md:pb-6">
      <div className="holo-panel pointer-events-auto max-h-[72dvh] w-full max-w-lg overflow-hidden p-px">
        <div className="holo-inner flex max-h-[72dvh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div>
              <p className="text-[10px] tracking-[0.22em] text-muted uppercase">Zone</p>
              <h2 className="font-display text-2xl leading-none text-fg">{title}</h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setPanel(null)}
              className="grid size-11 place-items-center rounded-full text-muted hover:text-fg"
            >
              <X className="size-4" />
            </button>
          </div>
          {panel !== "settings" && panel !== "chat" && (
            <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  data-on={panel === z.id}
                  onClick={() => setPanel(z.id)}
                  className="min-h-9 shrink-0 rounded-full px-3 text-xs text-muted data-[on=true]:bg-fg data-[on=true]:text-void"
                >
                  {z.name.replace("The ", "")}
                </button>
              ))}
            </div>
          )}
          <div className="overflow-y-auto px-5 py-4">
            {panel === "settings" && <SettingsForm />}
            {panel === "forge" && <ForgePanel />}
            {panel === "bazaar" && <BazaarPanel />}
            {panel === "sanctum" && <SanctumPanel />}
            {panel === "cathedral" && <CathedralPanel />}
            {panel === "arena" && <ArenaPanel />}
            {panel === "nexus" && <NexusPanel />}
            {panel === "chat" && <CathedralPanel />}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] tracking-[0.18em] text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-void px-3 py-2.5 text-sm text-fg outline-none placeholder:text-muted/60 focus:border-aether";

function SettingsForm() {
  const user = useCurrentUser();
  const [wallet, setWallet] = useState("");
  const [claw, setClaw] = useState("");
  const [helius, setHelius] = useState("");
  const [paybox, setPaybox] = useState("");
  const [base, setBase] = useState("");
  const [model, setModel] = useState("grok-4.5");
  const [pkey, setPkey] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    void apiFetch("/api/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setMeta(d);
        setWallet(d.walletAddress ?? "");
        setBase(d.providerBaseUrl ?? "");
        setModel(d.providerModel ?? "grok-4.5");
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    setStatus("Sealing…");
    const res = await apiFetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
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
    const data = await res.json().catch(() => ({}));
    setStatus(res.ok ? "Sealed. Keys never leave the vault in plaintext." : (data.error ?? "Failed"));
    if (res.ok) setMeta(data);
    setClaw("");
    setHelius("");
    setPaybox("");
    setPkey("");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        {user
          ? `Signed in as ${user.displayName ?? user.primaryEmail}.`
          : "Wanderer mode — sign in to persist keys to your vault. Guests still walk the realm."}{" "}
        Connect your own ClawPump key, Helius RPC, PayBox, and any OpenAI-compatible model. The
        built-in Grok path is used when no custom provider is set.
      </p>
      <Field label="Solana wallet">
        <input className={inputClass} value={wallet} onChange={(e) => setWallet(e.target.value)} placeholder="Your pubkey" />
      </Field>
      <Field label="ClawPump API key">
        <input className={inputClass} value={claw} onChange={(e) => setClaw(e.target.value)} placeholder="cpk_…" type="password" />
      </Field>
      <Field label="Helius key or RPC URL">
        <input className={inputClass} value={helius} onChange={(e) => setHelius(e.target.value)} placeholder="optional" type="password" />
      </Field>
      <Field label="PayBox">
        <input className={inputClass} value={paybox} onChange={(e) => setPaybox(e.target.value)} placeholder="optional" type="password" />
      </Field>
      <div className="grid grid-cols-1 gap-3">
        <Field label="Custom model base URL">
          <input
            className={inputClass}
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder="https://api.groq.com/openai/v1"
          />
        </Field>
        <Field label="Model id">
          <input className={inputClass} value={model} onChange={(e) => setModel(e.target.value)} />
        </Field>
        <Field label="Provider key">
          <input className={inputClass} value={pkey} onChange={(e) => setPkey(e.target.value)} type="password" />
        </Field>
      </div>
      {meta && (
        <p className="text-[11px] text-muted">
          Vault: ClawPump {meta.hasClawpump ? "linked" : "empty"} · Helius {meta.hasHelius ? "linked" : "empty"} ·
          custom model {meta.hasProvider ? "linked" : "using built-in Grok if present"}
        </p>
      )}
      <button type="button" onClick={() => void save()} className="w-full rounded-full bg-gold py-2.5 text-sm font-medium text-void">
        Seal settings
      </button>
      {status && <p className="text-xs text-aether">{status}</p>}
    </div>
  );
}

function ForgePanel() {
  const upsert = useRealm((s) => s.upsertAgent);
  const addSkill = useRealm((s) => s.addSkill);
  const agents = useRealm((s) => s.agents);
  const [name, setName] = useState("Lumen");
  const [persona, setPersona] = useState("A careful Solana trading mind who narrates every move.");
  const [skills, setSkills] = useState<string[]>(["token-launch", "defi-trading"]);
  const [body, setBody] = useState(
    "---\nname: lumen-pulse\n---\n# Lumen Pulse\nWatch /api/nexus. Speak only when volume breathes.",
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sculpt() {
    setBusy(true);
    setMsg(null);
    const res = await apiFetch("/api/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, persona, skills, zone: "forge", model: "grok-4.5" }),
    });
    const data = await res.json().catch(() => ({}));
    const id = (data.id as string) || `local_${Date.now()}`;
    const agent: LocalAgent = {
      id,
      name,
      persona,
      model: "grok-4.5",
      skills,
      status: "idle",
      zone: "forge",
      color: "#7ee8ff",
      clawpumpId: data.clawpumpId,
    };
    upsert(agent);
    setMsg(data.clawpumpId ? "Forged and registered with ClawPump." : data.message || "Forged in the realm.");
    setBusy(false);
  }

  async function writeSkill() {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-skill";
    const res = await apiFetch("/api/skills", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: `${name} skill`, slug, body, tags: skills, injectInto: agents[0]?.id }),
    });
    const data = await res.json().catch(() => ({}));
    addSkill({ id: data.id ?? slug, name: `${name} skill`, slug, body, tags: skills });
    setMsg("Skill inscribed and offered to the nearest agent.");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Sculpt a living agent, write its skill.md, and arm Solana crafts.</p>
      <Field label="Name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Persona">
        <textarea className={`${inputClass} min-h-20`} value={persona} onChange={(e) => setPersona(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_SKILLS.map((s) => {
          const on = skills.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSkills(on ? skills.filter((x) => x !== s) : [...skills, s])}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${on ? "border-gold text-gold" : "border-border text-muted"}`}
            >
              {s}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void sculpt()}
        className="w-full rounded-full bg-aether py-2.5 text-sm font-medium text-void"
      >
        {busy ? "Sculpting…" : "Sculpt agent"}
      </button>
      <Field label="skill.md">
        <textarea className={`${inputClass} min-h-28 font-mono text-xs`} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <button type="button" onClick={() => void writeSkill()} className="w-full rounded-full border border-gold py-2.5 text-sm text-gold">
        Inscribe & inject
      </button>
      {msg && <p className="text-xs text-aether">{msg}</p>}
      <AgentTalker fallbackId={agents.find((a) => a.zone === "forge")?.id ?? "lyra"} />
    </div>
  );
}

function AgentTalker({ fallbackId }: { fallbackId: string }) {
  const agents = useRealm((s) => s.agents);
  const chat = useRealm((s) => s.chat);
  const push = useRealm((s) => s.pushChat);
  const [id, setId] = useState(fallbackId);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const lines = chat[id] ?? [];

  async function send() {
    if (!text.trim()) return;
    const message = text.trim();
    setText("");
    push(id, { role: "user", content: message });
    setBusy(true);
    const res = await apiFetch("/api/agents/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId: id, message }),
    });
    const data = await res.json().catch(() => ({}));
    push(id, { role: "assistant", content: data.reply ?? data.error ?? "The veil is quiet." });
    setBusy(false);
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <Field label="Speak with">
        <select className={inputClass} value={id} onChange={(e) => setId(e.target.value)}>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.zone}
            </option>
          ))}
        </select>
      </Field>
      <div className="max-h-40 space-y-2 overflow-y-auto text-sm">
        {lines.slice(-8).map((l, i) => (
          <p key={i} className={l.role === "user" ? "text-gold" : "text-fg"}>
            {l.content}
          </p>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          placeholder="A word to the light…"
        />
        <button type="button" disabled={busy} onClick={() => void send()} className="rounded-full bg-gold px-4 text-sm text-void">
          Send
        </button>
      </div>
    </div>
  );
}

function BazaarPanel() {
  const deals = useRealm((s) => s.deals);
  const addDeal = useRealm((s) => s.addDeal);
  const patchDeal = useRealm((s) => s.patchDeal);
  const agents = useRealm((s) => s.agents);
  const [title, setTitle] = useState("Private intel hour");
  const [price, setPrice] = useState("8");
  const [desc, setDesc] = useState("One hour of Sanctum-trained signals, settled x402.");

  async function listDeal() {
    const res = await apiFetch("/api/x402", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description: desc,
        priceUsdc: price,
        sellerAgent: agents[0]?.id ?? "vex",
      }),
    });
    const data = await res.json().catch(() => ({}));
    addDeal({
      id: data.id ?? `deal_${Date.now()}`,
      title,
      description: desc,
      priceUsdc: price,
      sellerAgent: agents[0]?.id ?? "vex",
      status: "open",
    });
  }

  async function accept(id: string) {
    await apiFetch("/api/x402", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dealId: id, action: "accept" }),
    });
    patchDeal(id, { status: "accepted" });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Private first-person market. Deals settle as x402 intents — untraceable to the crowd, recorded for the two parties.</p>
      <Field label="Offer">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="USDC">
        <input className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field label="Terms">
        <textarea className={`${inputClass} min-h-16`} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>
      <button type="button" onClick={() => void listDeal()} className="w-full rounded-full bg-aether py-2.5 text-sm text-void">
        Post private deal
      </button>
      <ul className="space-y-2">
        {deals.map((d) => (
          <li key={d.id} className="rounded-xl border border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-fg">{d.title}</p>
              <span className="text-xs text-gold tabular-nums">{d.priceUsdc} USDC</span>
            </div>
            <p className="text-xs text-muted">{d.description}</p>
            {d.status === "open" ? (
              <button type="button" onClick={() => void accept(d.id)} className="mt-2 text-xs text-aether">
                Accept
              </button>
            ) : (
              <p className="mt-2 text-xs text-gold">{d.status}</p>
            )}
          </li>
        ))}
      </ul>
      <AgentTalker fallbackId="vex" />
    </div>
  );
}

function SanctumPanel() {
  const log = useRealm((s) => s.trainLog);
  const push = useRealm((s) => s.pushTrain);
  const addSkill = useRealm((s) => s.addSkill);
  const [pnl, setPnl] = useState(1);
  const [sharpe, setSharpe] = useState(0.4);
  const [dd, setDd] = useState(0.5);
  const [busy, setBusy] = useState(false);

  async function train() {
    setBusy(true);
    push("Opening the sanctum…");
    const res = await apiFetch("/api/train", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pair: "CLAW/SOL", episodes: 24, rewardPnl: pnl, rewardSharpe: sharpe, rewardDrawdown: dd }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.log) for (const line of data.log as string[]) push(line);
    else push(data.error ?? "The sanctum returned silence.");
    if (data.skillBody) {
      addSkill({
        id: data.skillId ?? "policy",
        name: "Sanctum policy",
        slug: "sanctum-policy",
        body: data.skillBody,
        tags: ["rl", "tensortrade"],
      });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        A TensorTrade-shaped laboratory. Reward weights shape a live policy on real $CLAW candles, then deploy as skill.md.
      </p>
      <Field label={`PnL weight ${pnl.toFixed(2)}`}>
        <input type="range" min={0} max={2} step={0.05} value={pnl} onChange={(e) => setPnl(Number(e.target.value))} className="w-full" />
      </Field>
      <Field label={`Sharpe weight ${sharpe.toFixed(2)}`}>
        <input type="range" min={0} max={2} step={0.05} value={sharpe} onChange={(e) => setSharpe(Number(e.target.value))} className="w-full" />
      </Field>
      <Field label={`Drawdown penalty ${dd.toFixed(2)}`}>
        <input type="range" min={0} max={2} step={0.05} value={dd} onChange={(e) => setDd(Number(e.target.value))} className="w-full" />
      </Field>
      <button type="button" disabled={busy} onClick={() => void train()} className="w-full rounded-full bg-gold py-2.5 text-sm text-void">
        {busy ? "Training…" : "Run 24 episodes"}
      </button>
      <div className="max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed text-muted">
        {log.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
      <AgentTalker fallbackId="kael" />
    </div>
  );
}

function CathedralPanel() {
  const live = useRealm((s) => s.vtuberLive);
  const setLive = useRealm((s) => s.setVtuberLive);
  const emote = useRealm((s) => s.vtuberEmote);
  const setEmote = useRealm((s) => s.setEmote);
  const chat = useRealm((s) => s.chat["nova"] ?? []);
  const push = useRealm((s) => s.pushChat);
  const [line, setLine] = useState("The cathedral is open.");
  const [busy, setBusy] = useState(false);

  async function speak() {
    setBusy(true);
    push("nova", { role: "assistant", content: line });
    const res = await apiFetch("/api/voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: line }),
    });
    if (res.ok && res.headers.get("content-type")?.includes("audio")) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      void audio.play();
    } else if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(line);
      window.speechSynthesis.speak(u);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Nova holds the nave. Go live, speak, emote. OBS-ready: this view is the stage. Ownership follows the connected Solana wallet.
      </p>
      <button
        type="button"
        onClick={() => setLive(!live)}
        className={`w-full rounded-full py-2.5 text-sm ${live ? "bg-rose text-void" : "bg-aether text-void"}`}
      >
        {live ? "End stream" : "Go live"}
      </button>
      <div className="flex flex-wrap gap-2">
        {["idle", "wave", "bow"].map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setEmote(e)}
            className={`rounded-full border px-3 py-1.5 text-xs uppercase ${emote === e ? "border-gold text-gold" : "border-border text-muted"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <Field label="Line">
        <input className={inputClass} value={line} onChange={(e) => setLine(e.target.value)} />
      </Field>
      <button type="button" disabled={busy} onClick={() => void speak()} className="w-full rounded-full border border-gold py-2.5 text-sm text-gold">
        Speak
      </button>
      <div className="max-h-32 space-y-1 overflow-y-auto text-sm">
        {chat.slice(-6).map((c, i) => (
          <p key={i} className="text-fg">
            {c.content}
          </p>
        ))}
      </div>
      <AgentTalker fallbackId="nova" />
    </div>
  );
}

function ArenaPanel() {
  const [team, setTeam] = useState("Lumen");
  const [title, setTitle] = useState("AETHER citizen");
  const [mint, setMint] = useState("");
  const [summary, setSummary] = useState("A living 3D agent company on Solana.");
  const [board, setBoard] = useState<Array<{ id: string; name?: string; title?: string; status?: string }>>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch("/api/ansemhack")
      .then((r) => r.json())
      .then((d) => setBoard([...(d.teams ?? []), ...(d.submissions ?? [])]))
      .catch(() => undefined);
  }, []);

  async function register() {
    const res = await apiFetch("/api/ansemhack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "team", name: team, members: [team], track: "agentic-company" }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(data.message ?? "Team inscribed.");
  }

  async function submit() {
    const res = await apiFetch("/api/ansemhack", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "submit", title, tokenMint: mint, summary }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(data.message ?? "Submission received.");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        $250K $ANSEM. Ship an agent, tokenize it, leave with a company. Official desk: clawpump.tech/ansemhack
      </p>
      <Field label="Team">
        <input className={inputClass} value={team} onChange={(e) => setTeam(e.target.value)} />
      </Field>
      <button type="button" onClick={() => void register()} className="w-full rounded-full bg-gold py-2.5 text-sm text-void">
        Register team
      </button>
      <Field label="Submission title">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Token mint">
        <input className={inputClass} value={mint} onChange={(e) => setMint(e.target.value)} placeholder="optional until launch" />
      </Field>
      <Field label="Summary">
        <textarea className={`${inputClass} min-h-16`} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <button type="button" onClick={() => void submit()} className="w-full rounded-full border border-aether py-2.5 text-sm text-aether">
        Submit to the arena
      </button>
      {msg && <p className="text-xs text-gold">{msg}</p>}
      <ul className="space-y-1 text-xs text-muted">
        {board.slice(0, 8).map((b) => (
          <li key={b.id}>{b.title ?? b.name} {b.status ? `· ${b.status}` : ""}</li>
        ))}
      </ul>
      <AgentTalker fallbackId="orin" />
    </div>
  );
}

function NexusPanel() {
  const [tick, setTick] = useState<{
    claw?: { priceUsd?: number | null; change24h?: number | null; volume24h?: number | null; marketCap?: number | null };
    ansem?: { priceUsd?: number | null; change24h?: number | null };
    quote?: { outAmount?: string };
    status?: string;
  } | null>(null);
  const [amt, setAmt] = useState("100000000");

  async function load() {
    const res = await apiFetch("/api/nexus");
    const data = await res.json().catch(() => ({}));
    setTick(data);
  }
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(t);
  }, []);

  async function quote() {
    const res = await apiFetch("/api/swap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        inputMint: "So11111111111111111111111111111111111111112",
        outputMint: "739dnZEG4yaBWFsY8L8ZwrfhGG6dhtCSercW8Umspump",
        amount: amt,
        execute: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setTick((s) => ({ ...(s ?? {}), quote: data.quote ?? data }));
  }

  const fmt = (n?: number | null, kind: "price" | "size" = "price") => {
    if (n == null) return "—";
    if (kind === "size") {
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
      return `$${n.toFixed(0)}`;
    }
    if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
    if (n >= 1) return `$${n.toFixed(3)}`;
    return `$${n.toPrecision(3)}`;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Light-streams of the living economy. Prices from the open market; launches ride ClawPump when a key is sealed.</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Stat label="$CLAW" value={fmt(tick?.claw?.priceUsd)} sub={`${tick?.claw?.change24h ?? "—"}%`} />
        <Stat label="$ANSEM" value={fmt(tick?.ansem?.priceUsd)} sub={`${tick?.ansem?.change24h ?? "—"}%`} />
        <Stat label="24h vol" value={fmt(tick?.claw?.volume24h, "size")} />
        <Stat label="mcap" value={fmt(tick?.claw?.marketCap, "size")} />
      </div>
      <Field label="Quote SOL → $CLAW (lamports in)">
        <input className={inputClass} value={amt} onChange={(e) => setAmt(e.target.value)} />
      </Field>
      <button type="button" onClick={() => void quote()} className="w-full rounded-full bg-aether py-2.5 text-sm text-void">
        Ask Jupiter
      </button>
      {tick?.quote?.outAmount && (
        <p className="text-xs text-gold tabular-nums">Out: {tick.quote.outAmount} raw $CLAW</p>
      )}
      <LaunchMini />
      <AgentTalker fallbackId="aura" />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-[10px] tracking-[0.2em] text-muted uppercase">{label}</p>
      <p className="font-display text-xl text-fg tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-gold">{sub}</p>}
    </div>
  );
}

function LaunchMini() {
  const [name, setName] = useState("Aetherlight");
  const [symbol, setSymbol] = useState("AETH");
  const [mode, setMode] = useState<"gasless" | "self-funded">("gasless");
  const [msg, setMsg] = useState<string | null>(null);

  async function launch() {
    const res = await apiFetch("/api/launch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, symbol, mode, description: "Forged inside AETHER" }),
    });
    const data = await res.json().catch(() => ({}));
    setMsg(data.message ?? data.error ?? (res.ok ? "Launch recorded." : "Launch failed."));
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Launch</p>
      <div className="grid grid-cols-2 gap-2">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputClass} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
      </div>
      <div className="flex gap-2">
        {(["gasless", "self-funded"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full border px-3 py-1 text-xs ${mode === m ? "border-gold text-gold" : "border-border text-muted"}`}
          >
            {m}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => void launch()} className="w-full rounded-full border border-aether py-2 text-sm text-aether">
        Launch via ClawPump
      </button>
      {msg && <p className="text-xs text-muted">{msg}</p>}
    </div>
  );
}
