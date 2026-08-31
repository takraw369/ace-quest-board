# My ACE Private OS

## Purpose

`/my-ace` is the authenticated decision surface for MASA's private operating system.

- Google Drive / Google Sheets remain the editable canonical source.
- Supabase remains the structured read model and relation layer.
- My ACE is the decision and execution UI, not a second source of truth.

## Admin v1

The admin-only panel reads:

- `os_sync_state` for sync health and row counts.
- `os_tasks` for NOW / NEXT / REVIEW / WAIT execution items.
- `os_current_projects` for active project progress and next actions.

Project rows may link back to their canonical Drive detail document or sheet.

## Security

Browser reads use the user's Supabase access token and publishable key. RLS policies allow reads only when the authenticated user has `user_roles.role = 'admin'`.

No Supabase secret key, service-role credential, Google service-account key, or Drive credential is exposed to the browser.

## Boundary

Do not mirror editable Drive content into the UI as a competing canonical copy. Add new dashboard sections only when the underlying source is canonical and the read model is stable enough to support it.
