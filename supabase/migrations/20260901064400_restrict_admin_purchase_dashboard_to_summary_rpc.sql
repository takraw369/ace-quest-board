drop policy if exists "admins read purchases" on public.purchases;

create or replace function public.get_admin_revenue_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'live_revenue_jpy', coalesce(sum(p.amount_jpy) filter (
        where p.status = 'paid' and p.provider <> 'stripe_test' and coalesce(p.amount_jpy, 0) > 0
      ), 0),
      'live_purchase_count', count(*) filter (
        where p.status = 'paid' and p.provider <> 'stripe_test' and coalesce(p.amount_jpy, 0) > 0
      ),
      'live_customer_count', count(distinct p.contact_id) filter (
        where p.status = 'paid' and p.provider <> 'stripe_test' and coalesce(p.amount_jpy, 0) > 0
      ),
      'latest_live_purchase_at', max(p.purchased_at) filter (
        where p.status = 'paid' and p.provider <> 'stripe_test' and coalesce(p.amount_jpy, 0) > 0
      )
    )
    from public.purchases p
  );
end;
$$;

revoke all on function public.get_admin_revenue_summary() from public;
grant execute on function public.get_admin_revenue_summary() to authenticated;
