-- ACE Knowledge Base Camp runtime + MASA publisher bridge.
-- Drive remains the canonical file store. Supabase is the runtime index/access layer.

create table if not exists public.ace_theme_packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  one_line text not null default '',
  icon text not null default '⛰️',
  access_mode text not null default 'included' check (access_mode in ('included', 'entitlement')),
  entitlement_key text null references public.entitlement_definitions(entitlement_key) on update cascade,
  status text not null default 'preview' check (status in ('preview', 'live', 'archived')),
  sort_order integer not null default 100,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((access_mode = 'included' and entitlement_key is null) or access_mode = 'entitlement')
);

create table if not exists public.ace_learning_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('video', 'slide', 'guide', 'audio', 'worksheet', 'quest', 'reflection')),
  title text not null,
  summary text not null default '',
  asset_url text not null,
  thumbnail_url text null,
  source_system text not null,
  source_ref text not null,
  status text not null default 'draft' check (status in ('draft', 'live', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_system, source_ref)
);

create table if not exists public.ace_theme_pack_assets (
  theme_pack_id uuid not null references public.ace_theme_packs(id) on delete cascade,
  asset_id uuid not null references public.ace_learning_assets(id) on delete cascade,
  is_primary boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  primary key (theme_pack_id, asset_id)
);

create index if not exists idx_ace_theme_packs_status_sort on public.ace_theme_packs(status, sort_order);
create index if not exists idx_ace_learning_assets_status_updated on public.ace_learning_assets(status, updated_at desc);
create index if not exists idx_ace_theme_pack_assets_asset on public.ace_theme_pack_assets(asset_id);
create unique index if not exists uq_ace_asset_primary_theme on public.ace_theme_pack_assets(asset_id) where is_primary;

alter table public.ace_theme_packs enable row level security;
alter table public.ace_learning_assets enable row level security;
alter table public.ace_theme_pack_assets enable row level security;

revoke all on table public.ace_theme_packs from public, anon, authenticated;
revoke all on table public.ace_learning_assets from public, anon, authenticated;
revoke all on table public.ace_theme_pack_assets from public, anon, authenticated;
grant all on table public.ace_theme_packs to service_role;
grant all on table public.ace_learning_assets to service_role;
grant all on table public.ace_theme_pack_assets to service_role;

insert into public.entitlement_definitions(entitlement_key, name, resource_type, resource_key, metadata)
values
  ('ace.theme.food_health', 'ACE追加テーマ｜食と健康', 'ace_theme_pack', 'food-health', jsonb_build_object('source','ace_basecamp')),
  ('ace.theme.learning', 'ACE追加テーマ｜学び方', 'ace_theme_pack', 'learning', jsonb_build_object('source','ace_basecamp')),
  ('ace.theme.relationships', 'ACE追加テーマ｜人間関係', 'ace_theme_pack', 'relationships', jsonb_build_object('source','ace_basecamp')),
  ('ace.theme.ai_creation', 'ACE追加テーマ｜AIと創作', 'ace_theme_pack', 'ai-creation', jsonb_build_object('source','ace_basecamp')),
  ('ace.theme.athlete', 'ACE追加テーマ｜Athlete', 'ace_theme_pack', 'athlete', jsonb_build_object('source','ace_basecamp')),
  ('ace.theme.world_quest', 'ACE追加テーマ｜World Quest', 'ace_theme_pack', 'world-quest', jsonb_build_object('source','ace_basecamp'))
on conflict (entitlement_key) do update set
  name = excluded.name,
  resource_type = excluded.resource_type,
  resource_key = excluded.resource_key,
  status = 'active',
  metadata = public.entitlement_definitions.metadata || excluded.metadata,
  updated_at = now();

