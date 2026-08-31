create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  repo text not null default 'takraw369/masa-vault',
  branch text not null default 'main',
  path text not null,
  blob_sha text not null,
  title text not null,
  domain text,
  document_type text not null default 'knowledge',
  summary text,
  content text not null,
  source_url text not null,
  canonical boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint knowledge_documents_repo_branch_path_key unique (repo, branch, path)
);

create index knowledge_documents_domain_idx on public.knowledge_documents(domain);
create index knowledge_documents_type_idx on public.knowledge_documents(document_type);
create index knowledge_documents_updated_idx on public.knowledge_documents(updated_at desc);

alter table public.knowledge_documents enable row level security;

create policy "steward read canonical knowledge documents"
on public.knowledge_documents
for select
to authenticated
using (private.current_contribution_level() >= 4);

create policy "steward insert canonical knowledge documents"
on public.knowledge_documents
for insert
to authenticated
with check (private.current_contribution_level() >= 4);

create policy "steward update canonical knowledge documents"
on public.knowledge_documents
for update
to authenticated
using (private.current_contribution_level() >= 4)
with check (private.current_contribution_level() >= 4);

create policy "steward delete canonical knowledge documents"
on public.knowledge_documents
for delete
to authenticated
using (private.current_contribution_level() >= 4);

comment on table public.knowledge_documents is
  'Derived mirror/index of canonical Markdown. GitHub masa-vault remains source of truth.';
