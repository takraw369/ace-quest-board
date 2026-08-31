create table if not exists public.entitlement_definitions (
  id uuid primary key default gen_random_uuid(),
  entitlement_key text not null unique,
  name text not null,
  resource_type text not null,
  resource_key text not null,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offer_entitlements (
  offer_id uuid not null references public.offers(id) on delete cascade,
  entitlement_id uuid not null references public.entitlement_definitions(id) on delete cascade,
  grant_duration_days integer null check (grant_duration_days is null or grant_duration_days > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (offer_id, entitlement_id)
);

create table if not exists public.person_entitlements (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  entitlement_id uuid not null references public.entitlement_definitions(id) on delete cascade,
  source_type text not null,
  source_ref text not null,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz null,
  revoked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contact_id, entitlement_id, source_type, source_ref)
);

create index if not exists idx_offer_entitlements_entitlement_id on public.offer_entitlements(entitlement_id);
create index if not exists idx_person_entitlements_contact_status on public.person_entitlements(contact_id, status);
create index if not exists idx_person_entitlements_entitlement_status on public.person_entitlements(entitlement_id, status);
create index if not exists idx_person_entitlements_expires_at on public.person_entitlements(expires_at) where expires_at is not null;

alter table public.entitlement_definitions enable row level security;
alter table public.offer_entitlements enable row level security;
alter table public.person_entitlements enable row level security;

drop policy if exists entitlement_definitions_authenticated_read on public.entitlement_definitions;
create policy entitlement_definitions_authenticated_read
on public.entitlement_definitions
for select
to authenticated
using (status = 'active');

drop policy if exists person_entitlements_own_read on public.person_entitlements;
create policy person_entitlements_own_read
on public.person_entitlements
for select
to authenticated
using (
  exists (
    select 1
    from public.contacts c
    where c.id = person_entitlements.contact_id
      and c.auth_user_id = auth.uid()
  )
);

create or replace function public.sync_purchase_entitlements_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'paid' then
    insert into public.person_entitlements (
      contact_id,
      entitlement_id,
      source_type,
      source_ref,
      status,
      granted_at,
      expires_at,
      revoked_at,
      metadata,
      updated_at
    )
    select
      new.contact_id,
      oe.entitlement_id,
      'purchase',
      new.id::text,
      'active',
      coalesce(new.purchased_at, now()),
      case
        when oe.grant_duration_days is null then null
        else coalesce(new.purchased_at, now()) + make_interval(days => oe.grant_duration_days)
      end,
      null,
      jsonb_build_object('offer_id', new.offer_id, 'provider', new.provider),
      now()
    from public.offer_entitlements oe
    where oe.offer_id = new.offer_id
    on conflict (contact_id, entitlement_id, source_type, source_ref)
    do update set
      status = 'active',
      granted_at = excluded.granted_at,
      expires_at = excluded.expires_at,
      revoked_at = null,
      metadata = public.person_entitlements.metadata || excluded.metadata,
      updated_at = now();
  elsif tg_op = 'UPDATE' and old.status = 'paid' and new.status <> 'paid' then
    update public.person_entitlements
    set status = 'revoked',
        revoked_at = now(),
        updated_at = now(),
        metadata = metadata || jsonb_build_object('purchase_status', new.status)
    where source_type = 'purchase'
      and source_ref = new.id::text
      and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_purchase_entitlements_v1 on public.purchases;
create trigger trg_sync_purchase_entitlements_v1
after insert or update of status, offer_id, contact_id, purchased_at
on public.purchases
for each row
execute function public.sync_purchase_entitlements_v1();

insert into public.entitlement_definitions (
  entitlement_key,
  name,
  resource_type,
  resource_key,
  metadata
)
values (
  'winning_os_90.session_access',
  '勝ち筋OS｜90分セッション利用権',
  'service',
  'winning_os_90',
  jsonb_build_object('source', 'platform_capability_os_v1')
)
on conflict (entitlement_key) do update set
  name = excluded.name,
  resource_type = excluded.resource_type,
  resource_key = excluded.resource_key,
  status = 'active',
  metadata = public.entitlement_definitions.metadata || excluded.metadata,
  updated_at = now();

insert into public.offer_entitlements (offer_id, entitlement_id)
select o.id, e.id
from public.offers o
join public.entitlement_definitions e
  on e.entitlement_key = 'winning_os_90.session_access'
where o.slug = 'winning_os_90'
on conflict (offer_id, entitlement_id) do nothing;

insert into public.person_entitlements (
  contact_id,
  entitlement_id,
  source_type,
  source_ref,
  status,
  granted_at,
  expires_at,
  metadata
)
select
  p.contact_id,
  oe.entitlement_id,
  'purchase',
  p.id::text,
  'active',
  coalesce(p.purchased_at, p.created_at),
  case
    when oe.grant_duration_days is null then null
    else coalesce(p.purchased_at, p.created_at) + make_interval(days => oe.grant_duration_days)
  end,
  jsonb_build_object('offer_id', p.offer_id, 'provider', p.provider, 'backfilled', true)
from public.purchases p
join public.offer_entitlements oe on oe.offer_id = p.offer_id
where p.status = 'paid'
on conflict (contact_id, entitlement_id, source_type, source_ref) do nothing;
