alter table public.os_feedback
  add column if not exists priority text not null default 'P2',
  add column if not exists workflow_bucket text not null default 'inbox',
  add column if not exists theme text,
  add column if not exists cluster_key text,
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz;

alter table public.os_feedback drop constraint if exists os_feedback_priority_check;
alter table public.os_feedback add constraint os_feedback_priority_check
  check (priority in ('P0','P1','P2','P3'));

alter table public.os_feedback drop constraint if exists os_feedback_workflow_bucket_check;
alter table public.os_feedback add constraint os_feedback_workflow_bucket_check
  check (workflow_bucket in ('inbox','improvement','case','content','product','research'));

create index if not exists os_feedback_priority_created_idx
  on public.os_feedback (priority, created_at desc);
create index if not exists os_feedback_bucket_status_idx
  on public.os_feedback (workflow_bucket, status, created_at desc);
create index if not exists os_feedback_cluster_idx
  on public.os_feedback (cluster_key) where cluster_key is not null;

create policy "admins read voice inbox"
on public.os_feedback
for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

create policy "admins update voice inbox"
on public.os_feedback
for update
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);