insert into public.ace_theme_packs(slug, name, one_line, icon, access_mode, entitlement_key, status, sort_order)
values
  ('flow-foundation', 'FLOW 基礎', '今の自分を知り、次の一歩を選ぶ。', '🌊', 'included', null, 'live', 10),
  ('body', 'BODY', '身体から整えて、動ける状態をつくる。', '🫀', 'included', null, 'live', 20),
  ('mind', 'MIND', '思考・感情・注意の使い方を探る。', '🧠', 'included', null, 'live', 30),
  ('food-health', '食と健康', '食べる・整える・観察する。', '🥕', 'entitlement', 'ace.theme.food_health', 'preview', 110),
  ('learning', '学び方', '好奇心から自分の学習法へ。', '🧭', 'entitlement', 'ace.theme.learning', 'preview', 120),
  ('relationships', '人間関係', '距離・対話・つながりを学ぶ。', '🤝', 'entitlement', 'ace.theme.relationships', 'preview', 130),
  ('ai-creation', 'AIと創作', 'つくる・伝える・資産にする。', '⚡', 'entitlement', 'ace.theme.ai_creation', 'preview', 140),
  ('athlete', 'Athlete', '身体知・競技・成長を深める。', '🏃', 'entitlement', 'ace.theme.athlete', 'preview', 150),
  ('world-quest', 'World Quest', '世界を見て、常識を揺らす。', '🌍', 'entitlement', 'ace.theme.world_quest', 'preview', 160)
on conflict (slug) do update set
  name = excluded.name,
  one_line = excluded.one_line,
  icon = excluded.icon,
  access_mode = excluded.access_mode,
  entitlement_key = excluded.entitlement_key,
  status = excluded.status,
  sort_order = excluded.sort_order,
  updated_at = now();

create or replace function public.ace_classify_theme_v1(
  p_title text,
  p_summary text default '',
  p_tags text[] default '{}'::text[]
)
returns table(theme_slug text, reason text)
language plpgsql
immutable
set search_path = public
as $$
declare
  v_text text := lower(concat_ws(' ', coalesce(p_title,''), coalesce(p_summary,''), array_to_string(coalesce(p_tags, '{}'::text[]), ' ')));
begin
  if v_text ~ '(薬膳|食養生|栄養|食事|食べ|発酵|腸|食材|料理|牡蠣|亜鉛|ポリフェノール)' then
    return query select 'food-health'::text, 'food_health_keyword'::text;
  elsif v_text ~ '(アスリート|athlete|競技|試合|セパタクロー|トレーニング|日本代表|選手|コーチング競技)' then
    return query select 'athlete'::text, 'athlete_keyword'::text;
  elsif v_text ~ '(chatgpt|claude|gemini|ai|人工知能|自動化|automation|プロンプト|prompt|sns|コンテンツ制作|生成ai)' then
    return query select 'ai-creation'::text, 'ai_creation_keyword'::text;
  elsif v_text ~ '(人間関係|対話|聴く|傾聴|距離感|関係性|コミュニティ|パートナー|親子|チーム関係)' then
    return query select 'relationships'::text, 'relationship_keyword'::text;
  elsif v_text ~ '(学習|学び|教育|勉強|教える|teach|learning|好奇心|教材|育成)' then
    return query select 'learning'::text, 'learning_keyword'::text;
  elsif v_text ~ '(歴史|哲学|社会|世界|文化|政治|国家|日本再興|文明|宗教)' then
    return query select 'world-quest'::text, 'world_quest_keyword'::text;
  elsif v_text ~ '(身体|からだ|呼吸|姿勢|睡眠|痛み|筋肉|ストレッチ|足|関節|運動|コンディショニング)' then
    return query select 'body'::text, 'body_keyword'::text;
  elsif v_text ~ '(心|感情|思考|注意|メンタル|脳|自信|認知|マインド|心理)' then
    return query select 'mind'::text, 'mind_keyword'::text;
  else
    return query select 'flow-foundation'::text, 'default_flow_foundation'::text;
  end if;
end;
$$;

