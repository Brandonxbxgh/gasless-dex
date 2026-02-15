-- Run this in Supabase SQL Editor to add amount columns to transactions
-- Dashboard: https://supabase.com/dashboard -> Your Project -> SQL Editor

alter table public.transactions
  add column if not exists from_amount text,
  add column if not exists to_amount text,
  add column if not exists from_amount_usd text,
  add column if not exists to_amount_usd text;
