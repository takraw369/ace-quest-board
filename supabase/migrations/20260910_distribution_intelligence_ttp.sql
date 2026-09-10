-- Distribution Intelligence TTP layer
-- Reuses content_publications + publish_queue + Reality Loop.
-- No parallel content/person source of truth is introduced.

alter table public.publish_queue
  add column if not exists publication_id uuid references public.content_publications(id) on delete set null,
  add column if not exists scheduled_for timestamptz,
  add column if not exists campaign_ref text,
  add column if not exists variant_ref text,
  add column if not exists cta_ref text;

create index if not exists publish_queue_publication_idx
  on public.publish_queue (publication_id);

create index if not exists publish_queue_due_schedule_idx
  on public.publish_queue (provider, status, scheduled_for, created_at);

create index if not exists publish_queue_campaign_idx
  on public.publish_queue (campaign_ref, provider, published_at desc);

comment on column public.publish_queue.publication_id is
  'Optional bridge to the existing content_publications distribution read model.';
comment on column public.publish_queue.scheduled_for is
  'Execution snapshot of intended publish time. Normally copied from content_publications.scheduled_at when a publication becomes queued.';
comment on column public.publish_queue.campaign_ref is
  'Campaign attribution key for one execution instance. Canonical campaign/content definition remains outside publish_queue.';
comment on column public.publish_queue.variant_ref is
  'Content/copy variant attribution key for learning across posts.';
comment on column public.publish_queue.cta_ref is
  'CTA / tracked-entry attribution key, e.g. LINE gate or referral route.';

-- Best-time learning from MASA's own observed results, not generic platform folklore.
-- It combines Reality Loop snapshots with manually measured content_publications rows,
-- while avoiding double-counting publications already bridged to a published queue item.
create or replace function public.get_distribution_best_times_v1(
  p_provider text default null,
  p_account_ref text default null,
  p_lookback_days integer default 90,
  p_limit integer default 12
)
returns table (
  provider text,
  account_ref text,
  iso_weekday integer,
  hour_jst integer,
  sample_count bigint,
  avg_impressions numeric,
  avg_engagements numeric,
  avg_engagement_rate numeric,
  confidence numeric
)
language sql
security definer
set search_path = public
as $$
  with latest_snapshot as (
    select distinct on (cms.publish_queue_id)
      cms.publish_queue_id,
      cms.impressions,
      cms.likes,
      cms.replies,
      cms.comments,
      cms.reposts,
      cms.shares,
      cms.bookmarks,
      cms.saves
    from public.content_metric_snapshots cms
    where cms.publish_queue_id is not null
    order by cms.publish_queue_id, cms.captured_at desc
  ), queue_observed as (
    select
      pq.provider,
      pq.account_ref,
      extract(isodow from (pq.published_at at time zone 'Asia/Tokyo'))::integer as iso_weekday,
      extract(hour from (pq.published_at at time zone 'Asia/Tokyo'))::integer as hour_jst,
      ls.impressions::numeric as impressions,
      case
        when ls.likes is null
         and ls.replies is null
         and ls.comments is null
         and ls.reposts is null
         and ls.shares is null
         and ls.bookmarks is null
         and ls.saves is null
          then null
        else coalesce(ls.likes, 0)
           + coalesce(ls.replies, 0)
           + coalesce(ls.comments, 0)
           + coalesce(ls.reposts, 0)
           + coalesce(ls.shares, 0)
           + coalesce(ls.bookmarks, 0)
           + coalesce(ls.saves, 0)
      end::numeric as engagements
    from public.publish_queue pq
    join latest_snapshot ls on ls.publish_queue_id = pq.id
    where pq.status = 'published'
      and pq.published_at is not null
      and pq.published_at >= now() - make_interval(days => greatest(7, least(coalesce(p_lookback_days, 90), 366)))
      and (p_provider is null or pq.provider = p_provider)
      and (p_account_ref is null or pq.account_ref = p_account_ref)
  ), publication_observed as (
    select
      cp.channel as provider,
      null::text as account_ref,
      extract(isodow from (cp.published_at at time zone 'Asia/Tokyo'))::integer as iso_weekday,
      extract(hour from (cp.published_at at time zone 'Asia/Tokyo'))::integer as hour_jst,
      cp.impressions::numeric as impressions,
      cp.engagements::numeric as engagements
    from public.content_publications cp
    where cp.published_at is not null
      and cp.published_at >= now() - make_interval(days => greatest(7, least(coalesce(p_lookback_days, 90), 366)))
      and (p_provider is null or cp.channel = p_provider)
      and p_account_ref is null
      and (cp.impressions is not null or cp.engagements is not null)
      and not exists (
        select 1
        from public.publish_queue pq
        where pq.publication_id = cp.id
          and pq.status = 'published'
      )
  ), observed as (
    select * from queue_observed
    union all
    select * from publication_observed
  )
  select
    o.provider,
    o.account_ref,
    o.iso_weekday,
    o.hour_jst,
    count(*) as sample_count,
    round(avg(o.impressions)::numeric, 2) as avg_impressions,
    round(avg(o.engagements)::numeric, 2) as avg_engagements,
    round(avg(
      case
        when o.impressions is not null and o.impressions > 0 and o.engagements is not null
          then o.engagements / o.impressions
        else null
      end
    )::numeric, 6) as avg_engagement_rate,
    round(least(1::numeric, count(*)::numeric / 8::numeric), 3) as confidence
  from observed o
  group by o.provider, o.account_ref, o.iso_weekday, o.hour_jst
  order by
    (count(*) >= 3) desc,
    avg(
      case
        when o.impressions is not null and o.impressions > 0 and o.engagements is not null
          then o.engagements / o.impressions
        else null
      end
    ) desc nulls last,
    avg(o.impressions) desc nulls last,
    count(*) desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;

revoke all on function public.get_distribution_best_times_v1(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_distribution_best_times_v1(text, text, integer, integer) to service_role;

comment on function public.get_distribution_best_times_v1(text, text, integer, integer) is
  'Provider-neutral best-time evidence from own published content across Reality Loop and existing content_publications. Confidence rises with observed sample count; no platform-wide guess is fabricated.';
