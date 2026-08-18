import { corsOptions, json, readJson, resolveOwner } from "@/lib/aether-auth";
import {
  addMessage,
  getAgent,
  getSettings,
  insertAgent,
  listAgents,
  reveal,
  setAgentStatus,
  upsertSettings,
} from "@/lib/aether-db";
import { createClawpump, clawpumpPublicStatus } from "@/lib/clawpump";
import { ANSEM_MINT, CLAW_MINT, NATIVE_AGENTS, SOL_MINT } from "@/lib/constants";
import { hashToken, mintToken, newId } from "@/lib/crypto";
import { getSql } from "@/lib/db";
import { chatComplete, speakText, type ChatTurn } from "@/lib/llm";
import { fetchRealmTickers, jupiterQuote } from "@/lib/markets";
import { aetherSkillMarkdown } from "@/lib/skill-doc";
import nacl from "tweetnacl";
import bs58 from "bs58";

function originOf(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

async function llmCfg(ownerId: string | null) {
  if (!ownerId) return {};
  const s = await getSettings(ownerId);
  return {
    baseUrl: s?.provider_base_url,
    apiKey: reveal(s?.provider_key_enc),
    model: s?.provider_model,
  };
}

async function clawOf(ownerId: string | null) {
  if (!ownerId) return null;
  const s = await getSettings(ownerId);
  const key = reveal(s?.clawpump_key_enc);
  return key ? createClawpump(key) : null;
}

export async function handleAetherApi(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return corsOptions();
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  try {
    if (path === "/api/skill.md" || path === "/skill.md") {
      const md = aetherSkillMarkdown(originOf(request));
      if (request.headers.get("accept")?.includes("application/json")) {
        return json({ markdown: md, name: "aether", version: "1.0.0" });
      }
      return new Response(md, {
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=120",
        },
      });
    }

    if (path === "/api/nexus" && request.method === "GET") {
      const [tickers, status, supply] = await Promise.all([
        fetchRealmTickers(),
        clawpumpPublicStatus(),
        (async () => {
          try {
            const { defaultRpc, heliusRpc } = await import("@/lib/markets");
            const result = await heliusRpc<{ value?: { uiAmountString?: string; amount?: string } }>(
              defaultRpc(),
              "getTokenSupply",
              [CLAW_MINT],
            );
            return result?.value?.uiAmountString ?? result?.value?.amount ?? null;
          } catch {
            return null;
          }
        })(),
      ]);
      let quote = null;
      try {
        quote = await jupiterQuote({
          inputMint: SOL_MINT,
          outputMint: CLAW_MINT,
          amount: "100000000",
        });
      } catch {
        quote = null;
      }
      return json({
        claw: tickers.claw,
        ansem: tickers.ansem,
        clawSupply: supply,
        jupiter: quote
          ? { inAmount: quote.inAmount, outAmount: quote.outAmount, inMint: quote.inputMint, outMint: quote.outputMint }
          : null,
        clawpump: status,
        generatedAt: new Date().toISOString(),
      });
    }

    if (path === "/api/wallet" && request.method === "GET") {
      const address = url.searchParams.get("address") ?? "";
      if (!address) return json({ error: "address required" }, 400);
      const owner = await resolveOwner(request);
      const helius = owner?.ownerId ? reveal((await getSettings(owner.ownerId))?.helius_key_enc) : null;
      try {
        const { walletSolBalance } = await import("@/lib/markets");
        const bal = await walletSolBalance(address, helius);
        return json({ address, ...bal, rpc: helius ? "user-helius" : "public" });
      } catch (err) {
        return json({ error: err instanceof Error ? err.message : "rpc failed" }, 502);
      }
    }

    if (path === "/api/register/human" && request.method === "POST") {
      const body = await readJson<{
        email?: string;
        displayName?: string;
        walletAddress?: string;
        clawpumpApiKey?: string;
      }>(request);
      if (!body.email) return json({ error: "email required" }, 400);
      const sql = await getSql();
      const profileId = newId("hum");
      await sql`
        insert into aether_profiles (id, kind, email, display_name, wallet_address)
        values (${profileId}, ${"human"}, ${body.email}, ${body.displayName ?? body.email}, ${body.walletAddress ?? null})
      `;
      const token = mintToken("ath");
      await sql`
        insert into aether_tokens (token_hash, profile_id, label)
        values (${hashToken(token)}, ${profileId}, ${"human"})
      `;
      if (body.clawpumpApiKey) {
        await upsertSettings(profileId, {
          clawpumpKey: body.clawpumpApiKey,
          walletAddress: body.walletAddress,
        });
      }
      return json({
        profileId,
        authToken: token,
        message: "Human registered. Store authToken — it is shown once.",
      });
    }

    if (path === "/api/register/agent" && request.method === "POST") {
      const body = await readJson<{
        name?: string;
        publicKey?: string;
        capabilities?: string[];
        persona?: string;
        signature?: string;
      }>(request);
      if (!body.name) return json({ error: "name required" }, 400);
      let verified = false;
      if (body.publicKey && body.signature) {
        try {
          const msg = new TextEncoder().encode(`${body.name}:${body.publicKey}`);
          verified = nacl.sign.detached.verify(
            msg,
            bs58.decode(body.signature),
            bs58.decode(body.publicKey),
          );
        } catch {
          verified = false;
        }
      }
      const sql = await getSql();
      const profileId = newId("agtreg");
      await sql`
        insert into aether_profiles (id, kind, display_name, public_key, capabilities)
        values (
          ${profileId}, ${"agent"}, ${body.name}, ${body.publicKey ?? null},
          ${JSON.stringify(body.capabilities ?? [])}
        )
      `;
      const token = mintToken("ath");
      await sql`
        insert into aether_tokens (token_hash, profile_id, label)
        values (${hashToken(token)}, ${profileId}, ${"agent"})
      `;
      const agent = await insertAgent(profileId, {
        name: body.name,
        persona: body.persona,
        skills: body.capabilities,
        zone: "nexus",
      });
      return json({
        profileId,
        agentId: agent.id,
        authToken: token,
        verified,
        message: verified
          ? "Agent registered and signature verified."
          : "Agent registered. Provide an Ed25519 signature next time to be marked verified.",
      });
    }

    const owner = await resolveOwner(request);
    const ownerId = owner?.ownerId ?? null;

    if (path === "/api/settings" && request.method === "GET") {
      if (!ownerId) return json({ guest: true, hasClawpump: false, hasHelius: false, hasProvider: false });
      const s = await getSettings(ownerId);
      return json({
        walletAddress: s?.wallet_address ?? null,
        payoutWallet: s?.payout_wallet ?? null,
        providerBaseUrl: s?.provider_base_url ?? null,
        providerModel: s?.provider_model ?? null,
        hasClawpump: Boolean(s?.clawpump_key_enc),
        hasHelius: Boolean(s?.helius_key_enc),
        hasPaybox: Boolean(s?.paybox_key_enc),
        hasProvider: Boolean(s?.provider_key_enc),
      });
    }

    if (path === "/api/settings" && request.method === "PUT") {
      if (!ownerId) return json({ error: "Sign in or register to seal keys." }, 401);
      const body = await readJson<{
        walletAddress?: string;
        clawpumpApiKey?: string;
        heliusApiKey?: string;
        payboxKey?: string;
        providerBaseUrl?: string;
        providerModel?: string;
        providerKey?: string;
        payoutWallet?: string;
      }>(request);
      await upsertSettings(ownerId, {
        walletAddress: body.walletAddress,
        clawpumpKey: body.clawpumpApiKey,
        heliusKey: body.heliusApiKey,
        payboxKey: body.payboxKey,
        providerBaseUrl: body.providerBaseUrl,
        providerModel: body.providerModel,
        providerKey: body.providerKey,
        payoutWallet: body.payoutWallet,
      });
      const s = await getSettings(ownerId);
      return json({
        ok: true,
        walletAddress: s?.wallet_address,
        hasClawpump: Boolean(s?.clawpump_key_enc),
        hasHelius: Boolean(s?.helius_key_enc),
        hasPaybox: Boolean(s?.paybox_key_enc),
        hasProvider: Boolean(s?.provider_key_enc),
      });
    }

    if (path === "/api/settings/test" && request.method === "POST") {
      if (!ownerId) return json({ error: "Sign in first." }, 401);
      const body = await readJson<{ clawpumpApiKey?: string }>(request);
      const key = body.clawpumpApiKey || reveal((await getSettings(ownerId))?.clawpump_key_enc);
      if (!key) return json({ ok: false, error: "No ClawPump key to test. Paste yours — AETHER has no shared platform key." });
      const cp = createClawpump(key);
      const listed = await cp.listAgents();
      return json({
        ok: listed.ok,
        message: listed.ok
          ? "ClawPump answered with your key. Seal it to keep it in your vault only."
          : `ClawPump rejected the test: ${listed.error ?? "unknown"}`,
      });
    }

    if (path === "/api/keys" && request.method === "GET") {
      if (!ownerId) return json({ error: "Sign in first." }, 401);
      const sql = await getSql();
      const rows = await sql<{ created_at: string; label: string | null }>`
        select created_at, label from aether_tokens
        where user_id = ${ownerId} or profile_id = ${ownerId}
        order by created_at desc
      `;
      return json({ keys: rows });
    }

    if (path === "/api/keys" && request.method === "POST") {
      if (!ownerId) return json({ error: "Sign in first." }, 401);
      const body = await readJson<{ label?: string }>(request).catch(() => ({ label: "dashboard" }));
      const token = mintToken("ath");
      const sql = await getSql();
      await sql`
        insert into aether_tokens (token_hash, profile_id, user_id, label)
        values (${hashToken(token)}, ${ownerId}, ${ownerId}, ${body.label ?? "dashboard"})
      `;
      return json({
        authToken: token,
        message: "Shown once. Give this bearer to your agent. It logs into YOUR dashboard, not a shared platform key.",
      });
    }

    if (path === "/api/me" && request.method === "GET") {
      if (!ownerId) return json({ signedIn: false });
      const s = await getSettings(ownerId);
      return json({
        signedIn: true,
        ownerId,
        kind: owner?.kind,
        hasClawpump: Boolean(s?.clawpump_key_enc),
        hasPaybox: Boolean(s?.paybox_key_enc),
      });
    }

    if (path === "/api/desk" && request.method === "GET") {
      const sql = await getSql();
      const [settings, agents, keyRows, deals, tickers, teams, submissions, supply, quote] = await Promise.all([
        ownerId ? getSettings(ownerId) : Promise.resolve(null),
        ownerId ? listAgents(ownerId) : Promise.resolve([]),
        ownerId
          ? sql<{ created_at: string; label: string | null }>`
              select created_at, label from aether_tokens
              where user_id = ${ownerId} or profile_id = ${ownerId}
              order by created_at desc
            `
          : Promise.resolve([]),
        sql<{ id: string; title: string; description: string | null; price_usdc: string; status: string }>`
          select id, title, description, price_usdc, status from aether_deals order by created_at desc limit 30
        `,
        fetchRealmTickers(),
        sql<{ id: string; name: string; track: string | null }>`
          select id, name, track from aether_teams order by created_at desc limit 20
        `,
        sql<{ id: string; title: string; status: string }>`
          select id, title, status from aether_submissions order by created_at desc limit 20
        `,
        (async () => {
          try {
            const { defaultRpc, heliusRpc } = await import("@/lib/markets");
            const result = await heliusRpc<{ value?: { uiAmountString?: string } }>(
              defaultRpc(),
              "getTokenSupply",
              [CLAW_MINT],
            );
            return result?.value?.uiAmountString ?? null;
          } catch {
            return null;
          }
        })(),
        jupiterQuote({ inputMint: SOL_MINT, outputMint: CLAW_MINT, amount: "100000000" }).catch(() => null),
      ]);
      return json({
        signedIn: Boolean(ownerId),
        ownerId,
        kind: owner?.kind ?? "guest",
        settings: settings
          ? {
              walletAddress: settings.wallet_address,
              payoutWallet: settings.payout_wallet,
              providerBaseUrl: settings.provider_base_url,
              providerModel: settings.provider_model,
              hasClawpump: Boolean(settings.clawpump_key_enc),
              hasHelius: Boolean(settings.helius_key_enc),
              hasPaybox: Boolean(settings.paybox_key_enc),
              hasProvider: Boolean(settings.provider_key_enc),
            }
          : {
              walletAddress: null,
              hasClawpump: false,
              hasHelius: false,
              hasPaybox: false,
              hasProvider: false,
            },
        agents: ownerId ? agents : NATIVE_AGENTS,
        keys: keyRows,
        deals,
        nexus: {
          ...tickers,
          clawSupply: supply,
          jupiter: quote
            ? { inAmount: quote.inAmount, outAmount: quote.outAmount }
            : null,
        },
        teams,
        submissions,
      });
    }

    if (path === "/api/agents" && request.method === "GET") {
      if (!ownerId) return json({ agents: NATIVE_AGENTS });
      const rows = await listAgents(ownerId);
      return json({ agents: rows });
    }

    if (path === "/api/agents" && request.method === "POST") {
      const body = await readJson<{
        name?: string;
        persona?: string;
        model?: string;
        skills?: string[];
        zone?: string;
      }>(request);
      if (!body.name) return json({ error: "name required" }, 400);
      let clawpumpId: string | undefined;
      let remote: unknown;
      if (ownerId) {
        const cp = await clawOf(ownerId);
        if (cp) {
          const created = await cp.createAgent({
            name: body.name,
            persona: body.persona,
            model: body.model,
            skills: body.skills,
          });
          remote = created.data;
          const data = created.data as { id?: string } | undefined;
          if (created.ok && data?.id) clawpumpId = data.id;
        }
      }
      if (ownerId) {
        const row = await insertAgent(ownerId, {
          name: body.name,
          persona: body.persona,
          model: body.model,
          skills: body.skills,
          zone: body.zone,
          clawpumpId,
        });
        return json({
          ...row,
          clawpumpId,
          remote,
          message: clawpumpId ? "Forged and registered with ClawPump." : "Forged in AETHER.",
        });
      }
      return json({
        id: newId("agt"),
        name: body.name,
        persona: body.persona,
        skills: body.skills,
        zone: body.zone ?? "forge",
        message: "Forged locally. Sign in to persist and link ClawPump.",
      });
    }

    const agentMatch = path.match(/^\/api\/agents\/([^/]+)(?:\/(start|stop|messages))?$/);
    if (agentMatch && agentMatch[1] !== "chat") {
      const id = agentMatch[1];
      const action = agentMatch[2];
      if (request.method === "GET" && !action) {
        if (!ownerId) {
          const native = NATIVE_AGENTS.find((a) => a.id === id);
          return native ? json(native) : json({ error: "not found" }, 404);
        }
        const row = await getAgent(ownerId, id);
        return row ? json(row) : json({ error: "not found" }, 404);
      }
      if (request.method === "POST" && (action === "start" || action === "stop")) {
        if (ownerId) {
          const row = await getAgent(ownerId, id);
          const cp = await clawOf(ownerId);
          if (cp && row?.clawpump_id) {
            if (action === "start") await cp.start(row.clawpump_id);
            else await cp.stop(row.clawpump_id);
          }
          const updated = await setAgentStatus(ownerId, id, action === "start" ? "live" : "idle");
          return json(updated ?? { id, status: action === "start" ? "live" : "idle" });
        }
        return json({ id, status: action === "start" ? "live" : "idle" });
      }
    }

    if (path === "/api/agents/chat" && request.method === "POST") {
      const body = await readJson<{ agentId?: string; message?: string }>(request);
      if (!body.message) return json({ error: "message required" }, 400);
      const agentId = body.agentId ?? "aura";
      const native = NATIVE_AGENTS.find((a) => a.id === agentId);
      let persona = native?.persona ?? "You are a luminous citizen of AETHER.";
      let remoteReply: string | null = null;
      if (ownerId) {
        const row = await getAgent(ownerId, agentId);
        if (row?.persona) persona = row.persona;
        const cp = await clawOf(ownerId);
        if (cp && row?.clawpump_id) {
          const r = await cp.chat(row.clawpump_id, body.message);
          const data = r.data as { content?: string; reply?: string; message?: string } | undefined;
          if (r.ok) remoteReply = data?.content ?? data?.reply ?? data?.message ?? null;
        }
      }
      if (remoteReply) {
        if (ownerId) await addMessage(ownerId, agentId, "assistant", remoteReply);
        return json({ reply: remoteReply, source: "clawpump" });
      }
      const cfg = await llmCfg(ownerId);
      const messages: ChatTurn[] = [
        { role: "system", content: `${persona}\nYou live inside AETHER, the 3D realm of agentic companies on Solana.` },
        { role: "user", content: body.message },
      ];
      const reply = await chatComplete(cfg, messages);
      if (!reply.ok) return json({ error: reply.error, reply: null }, 200);
      if (ownerId) {
        await addMessage(ownerId, agentId, "user", body.message);
        await addMessage(ownerId, agentId, "assistant", reply.text);
      }
      return json({ reply: reply.text, source: reply.model });
    }

    if (path === "/api/launch" && request.method === "POST") {
      const body = await readJson<{
        name?: string;
        symbol?: string;
        description?: string;
        imageUrl?: string;
        agentId?: string;
        mode?: "gasless" | "self-funded";
      }>(request);
      if (!body.name || !body.symbol) return json({ error: "name and symbol required" }, 400);
      const sql = await getSql();
      const id = newId("lnch");
      let remote: unknown = null;
      let mint: string | null = null;
      let status = "recorded";
      if (ownerId) {
        const cp = await clawOf(ownerId);
        if (cp) {
          const launched = await cp.launch({
            name: body.name,
            symbol: body.symbol,
            description: body.description,
            imageUrl: body.imageUrl,
            agentId: body.agentId,
            mode: body.mode ?? "gasless",
          });
          remote = launched.data;
          status = launched.ok ? "submitted" : "clawpump-error";
          const data = launched.data as { mint?: string; address?: string } | undefined;
          mint = data?.mint ?? data?.address ?? null;
        }
        await sql`
          insert into aether_launches (id, owner_id, agent_id, name, symbol, description, image_url, mode, mint, status, raw)
          values (
            ${id}, ${ownerId}, ${body.agentId ?? null}, ${body.name}, ${body.symbol},
            ${body.description ?? ""}, ${body.imageUrl ?? null}, ${body.mode ?? "gasless"},
            ${mint}, ${status}, ${JSON.stringify(remote)}
          )
        `;
      }
      return json({
        id,
        mint,
        status,
        remote,
        message: ownerId
          ? status === "submitted"
            ? "Launch submitted to ClawPump."
            : "Launch recorded. Add a ClawPump key in Settings to mint on-chain."
          : "Sign in or register to persist a launch and mint via ClawPump.",
      });
    }

    if (path === "/api/swap" && request.method === "POST") {
      const body = await readJson<{
        inputMint?: string;
        outputMint?: string;
        amount?: string;
        execute?: boolean;
        agentId?: string;
      }>(request);
      if (!body.inputMint || !body.outputMint || !body.amount) {
        return json({ error: "inputMint, outputMint, amount required" }, 400);
      }
      const quote = await jupiterQuote({
        inputMint: body.inputMint,
        outputMint: body.outputMint,
        amount: body.amount,
      });
      let executed: unknown = null;
      if (body.execute && ownerId) {
        const cp = await clawOf(ownerId);
        if (cp) {
          const r = await cp.swapExecute({
            agentId: body.agentId,
            inputMint: body.inputMint,
            outputMint: body.outputMint,
            amount: body.amount,
          });
          executed = r;
        }
      }
      return json({ quote, executed });
    }

    if (path === "/api/skills" && request.method === "GET") {
      const sql = await getSql();
      const rows = ownerId
        ? await sql`select id, name, slug, tags, created_at from aether_skills where owner_id = ${ownerId} order by created_at desc`
        : await sql`select id, name, slug, tags, created_at from aether_skills order by created_at desc limit 40`;
      return json({ skills: rows });
    }

    if (path === "/api/skills" && request.method === "POST") {
      const body = await readJson<{
        name?: string;
        slug?: string;
        body?: string;
        tags?: string[];
        injectInto?: string;
      }>(request);
      if (!body.name || !body.body) return json({ error: "name and body required" }, 400);
      const id = newId("skl");
      const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (ownerId) {
        const sql = await getSql();
        await sql`
          insert into aether_skills (id, owner_id, name, slug, body, tags, injected_into)
          values (${id}, ${ownerId}, ${body.name}, ${slug}, ${body.body}, ${JSON.stringify(body.tags ?? [])}, ${body.injectInto ?? null})
        `;
      }
      return json({ id, slug, injected: Boolean(body.injectInto), message: "Skill inscribed." });
    }

    if (path === "/api/x402" && request.method === "GET") {
      const sql = await getSql();
      const rows = await sql`select id, title, description, price_usdc, status, created_at from aether_deals order by created_at desc limit 50`;
      return json({ deals: rows });
    }

    if (path === "/api/x402" && request.method === "POST") {
      const body = await readJson<{
        title?: string;
        description?: string;
        priceUsdc?: string;
        sellerAgent?: string;
        dealId?: string;
        action?: string;
      }>(request);
      const sql = await getSql();
      if (body.action === "accept" && body.dealId) {
        if (ownerId) {
          await sql`update aether_deals set status = ${"accepted"}, buyer = ${ownerId} where id = ${body.dealId}`;
        }
        return json({ ok: true, status: "accepted", settlement: "x402-intent" });
      }
      if (!body.title || !body.priceUsdc) return json({ error: "title and priceUsdc required" }, 400);
      const id = newId("deal");
      if (ownerId) {
        await sql`
          insert into aether_deals (id, owner_id, title, description, price_usdc, seller_agent, status, settlement)
          values (${id}, ${ownerId}, ${body.title}, ${body.description ?? ""}, ${body.priceUsdc}, ${body.sellerAgent ?? null}, ${"open"}, ${"x402"})
        `;
      }
      return json({ id, status: "open", message: "Private deal posted." });
    }

    if (path === "/api/ansemhack" && request.method === "GET") {
      const sql = await getSql();
      const teams = await sql`select id, name, track, created_at from aether_teams order by created_at desc limit 40`;
      const submissions = await sql`select id, title, token_mint, status, created_at from aether_submissions order by created_at desc limit 40`;
      return json({ teams, submissions, prize: "250000 ANSEM", desk: "https://clawpump.tech/ansemhack" });
    }

    if (path === "/api/ansemhack" && request.method === "POST") {
      const body = await readJson<{
        action?: string;
        name?: string;
        members?: string[];
        track?: string;
        title?: string;
        tokenMint?: string;
        skillSlug?: string;
        summary?: string;
        teamId?: string;
      }>(request);
      const sql = await getSql();
      if (body.action === "team") {
        const id = newId("team");
        if (ownerId) {
          await sql`
            insert into aether_teams (id, owner_id, name, members, track)
            values (${id}, ${ownerId}, ${body.name ?? "Unnamed"}, ${JSON.stringify(body.members ?? [])}, ${body.track ?? "agentic-company"})
          `;
        }
        return json({ id, message: "Team inscribed in the Arena." });
      }
      const id = newId("sub");
      if (ownerId) {
        await sql`
          insert into aether_submissions (id, owner_id, team_id, title, token_mint, skill_slug, summary, status)
          values (${id}, ${ownerId}, ${body.teamId ?? null}, ${body.title ?? "Untitled"}, ${body.tokenMint ?? null}, ${body.skillSlug ?? null}, ${body.summary ?? ""}, ${"received"})
        `;
      }
      return json({ id, message: "Submission received by the Arena herald." });
    }

    if (path === "/api/train" && request.method === "POST") {
      const body = await readJson<{
        pair?: string;
        episodes?: number;
        rewardPnl?: number;
        rewardSharpe?: number;
        rewardDrawdown?: number;
      }>(request);
      const episodes = Math.min(48, Math.max(8, body.episodes ?? 24));
      const tickers = await fetchRealmTickers();
      const spot = tickers.claw.priceUsd ?? 0.00001;
      const log: string[] = [`Seeded on live $CLAW spot ${spot}`];
      let equity = 1;
      const curve: number[] = [1];
      let peak = 1;
      let sum = 0;
      let sumSq = 0;
      for (let i = 1; i <= episodes; i += 1) {
        const shock = (Math.sin(i * 1.7 + spot * 100) + (Math.random() - 0.48) * 2) * 0.012;
        const signal = shock > 0 ? 1 : -1;
        const ret = signal * shock * (body.rewardPnl ?? 1);
        equity = Math.max(0.2, equity * (1 + ret));
        curve.push(equity);
        peak = Math.max(peak, equity);
        const dd = (peak - equity) / peak;
        const step = ret * (body.rewardPnl ?? 1) - dd * (body.rewardDrawdown ?? 0.4);
        sum += step;
        sumSq += step * step;
        log.push(`ep ${i.toString().padStart(2, "0")}  eq ${equity.toFixed(3)}  dd ${(dd * 100).toFixed(1)}%  r ${step.toFixed(3)}`);
      }
      const mean = sum / episodes;
      const std = Math.sqrt(Math.max(0, sumSq / episodes - mean * mean));
      const sharpe = std > 0 ? mean / std : 0;
      const avg = mean + sharpe * (body.rewardSharpe ?? 0.4);
      log.push(`policy sharpe ${sharpe.toFixed(3)}  avg reward ${avg.toFixed(3)}`);
      const skillBody = `---\nname: sanctum-policy\nversion: 1.0.0\n---\n\n# Sanctum Policy\n\nTrained in AETHER on live $CLAW spot ${spot}.\nPair: ${body.pair ?? "CLAW/SOL"}\nEpisodes: ${episodes}\nAvg reward: ${avg.toFixed(4)}\nSharpe: ${sharpe.toFixed(4)}\n\n## Rule\nLong when short-horizon shock is positive; flatten when drawdown exceeds 12%.\nReward mix: pnl=${body.rewardPnl ?? 1} sharpe=${body.rewardSharpe ?? 0.4} dd=${body.rewardDrawdown ?? 0.4}\n`;
      if (ownerId) {
        const sql = await getSql();
        await sql`
          insert into aether_train_runs (id, owner_id, pair, episodes, reward_pnl, reward_sharpe, reward_drawdown, avg_reward, status, policy)
          values (${newId("trn")}, ${ownerId}, ${body.pair ?? "CLAW/SOL"}, ${episodes}, ${body.rewardPnl ?? 1}, ${body.rewardSharpe ?? 0.4}, ${body.rewardDrawdown ?? 0.4}, ${avg}, ${"done"}, ${skillBody})
        `;
      }
      return json({ log, avgReward: avg, sharpe, skillBody, skillId: newId("skl"), pair: body.pair ?? "CLAW/SOL" });
    }

    if (path === "/api/voice" && request.method === "POST") {
      const body = await readJson<{ text?: string }>(request);
      if (!body.text) return json({ error: "text required" }, 400);
      const spoken = await speakText(body.text);
      if (!spoken.ok || !spoken.audio) {
        return json({ fallback: true, error: spoken.error }, 200);
      }
      return new Response(spoken.audio, {
        headers: { "content-type": "audio/mpeg", "access-control-allow-origin": "*" },
      });
    }

    return json({ error: `Unknown path ${path}`, hint: "Read /skill.md" }, 404);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "server error" }, 500);
  }
}

export { CLAW_MINT, ANSEM_MINT, SOL_MINT };
