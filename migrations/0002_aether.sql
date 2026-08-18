create table if not exists aether_profiles (
  id text primary key,
  user_id text,
  kind text not null default 'human',
  email text,
  display_name text,
  wallet_address text,
  public_key text,
  capabilities text,
  created_at timestamptz not null default now()
);
create index if not exists aether_profiles_user_id_idx on aether_profiles (user_id);
create index if not exists aether_profiles_email_idx on aether_profiles (email);

create table if not exists aether_tokens (
  token_hash text primary key,
  profile_id text not null,
  user_id text,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists aether_tokens_profile_idx on aether_tokens (profile_id);

create table if not exists aether_settings (
  owner_id text primary key,
  wallet_address text,
  clawpump_key_enc text,
  helius_key_enc text,
  paybox_key_enc text,
  provider_base_url text,
  provider_model text,
  provider_key_enc text,
  telegram_enc text,
  payout_wallet text,
  updated_at timestamptz not null default now()
);

create table if not exists aether_agents (
  id text primary key,
  owner_id text not null,
  name text not null,
  persona text,
  model text,
  skills text,
  status text not null default 'idle',
  clawpump_id text,
  wallet_address text,
  zone text not null default 'forge',
  color text,
  created_at timestamptz not null default now()
);
create index if not exists aether_agents_owner_idx on aether_agents (owner_id);

create table if not exists aether_messages (
  id text primary key,
  owner_id text not null,
  agent_id text not null,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists aether_messages_agent_idx on aether_messages (agent_id, created_at);

create table if not exists aether_skills (
  id text primary key,
  owner_id text not null,
  name text not null,
  slug text not null,
  body text not null,
  tags text,
  injected_into text,
  created_at timestamptz not null default now()
);
create index if not exists aether_skills_owner_idx on aether_skills (owner_id);

create table if not exists aether_deals (
  id text primary key,
  owner_id text not null,
  title text not null,
  description text,
  price_usdc text not null,
  seller_agent text,
  buyer text,
  status text not null default 'open',
  settlement text,
  created_at timestamptz not null default now()
);
create index if not exists aether_deals_status_idx on aether_deals (status);

create table if not exists aether_launches (
  id text primary key,
  owner_id text not null,
  agent_id text,
  name text not null,
  symbol text not null,
  description text,
  image_url text,
  mode text not null default 'gasless',
  mint text,
  status text not null default 'pending',
  raw text,
  created_at timestamptz not null default now()
);
create index if not exists aether_launches_owner_idx on aether_launches (owner_id);

create table if not exists aether_earnings (
  id text primary key,
  owner_id text not null,
  agent_id text,
  source text not null,
  amount text not null,
  asset text not null default 'SOL',
  note text,
  created_at timestamptz not null default now()
);

create table if not exists aether_teams (
  id text primary key,
  owner_id text not null,
  name text not null,
  members text,
  track text,
  created_at timestamptz not null default now()
);

create table if not exists aether_submissions (
  id text primary key,
  owner_id text not null,
  team_id text,
  title text not null,
  token_mint text,
  skill_slug text,
  agent_id text,
  summary text,
  status text not null default 'received',
  created_at timestamptz not null default now()
);

create table if not exists aether_train_runs (
  id text primary key,
  owner_id text not null,
  agent_id text,
  pair text not null,
  episodes integer not null default 0,
  reward_pnl real not null default 1,
  reward_sharpe real not null default 0.4,
  reward_drawdown real not null default 0.4,
  avg_reward real,
  status text not null default 'idle',
  policy text,
  created_at timestamptz not null default now()
);
