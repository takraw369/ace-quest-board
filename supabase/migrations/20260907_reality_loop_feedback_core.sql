create table if not exists public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  publish_queue_id uuid references public.publish_queue(id) on delete set null,
  source_ref text,
  provider text not null,
  provider_post_id text,
  provider_event_id text,
  event_type text not null,
  text text,
  actor_ref text,
  occurred_at timestamptz,
  ingested_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'new'
);
create index if not exists feedback_events_publish_queue_idx on public.feedback_events(publish_queue_id, ingested_at desc);
create index if not exists feedback_events_provider_post_idx on public.feedback_events(provider, provider_post_id, ingested_at desc);
create index if not exists feedback_events_status_idx on public.feedback_events(status, ingested_at);

create table if not exists public.content_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  publish_queue_id uuid references public.publish_queue(id) on delete set null,
  source_ref text,
  provider text not null,
  provider_post_id text not null,
  captured_at timestamptz not null default now(),
  impressions bigint,
  views bigint,
  likes bigint,
  replies bigint,
  comments bigint,
  reposts bigint,
  shares bigint,
  bookmarks bigint,
  saves bigint,
  clicks bigint,
  raw_metrics jsonb not null default '{}'::jsonb
);
create index if not exists content_metric_snapshots_post_idx on public.content_metric_snapshots(provider, provider_post_id, captured_at desc);
create index if not exists content_metric_snapshots_queue_idx on public.content_metric_snapshots(publish_queue_id, captured_at desc);

create table if not exists public.feedback_insights (
  id uuid primary key default gen_random_uuid(),
  feedback_event_id uuid references public.feedback_events(id) on delete set null,
  publish_queue_id uuid references public.publish_queue(id) on delete set null,
  source_ref text,
  provider text,
  signal_type text not null,
  topic text,
  summary text not null,
  confidence numeric(4,3),
  impact_score numeric(6,3),
  recommended_route text,
  analysis_model text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_insights_queue_idx on public.feedback_insights(publish_queue_id, created_at desc);
create index if not exists feedback_insights_source_idx on public.feedback_insights(source_ref, created_at desc);

alter table public.feedback_events enable row level security;
alter table public.content_metric_snapshots enable row level security;
alter table public.feedback_insights enable row level security;

comment on table public.feedback_events is 'Reality Loop normalized inbound reactions and conversations. Raw/private payload stays in DB; canonical Drive receives derived insights only.';
comment on table public.content_metric_snapshots is 'Provider-neutral snapshots for post/content performance over time.';
comment on table public.feedback_insights is 'Derived feedback signals routed back to content, product, lesson, or human review.';