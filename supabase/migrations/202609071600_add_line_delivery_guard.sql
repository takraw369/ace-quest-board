create table if not exists public.line_delivery_guard (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  message_key text not null,
  delivery_date date not null,
  claimed_at timestamptz not null default now(),
  sent_at timestamptz,
  status text not null default 'claimed' check (status in ('claimed','sent','failed')),
  metadata jsonb not null default '{}'::jsonb,
  unique (contact_id, message_key, delivery_date)
);

create index if not exists idx_line_delivery_guard_contact_date
  on public.line_delivery_guard (contact_id, delivery_date desc);

alter table public.line_delivery_guard enable row level security;

comment on table public.line_delivery_guard is
  'Server-side idempotency ledger for LINE outbound messages. Service-role edge functions claim a contact/message/day tuple before push.';
