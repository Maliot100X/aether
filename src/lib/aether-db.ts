import { getSql } from "@/lib/db";
import { decryptSecret, encryptSecret, newId } from "@/lib/crypto";

export type SettingsRow = {
  owner_id: string;
  wallet_address: string | null;
  clawpump_key_enc: string | null;
  helius_key_enc: string | null;
  paybox_key_enc: string | null;
  provider_base_url: string | null;
  provider_model: string | null;
  provider_key_enc: string | null;
  telegram_enc: string | null;
  payout_wallet: string | null;
};

export type AgentRow = {
  id: string;
  owner_id: string;
  name: string;
  persona: string | null;
  model: string | null;
  skills: string | null;
  status: string;
  clawpump_id: string | null;
  wallet_address: string | null;
  zone: string;
  color: string | null;
  created_at: string;
};

export async function getSettings(ownerId: string): Promise<SettingsRow | null> {
  const sql = await getSql();
  const rows = await sql<SettingsRow>`
    select * from aether_settings where owner_id = ${ownerId}
  `;
  return rows[0] ?? null;
}

export async function upsertSettings(
  ownerId: string,
  patch: {
    walletAddress?: string;
    clawpumpKey?: string;
    heliusKey?: string;
    payboxKey?: string;
    providerBaseUrl?: string;
    providerModel?: string;
    providerKey?: string;
    telegram?: string;
    payoutWallet?: string;
  },
): Promise<SettingsRow> {
  const prev = await getSettings(ownerId);
  const next = {
    wallet_address: patch.walletAddress ?? prev?.wallet_address ?? null,
    clawpump_key_enc: patch.clawpumpKey
      ? encryptSecret(patch.clawpumpKey)
      : (prev?.clawpump_key_enc ?? null),
    helius_key_enc: patch.heliusKey
      ? encryptSecret(patch.heliusKey)
      : (prev?.helius_key_enc ?? null),
    paybox_key_enc: patch.payboxKey
      ? encryptSecret(patch.payboxKey)
      : (prev?.paybox_key_enc ?? null),
    provider_base_url: patch.providerBaseUrl ?? prev?.provider_base_url ?? null,
    provider_model: patch.providerModel ?? prev?.provider_model ?? null,
    provider_key_enc: patch.providerKey
      ? encryptSecret(patch.providerKey)
      : (prev?.provider_key_enc ?? null),
    telegram_enc: patch.telegram ? encryptSecret(patch.telegram) : (prev?.telegram_enc ?? null),
    payout_wallet: patch.payoutWallet ?? prev?.payout_wallet ?? null,
  };
  const sql = await getSql();
  await sql`
    insert into aether_settings (
      owner_id, wallet_address, clawpump_key_enc, helius_key_enc, paybox_key_enc,
      provider_base_url, provider_model, provider_key_enc, telegram_enc, payout_wallet
    ) values (
      ${ownerId}, ${next.wallet_address}, ${next.clawpump_key_enc}, ${next.helius_key_enc},
      ${next.paybox_key_enc}, ${next.provider_base_url}, ${next.provider_model},
      ${next.provider_key_enc}, ${next.telegram_enc}, ${next.payout_wallet}
    )
    on conflict (owner_id) do update set
      wallet_address = excluded.wallet_address,
      clawpump_key_enc = excluded.clawpump_key_enc,
      helius_key_enc = excluded.helius_key_enc,
      paybox_key_enc = excluded.paybox_key_enc,
      provider_base_url = excluded.provider_base_url,
      provider_model = excluded.provider_model,
      provider_key_enc = excluded.provider_key_enc,
      telegram_enc = excluded.telegram_enc,
      payout_wallet = excluded.payout_wallet,
      updated_at = now()
  `;
  const saved = await getSettings(ownerId);
  if (!saved) throw new Error("settings write failed");
  return saved;
}

export function reveal(enc: string | null | undefined): string | null {
  if (!enc) return null;
  try {
    return decryptSecret(enc);
  } catch {
    return null;
  }
}

export async function listAgents(ownerId: string): Promise<AgentRow[]> {
  const sql = await getSql();
  return sql<AgentRow>`
    select * from aether_agents where owner_id = ${ownerId} order by created_at desc
  `;
}

export async function getAgent(ownerId: string, id: string): Promise<AgentRow | null> {
  const sql = await getSql();
  const rows = await sql<AgentRow>`
    select * from aether_agents where id = ${id} and owner_id = ${ownerId}
  `;
  return rows[0] ?? null;
}

export async function insertAgent(
  ownerId: string,
  input: {
    name: string;
    persona?: string;
    model?: string;
    skills?: string[];
    clawpumpId?: string;
    walletAddress?: string;
    zone?: string;
    color?: string;
  },
): Promise<AgentRow> {
  const id = newId("agt");
  const sql = await getSql();
  await sql`
    insert into aether_agents (
      id, owner_id, name, persona, model, skills, status, clawpump_id, wallet_address, zone, color
    ) values (
      ${id}, ${ownerId}, ${input.name}, ${input.persona ?? ""}, ${input.model ?? "grok-4.5"},
      ${JSON.stringify(input.skills ?? [])}, ${"idle"}, ${input.clawpumpId ?? null},
      ${input.walletAddress ?? null}, ${input.zone ?? "forge"}, ${input.color ?? null}
    )
  `;
  const row = await getAgent(ownerId, id);
  if (!row) throw new Error("agent insert failed");
  return row;
}

export async function setAgentStatus(
  ownerId: string,
  id: string,
  status: string,
): Promise<AgentRow | null> {
  const sql = await getSql();
  await sql`
    update aether_agents set status = ${status} where id = ${id} and owner_id = ${ownerId}
  `;
  return getAgent(ownerId, id);
}

export async function addMessage(
  ownerId: string,
  agentId: string,
  role: string,
  content: string,
): Promise<void> {
  const sql = await getSql();
  await sql`
    insert into aether_messages (id, owner_id, agent_id, role, content)
    values (${newId("msg")}, ${ownerId}, ${agentId}, ${role}, ${content})
  `;
}
