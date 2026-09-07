-- ACE AI usage + cost guard v1
-- Reuses the existing platform entitlement layer instead of creating a parallel membership system.

create table if not exists public.ai_feature_policies (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.entitlement_definitions(id) on delete cascade,
  feature_key text not null,
  default_model_tier text not null default 'light' check (default_model_tier in ('light','standard','deep')),
  fallback_model_tier text not null default 'light' check (fallback_model_tier in ('light','standard','deep')),
  daily_request_limit integer not null default 5 check (daily_request_limit >= 0),
  monthly_request_limit integer not null default 100 check (monthly_request_limit >= 0),
  monthly_cost_limit_jpy numeric(12,4) not null default 300 check (monthly_cost_limit_jpy >= 0),
  deep_request_limit integer not null default 0 check (deep_request_limit >= 0),
  max_input_tokens integer not null default 16000 check (max_input_tokens > 0),
  max_output_tokens integer not null default 2000 check (max_output_tokens > 0),
  action_on_limit text not null default 'fallback' check (action_on_limit in ('fallback','wait','upgrade','stop','human')),
  status text not null default 'active' check (status in ('active','inactive','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entitlement_id, feature_key)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  entitlement_id uuid null references public.entitlement_definitions(id) on delete set null,
  product_key text null,
  plan_key text null,
  feature_key text not null,
  model_tier text not null check (model_tier in ('light','standard','deep')),
  provider text not null default 'openai',
  model text not null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  estimated_cost_jpy numeric(12,6) not null default 0 check (estimated_cost_jpy >= 0),
  latency_ms integer null check (latency_ms is null or latency_ms >= 0),
  status text not null default 'ok' check (status in ('ok','blocked','error','cancelled')),
  block_reason text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_feedback (
  id uuid primary key default gen_random_uuid(),
  usage_id uuid not null references public.ai_usage(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  rating smallint null check (rating between 1 and 5),
  useful boolean null,
  quest_completed boolean null,
  free_text text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usage_id, contact_id)
);

create index if not exists idx_ai_feature_policies_entitlement_status
  on public.ai_feature_policies(entitlement_id, status);
create index if not exists idx_ai_usage_contact_created_at
  on public.ai_usage(contact_id, created_at desc);
create index if not exists idx_ai_usage_contact_feature_created_at
  on public.ai_usage(contact_id, feature_key, created_at desc);
create index if not exists idx_ai_usage_contact_status_created_at
  on public.ai_usage(contact_id, status, created_at desc);
create index if not exists idx_ai_usage_entitlement_created_at
  on public.ai_usage(entitlement_id, created_at desc);
create index if not exists idx_ai_feedback_contact_created_at
  on public.ai_feedback(contact_id, created_at desc);

alter table public.ai_feature_policies enable row level security;
alter table public.ai_usage enable row level security;
alter table public.ai_feedback enable row level security;

-- Users may read the policy for entitlements they currently hold.
drop policy if exists ai_feature_policies_own_entitlement_read on public.ai_feature_policies;
create policy ai_feature_policies_own_entitlement_read
on public.ai_feature_policies
for select
to authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.person_entitlements pe
    join public.contacts c on c.id = pe.contact_id
    where pe.entitlement_id = ai_feature_policies.entitlement_id
      and pe.status = 'active'
      and (pe.expires_at is null or pe.expires_at > now())
      and c.auth_user_id = auth.uid()
  )
);

-- Usage rows are written by the trusted gateway/service role. Users only read their own usage.
drop policy if exists ai_usage_own_read on public.ai_usage;
create policy ai_usage_own_read
on public.ai_usage
for select
to authenticated
using (
  exists (
    select 1
    from public.contacts c
    where c.id = ai_usage.contact_id
      and c.auth_user_id = auth.uid()
  )
);

-- Users can manage feedback only for their own usage rows.
drop policy if exists ai_feedback_own_read on public.ai_feedback;
create policy ai_feedback_own_read
on public.ai_feedback
for select
to authenticated
using (
  exists (
    select 1
    from public.contacts c
    where c.id = ai_feedback.contact_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists ai_feedback_own_insert on public.ai_feedback;
create policy ai_feedback_own_insert
on public.ai_feedback
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ai_usage u
    join public.contacts c on c.id = u.contact_id
    where u.id = ai_feedback.usage_id
      and u.contact_id = ai_feedback.contact_id
      and c.auth_user_id = auth.uid()
  )
);

drop policy if exists ai_feedback_own_update on public.ai_feedback;
create policy ai_feedback_own_update
on public.ai_feedback
for update
to authenticated
using (
  exists (
    select 1
    from public.contacts c
    where c.id = ai_feedback.contact_id
      and c.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.ai_usage u
    join public.contacts c on c.id = u.contact_id
    where u.id = ai_feedback.usage_id
      and u.contact_id = ai_feedback.contact_id
      and c.auth_user_id = auth.uid()
  )
);

-- Lightweight RPC for client dashboards. Cost enforcement itself stays server-side.
create or replace function public.get_my_ai_usage_summary_v1(p_days integer default 30)
returns table (
  request_count bigint,
  input_tokens bigint,
  output_tokens bigint,
  estimated_cost_jpy numeric,
  blocked_count bigint,
  last_used_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select c.id as contact_id
    from public.contacts c
    where c.auth_user_id = auth.uid()
    limit 1
  )
  select
    count(*) as request_count,
    coalesce(sum(u.input_tokens), 0)::bigint as input_tokens,
    coalesce(sum(u.output_tokens), 0)::bigint as output_tokens,
    coalesce(sum(u.estimated_cost_jpy), 0)::numeric as estimated_cost_jpy,
    count(*) filter (where u.status = 'blocked') as blocked_count,
    max(u.created_at) as last_used_at
  from me
  left join public.ai_usage u
    on u.contact_id = me.contact_id
   and u.created_at >= now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 366)));