create or replace function public.ace_basecamp_catalog_v1()
returns table(
  slug text,
  name text,
  one_line text,
  icon text,
  access_mode text,
  status text,
  has_access boolean,
  asset_count bigint,
  preview_assets jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_contact_id uuid;
begin
  select c.id into v_contact_id
  from public.contacts c
  where c.auth_user_id = auth.uid()
  limit 1;

  return query
  select
    p.slug,
    p.name,
    p.one_line,
    p.icon,
    p.access_mode,
    p.status,
    case
      when auth.uid() is null then false
      when p.access_mode = 'included' then true
      else exists (
        select 1
        from public.entitlement_definitions e
        join public.person_entitlements pe on pe.entitlement_id = e.id
        where e.entitlement_key = p.entitlement_key
          and pe.contact_id = v_contact_id
          and pe.status = 'active'
          and (pe.expires_at is null or pe.expires_at > now())
      )
    end as has_access,
    count(a.id) filter (where a.status = 'live') as asset_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', a.id, 'type', a.asset_type, 'title', a.title, 'summary', a.summary)
        order by l.sort_order, a.updated_at desc
      ) filter (where a.status = 'live'),
      '[]'::jsonb
    ) as preview_assets
  from public.ace_theme_packs p
  left join public.ace_theme_pack_assets l on l.theme_pack_id = p.id
  left join public.ace_learning_assets a on a.id = l.asset_id
  where p.status <> 'archived'
  group by p.id
  order by p.sort_order, p.name;
end;
$$;

