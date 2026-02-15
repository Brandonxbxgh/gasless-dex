-- Run this in your Supabase SQL Editor to create the transactions table
-- Dashboard: https://supabase.com/dashboard -> Your Project -> SQL Editor
--
-- Required env vars (add to .env.local):
--   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY=eyJ... (from Supabase Project Settings -> API)

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tx_hash text not null,
  chain_id integer not null,
  address text not null,
  action_type text not null check (action_type in ('swap', 'bridge', 'send', 'wrap', 'unwrap')),
  from_token text,
  to_token text,
  from_chain_id integer,
  to_chain_id integer,
  created_at timestamptz default now()
);

-- Index for fast lookups by address
create index if not exists idx_transactions_address on public.transactions(address);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);

-- Allow service role full access (API uses service role key)
alter table public.transactions enable row level security;

-- Policy: allow all for service role (bypasses RLS when using service_role key)
-- No additional policies needed when using service_role