$$;

grant execute on function public.get_my_ai_usage_summary_v1(integer) to authenticated;

-- Entitlements: beta now, monthly/pro reserved for future offers.
insert into public.entitlement_definitions (
  entitlement_key,
  name,
  resource_type,
  resource_key,
  metadata
)
values
  (
    'winning_os_90.ai_beta_7d',
    '勝ち筋OS｜ACE AI伴走β 7日間',
    'ai',
    'ace_ai',
    jsonb_build_object('plan', 'beta', 'source', 'ace_ai_business_os_v1')
  ),
  (
    'ace_ai.monthly',
    'ACE AI｜月額利用権',
    'ai',
    'ace_ai',
    jsonb_build_object('plan', 'monthly', 'source', 'ace_ai_business_os_v1')
  ),
  (
    'ace_ai.pro',
    'ACE AI Pro｜月額利用権',
    'ai',
    'ace_ai',
    jsonb_build_object('plan', 'pro', 'source', 'ace_ai_business_os_v1')
  )
on conflict (entitlement_key) do update set
  name = excluded.name,
  resource_type = excluded.resource_type,
  resource_key = excluded.resource_key,
  status = 'active',
  metadata = public.entitlement_definitions.metadata || excluded.metadata,
  updated_at = now();

-- Attach 7-day AI beta to the existing winning_os_90 offer.
insert into public.offer_entitlements (offer_id, entitlement_id, grant_duration_days, metadata)
select
  o.id,
  e.id,
  7,
  jsonb_build_object('source', 'ace_ai_business_os_v1')
from public.offers o
join public.entitlement_definitions e
  on e.entitlement_key = 'winning_os_90.ai_beta_7d'
where o.slug = 'winning_os_90'
on conflict (offer_id, entitlement_id) do update set
  grant_duration_days = excluded.grant_duration_days,
  metadata = public.offer_entitlements.metadata || excluded.metadata;

-- Backfill the new AI beta entitlement for already-paid winning_os_90 purchases.
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
  e.id,
  'purchase',
  p.id::text,
  'active',
  coalesce(p.purchased_at, p.created_at),
  coalesce(p.purchased_at, p.created_at) + interval '7 days',
  jsonb_build_object('offer_id', p.offer_id, 'provider', p.provider, 'backfilled', true, 'source', 'ace_ai_business_os_v1')
from public.purchases p
join public.offers o on o.id = p.offer_id
join public.entitlement_definitions e on e.entitlement_key = 'winning_os_90.ai_beta_7d'
where p.status = 'paid'
  and o.slug = 'winning_os_90'
on conflict (contact_id, entitlement_id, source_type, source_ref) do nothing;

-- Seed conservative beta policies. These are ceilings, not targets.
insert into public.ai_feature_policies (
  entitlement_id,
  feature_key,
  default_model_tier,
  fallback_model_tier,
  daily_request_limit,
  monthly_request_limit,
  monthly_cost_limit_jpy,
  deep_request_limit,
  max_input_tokens,
  max_output_tokens,
  action_on_limit,
  metadata
)
select
  e.id,
  v.feature_key,
  v.default_model_tier,
  v.fallback_model_tier,
  v.daily_request_limit,
  v.monthly_request_limit,
  v.monthly_cost_limit_jpy,
  v.deep_request_limit,
  v.max_input_tokens,
  v.max_output_tokens,
  v.action_on_limit,
  jsonb_build_object('source', 'ace_ai_business_os_v1', 'beta', true)
from public.entitlement_definitions e
cross join (
  values
    ('daily_quest', 'light', 'light', 5, 50, 300::numeric, 0, 12000, 1500, 'wait'),
    ('ai_coach', 'standard', 'light', 5, 50, 300::numeric, 0, 16000, 2000, 'fallback'),
    ('deep_coaching', 'deep', 'standard', 2, 2, 300::numeric, 2, 30000, 4000, 'human')
) as v(
  feature_key,
  default_model_tier,
  fallback_model_tier,
  daily_request_limit,
  monthly_request_limit,
  monthly_cost_limit_jpy,
  deep_request_limit,
  max_input_tokens,
  max_output_tokens,
  action_on_limit
)
where e.entitlement_key = 'winning_os_90.ai_beta_7d'
on conflict (entitlement_id, feature_key) do update set
  default_model_tier = excluded.default_model_tier,
  fallback_model_tier = excluded.fallback_model_tier,
  daily_request_limit = excluded.daily_request_limit,
  monthly_request_limit = excluded.monthly_request_limit,
  monthly_cost_limit_jpy = excluded.monthly_cost_limit_jpy,
  deep_request_limit = excluded.deep_request_limit,
  max_input_tokens = excluded.max_input_tokens,
  max_output_tokens = excluded.max_output_tokens,
  action_on_limit = excluded.action_on_limit,
  status = 'active',
  metadata = public.ai_feature_policies.metadata || excluded.metadata,
  updated_at = now();
