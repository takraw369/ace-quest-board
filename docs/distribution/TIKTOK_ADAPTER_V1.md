# TikTok Adapter v1 — T0043

## Purpose
Move one approved content item through the official TikTok Content Posting API and persist the result in `public.publish_queue`.

## State machine
`draft → approved → queued → publishing → published | failed`

`cancelled` is terminal and may be entered before `publishing`.

## Adapter input
The adapter receives a `publish_queue` row where:
- `provider = 'tiktok'`
- `status = 'queued'`
- `idempotency_key` is present
- `payload` contains the publish intent and media reference

Do not store TikTok access tokens in `payload` or the database row. Credentials belong in the runtime secret store.

## Submit contract
1. Atomically claim a `queued` row and move it to `publishing`.
2. Increment `attempt_count`.
3. Call TikTok's official Content Posting API.
4. Persist the returned provider publish identifier in `provider_publish_id`.
5. Persist normalized provider state in `provider_status`.
6. Set `next_poll_at` when asynchronous completion requires polling.

## Result contract
On success:
- `status = 'published'`
- set `published_at`
- retain provider response metadata in `provider_result`

On terminal failure:
- `status = 'failed'`
- set `failed_at`
- set `error_code` / `error_message`
- retain safe provider response metadata in `provider_result`

## Idempotency
`idempotency_key` is unique. A retry must resume the existing queue row instead of creating another publish job.

Before any retry after an ambiguous network failure, check the existing `provider_publish_id` / provider status so the same content is not posted twice.

## Approval boundary
MVP keeps a human approval boundary. Only `approved` content may transition to `queued`.

## Completion gate
T0043 MVP is complete when one non-production or explicitly approved test item reaches:
`queued → publishing → published|failed`
and Supabase contains provider id/status/timestamps/result.

## Out of scope for v1
- Browser automation
- Multi-platform fan-out
- Scheduling optimization
- Analytics ingestion beyond publish-result metadata
