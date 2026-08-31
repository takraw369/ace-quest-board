create or replace function public.complete_private_os_action(p_task_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_contact_id uuid;
  v_task public.os_tasks%rowtype;
  v_event_id bigint;
  v_existing_event_id bigint;
  v_progress public.person_progress%rowtype;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = v_user_id
      and ur.role = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select c.id
  into v_contact_id
  from public.contacts c
  where c.auth_user_id = v_user_id
  limit 1;

  if v_contact_id is null then
    raise exception 'contact_not_found' using errcode = 'P0002';
  end if;

  select *
  into v_task
  from public.os_tasks t
  where t.task_id = p_task_id
    and coalesce(t.status, '') in ('NOW', 'NEXT', 'REVIEW', 'WAIT')
  limit 1;

  if not found then
    raise exception 'task_not_found_or_inactive' using errcode = 'P0002';
  end if;

  select fe.id
  into v_existing_event_id
  from public.funnel_events fe
  where fe.contact_id = v_contact_id
    and fe.event_type = 'micro_action_completed'
    and fe.channel = 'my_ace_private_os'
    and fe.payload ->> 'task_id' = p_task_id
  order by fe.id desc
  limit 1;

  if v_existing_event_id is not null then
    select * into v_progress
    from public.person_progress pp
    where pp.contact_id = v_contact_id;

    return jsonb_build_object(
      'recorded', false,
      'already_recorded', true,
      'task_id', p_task_id,
      'event_id', v_existing_event_id,
      'xp_total', coalesce(v_progress.xp_total, 0),
      'growth_level', coalesce(v_progress.growth_level, 1),
      'growth_rank', coalesce(v_progress.growth_rank, 'seed'),
      'streak', coalesce(v_progress.streak_current, 0),
      'actions_completed', coalesce(v_progress.actions_completed, 0)
    );
  end if;

  insert into public.funnel_events(
    contact_id,
    event_type,
    channel,
    payload,
    occurred_at
  ) values (
    v_contact_id,
    'micro_action_completed',
    'my_ace_private_os',
    jsonb_build_object(
      'task_id', v_task.task_id,
      'task_title', v_task.task,
      'project', v_task.project,
      'status', v_task.status,
      'priority', v_task.priority,
      'source', 'os_tasks',
      'action', jsonb_build_object(
        'choice', coalesce(v_task.task, v_task.task_id, 'Private OS Action'),
        'domain', coalesce(v_task.project, 'private_os')
      )
    ),
    now()
  )
  returning id into v_event_id;

  select * into v_progress
  from public.person_progress pp
  where pp.contact_id = v_contact_id;

  return jsonb_build_object(
    'recorded', true,
    'already_recorded', false,
    'task_id', p_task_id,
    'event_id', v_event_id,
    'xp_awarded', 10,
    'xp_total', coalesce(v_progress.xp_total, 0),
    'growth_level', coalesce(v_progress.growth_level, 1),
    'growth_rank', coalesce(v_progress.growth_rank, 'seed'),
    'streak', coalesce(v_progress.streak_current, 0),
    'actions_completed', coalesce(v_progress.actions_completed, 0)
  );
end;
$$;

revoke all on function public.complete_private_os_action(text) from public;
grant execute on function public.complete_private_os_action(text) to authenticated;

comment on function public.complete_private_os_action(text) is
  'Admin-only My ACE bridge: record one active Private OS task as micro_action_completed. Drive remains canonical; existing funnel-event growth triggers award XP/streak/progress. Task ID is idempotent per contact.';
