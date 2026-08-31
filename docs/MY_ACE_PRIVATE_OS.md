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

## Command Center v2

The top of `/my-ace` is a daily decision layer rather than a data catalog.

It answers five questions first:

1. **FIRST MOVE** — which current TASK_BOARD item should move first today.
2. **DEADLINE 7D** — how many active tasks are due in the next seven days, plus overdue hygiene debt.
3. **LIVE REVENUE** — paid production revenue and customers, excluding Stripe test payments.
4. **FOCUS PROJECT** — surface the S-priority ACTIVE project only when the source makes the focus unambiguous. If multiple S/ACTIVE projects compete, show `Focus未指定` rather than inventing a priority in the UI.
5. **SYSTEM** — whether Drive → Supabase sync is healthy or needs attention.

Canonical navigation remains one tap away. Sync cards and quick links open Calendar / TASK_BOARD / Projects / Content / Want to at their source for editing.

Calendar remains canonical externally for now; do not introduce a second calendar store until a stable calendar read model is intentionally added.

## Security

Browser reads use the user's Supabase access token and publishable key. RLS policies allow private OS reads only when the authenticated user has `user_roles.role = 'admin'`.

Revenue is returned through the admin-gated `get_admin_revenue_summary()` RPC. Purchase-detail SELECT access is not granted to the dashboard; the browser receives only aggregate revenue, purchase count, customer count, and latest live purchase time.

No Supabase secret key, service-role credential, Google service-account key, or Drive credential is exposed to the browser.

## Boundary

Do not mirror editable Drive content into the UI as a competing canonical copy. Add new dashboard sections only when the underlying source is canonical and the read model is stable enough to support it.

Do not count test payments as live revenue. Do not treat stale due dates as silently valid; surface them as overdue hygiene debt so the TASK_BOARD can be corrected at the source.
