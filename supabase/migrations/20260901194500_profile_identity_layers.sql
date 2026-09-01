alter table public.profiles
  add column if not exists nickname text,
  add column if not exists professional_name text,
  add column if not exists teacher_name_public boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_nickname_length_check;
alter table public.profiles
  add constraint profiles_nickname_length_check
  check (nickname is null or char_length(nickname) between 1 and 40);

alter table public.profiles
  drop constraint if exists profiles_professional_name_length_check;
alter table public.profiles
  add constraint profiles_professional_name_length_check
  check (professional_name is null or char_length(professional_name) between 1 and 80);

alter table public.contacts
  add column if not exists legal_name text,
  add column if not exists legal_name_verified_at timestamptz;

comment on column public.profiles.nickname is 'User-chosen everyday display name. Never auto-filled from OAuth provider name.';
comment on column public.profiles.professional_name is 'Explicit professional/teacher public name. May be real name, stage name, or other professional name.';
comment on column public.profiles.teacher_name_public is 'Explicit opt-in to use professional_name on teacher/coach public surfaces.';
comment on column public.contacts.legal_name is 'Private operator identity field. Never use as a public display name automatically.';
comment on column public.contacts.legal_name_verified_at is 'When the operator verified the private legal_name.';
