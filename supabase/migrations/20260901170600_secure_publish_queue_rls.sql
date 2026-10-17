alter table public.publish_queue enable row level security;

comment on table public.publish_queue is
  'Provider-neutral outbound content queue. Direct client access is blocked by RLS; service-role workers manage publishing.';