create or replace function public.ace_theme_assets_v1(p_theme_slug text)
returns table(
  id uuid,
  asset_type text,
  title text,
  summary text,
  asset_url text,
  thumbnail_url text,
  metadata jsonb,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pack public.ace_theme_packs%rowtype;
  v_contact_id uuid;
  v_allowed boolean := false;
begin
  select * into v_pack from public.ace_theme_packs where slug = p_theme_slug and status <> 'archived';
  if v_pack.id is null then raise exception 'theme_not_found'; end if;
  if auth.uid() is null then raise exception 'login_required'; end if;

  if v_pack.access_mode = 'included' then
    v_allowed := true;
  else
    select c.id into v_contact_id from public.contacts c where c.auth_user_id = auth.uid() limit 1;
    select exists (
      select 1
      from public.entitlement_definitions e
      join public.person_entitlements pe on pe.entitlement_id = e.id
      where e.entitlement_key = v_pack.entitlement_key
        and pe.contact_id = v_contact_id
        and pe.status = 'active'
        and (pe.expires_at is null or pe.expires_at > now())
    ) into v_allowed;
  end if;

  if not v_allowed then raise exception 'theme_locked'; end if;

  return query
  select a.id, a.asset_type, a.title, a.summary, a.asset_url, a.thumbnail_url, a.metadata, a.updated_at
  from public.ace_theme_pack_assets l
  join public.ace_learning_assets a on a.id = l.asset_id
  where l.theme_pack_id = v_pack.id
    and a.status = 'live'
  order by l.sort_order, a.updated_at desc;
end;
$$;

create or replace function public.masa_ace_asset_upsert_v1(
  p_owner_key text,
  p_title text,
  p_summary text,
  p_asset_type text,
  p_asset_url text,
  p_thumbnail_url text,
  p_source_system text,
  p_source_ref text,
  p_theme_slug text,
  p_status text,
  p_tags text[],
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_asset_id uuid;
  v_theme_slug text;
  v_reason text;
  v_theme_id uuid;
begin
  if p_owner_key is null or p_owner_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_owner_key'; end if;
  if not exists (select 1 from private.masa_dashboard_owner_keys k where k.owner_key = p_owner_key) then
    raise exception 'dashboard_owner_required';
  end if;
  if coalesce(btrim(p_title),'') = '' or char_length(p_title) > 240 then raise exception 'invalid_title'; end if;
  if char_length(coalesce(p_summary,'')) > 4000 then raise exception 'invalid_summary'; end if;
  if p_asset_type not in ('video','slide','guide','audio','worksheet','quest','reflection') then raise exception 'invalid_asset_type'; end if;
  if coalesce(btrim(p_asset_url),'') !~ '^https://[^[:space:]]+$' then raise exception 'invalid_asset_url'; end if;
  if p_thumbnail_url is not null and btrim(p_thumbnail_url) <> '' and btrim(p_thumbnail_url) !~ '^https://[^[:space:]]+$' then raise exception 'invalid_thumbnail_url'; end if;
  if coalesce(btrim(p_source_system),'') = '' or char_length(p_source_system) > 80 then raise exception 'invalid_source_system'; end if;
  if coalesce(btrim(p_source_ref),'') = '' or char_length(p_source_ref) > 500 then raise exception 'invalid_source_ref'; end if;
  if p_status not in ('draft','live','archived') then raise exception 'invalid_status'; end if;
  if coalesce(array_length(p_tags,1),0) > 30 then raise exception 'too_many_tags'; end if;

  if nullif(btrim(coalesce(p_theme_slug,'')), '') is null then
    select c.theme_slug, c.reason into v_theme_slug, v_reason
    from public.ace_classify_theme_v1(p_title, p_summary, coalesce(p_tags,'{}'::text[])) c
    limit 1;
  else
    v_theme_slug := btrim(p_theme_slug);
    v_reason := 'operator_override';
  end if;

  select p.id into v_theme_id from public.ace_theme_packs p where p.slug = v_theme_slug and p.status <> 'archived';
  if v_theme_id is null then raise exception 'invalid_theme'; end if;

  insert into public.ace_learning_assets(
    asset_type, title, summary, asset_url, thumbnail_url, source_system, source_ref, status, metadata, updated_at
  ) values (
    p_asset_type,
    btrim(p_title),
    left(coalesce(p_summary,''),4000),
    btrim(p_asset_url),
    nullif(btrim(coalesce(p_thumbnail_url,'')),''),
    btrim(p_source_system),
    btrim(p_source_ref),
    p_status,
    coalesce(p_metadata,'{}'::jsonb) || jsonb_build_object('tags',coalesce(p_tags,'{}'::text[]),'classification_reason',v_reason,'registered_by','masa_asset_pipeline'),
    now()
  )
  on conflict (source_system, source_ref) do update set
    asset_type = excluded.asset_type,
    title = excluded.title,
    summary = excluded.summary,
    asset_url = excluded.asset_url,
    thumbnail_url = excluded.thumbnail_url,
    status = excluded.status,
    metadata = public.ace_learning_assets.metadata || excluded.metadata,
    updated_at = now()
  returning id into v_asset_id;

  delete from public.ace_theme_pack_assets where asset_id = v_asset_id and is_primary;
  insert into public.ace_theme_pack_assets(theme_pack_id, asset_id, is_primary, sort_order)
  values (v_theme_id, v_asset_id, true, 100)
  on conflict (theme_pack_id, asset_id) do update set is_primary = true;

  return jsonb_build_object(
    'asset_id', v_asset_id,
    'theme_slug', v_theme_slug,
    'classification_reason', v_reason,
    'status', p_status
  );
end;
$$;

create or replace function public.masa_ace_asset_list_v1(p_owner_key text, p_limit integer default 30)
returns table(
  id uuid,
  theme_slug text,
  theme_name text,
  asset_type text,
  title text,
  summary text,
  asset_url text,
  source_system text,
  source_ref text,
  status text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if p_owner_key is null or p_owner_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_owner_key'; end if;
  if not exists (select 1 from private.masa_dashboard_owner_keys k where k.owner_key = p_owner_key) then
    raise exception 'dashboard_owner_required';
  end if;

  return query
  select a.id, p.slug, p.name, a.asset_type, a.title, a.summary, a.asset_url, a.source_system, a.source_ref, a.status, a.updated_at
  from public.ace_learning_assets a
  left join public.ace_theme_pack_assets l on l.asset_id = a.id and l.is_primary
  left join public.ace_theme_packs p on p.id = l.theme_pack_id
  order by a.updated_at desc
  limit greatest(1, least(coalesce(p_limit,30), 100));
end;
$$;

revoke all on function public.ace_classify_theme_v1(text,text,text[]) from public;
revoke all on function public.ace_basecamp_catalog_v1() from public;
revoke all on function public.ace_theme_assets_v1(text) from public;
revoke all on function public.masa_ace_asset_upsert_v1(text,text,text,text,text,text,text,text,text,text,text[],jsonb) from public;
revoke all on function public.masa_ace_asset_list_v1(text,integer) from public;

grant execute on function public.ace_classify_theme_v1(text,text,text[]) to anon, authenticated, service_role;
grant execute on function public.ace_basecamp_catalog_v1() to anon, authenticated, service_role;
grant execute on function public.ace_theme_assets_v1(text) to authenticated, service_role;
grant execute on function public.masa_ace_asset_upsert_v1(text,text,text,text,text,text,text,text,text,text,text[],jsonb) to anon, authenticated, service_role;
grant execute on function public.masa_ace_asset_list_v1(text,integer) to anon, authenticated, service_role;
