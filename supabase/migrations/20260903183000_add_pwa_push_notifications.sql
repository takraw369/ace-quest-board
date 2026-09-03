create table if not exists public.pwa_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists pwa_push_subscriptions_contact_id_idx
  on public.pwa_push_subscriptions(contact_id);

alter table public.pwa_push_subscriptions enable row level security;
revoke all on table public.pwa_push_subscriptions from anon, authenticated;

create or replace function public.get_pwa_vapid_private_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = 'ace_pwa_vapid_private_key'
  order by created_at desc
  limit 1
$$;

revoke all on function public.get_pwa_vapid_private_key() from public, anon, authenticated;
grant execute on function public.get_pwa_vapid_private_key() to service_role;

comment on table public.pwa_push_subscriptions is
  'Web Push subscriptions for ACE/FLOW PWA. The VAPID private key is provisioned separately in Supabase Vault and is never committed.';
