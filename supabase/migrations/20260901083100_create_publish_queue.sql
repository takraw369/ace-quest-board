create table if not exists public.publish_queue (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  provider text not null,
  account_ref text,
  content_type text not null default 'video',
  source_ref text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','queued','publishing','published','failed','cancelled')),
  provider_publish_id text,
  provider_status text,
  provider_result jsonb,
  error_code text,
  error_message text,
  attempt_count integer not null default 0,
  approved_at timestamptz,
  queued_at timestamptz,
  publishing_at timestamptz,
  published_at timestamptz,
  failed_at timestamptz,
  next_poll_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists publish_queue_status_next_poll_idx
  on public.publish_queue (status, next_poll_at);

create index if not exists publish_queue_provider_publish_id_idx
  on public.publish_queue (provider, provider_publish_id);

comment on table public.publish_queue is
  'Provider-neutral outbound content queue. TikTok official Content Posting API is adapter v1.';

comment on column public.publish_queue.idempotency_key is
  'Stable caller-generated key preventing duplicate publish jobs.';

comment on column public.publish_queue.payload is
  'Provider-neutral publish intent plus adapter-specific fields; never store access tokens here.';
