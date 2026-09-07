# LINE Delivery Safety + Quest Retention

## Purpose

LINE is a re-entry layer, not the Quest runtime. Quest execution and completion stay in FLOW OS / PWA; LINE is used only when a meaningful return trigger exists.

## Delivery source of truth

- Canonical delivery state: Supabase
- Canonical person identity: `contacts` / `person_identities`
- Canonical completion signal for the current pilot: `person_progress.last_completion_date`
- Canonical outbound log: `line_message_log`
- Canonical idempotency ledger: `line_delivery_guard`

Any new server-side LINE push must claim `contact_id + message_key + delivery_date` in `line_delivery_guard` before calling the LINE Messaging API.

## Duplicate prevention

`line_delivery_guard` has a database-level unique constraint on:

`(contact_id, message_key, delivery_date)`

This prevents two controlled server-side paths from sending the same logical message to the same person on the same day.

If LINE push fails, the claim should be removed so a legitimate retry can occur.

## Quest retention pilot

Edge Function: `quest-retention-line`

Schedule: 20:10 JST daily.

Current rollout: `masa_admin` only.

Decision:

1. Resolve active LINE contact.
2. Read `person_progress.last_completion_date`.
3. If today is already complete: send nothing.
4. If not complete: claim `quest_retention_v1` for today.
5. If claim already exists: send nothing.
6. If claim succeeds: send one short return prompt and log it.

This is intentionally a pilot before broad user rollout.

## External LINE Official Account Manager

Messages sent directly from LINE Official Account Manager do not pass through Supabase and therefore cannot be deduplicated by `line_delivery_guard`.

Operational rule: scheduled / step / broadcast messages that overlap FLOW OS retention should be disabled in LINE Official Account Manager. Supabase should remain the source of truth for automated re-entry pushes.

## Rollout next

After the pilot is stable:

- expand targeting beyond `masa_admin`
- move from simple `last_completion_date` to Quest-specific due-state logic
- add cooldown / frequency-cap policies
- measure return-to-PWA and completion uplift
- keep push volume within LINE quota policy
