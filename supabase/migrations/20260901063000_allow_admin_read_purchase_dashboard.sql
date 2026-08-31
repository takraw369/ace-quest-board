drop policy if exists "admins read purchases" on public.purchases;

create policy "admins read purchases"
on public.purchases
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);
