# Reality Loop — X Harness Adapter

## Goal
Close the X output/feedback loop without requiring MASA to paste post URLs or reaction screenshots into ChatGPT.

`CONTENT_OS asset -> publish_queue -> X -> provider post id -> metrics/replies -> feedback_* -> Insight -> next action`

## Adopted OSS
- X Harness: `Shudesu/x-harness-oss` (MIT)
- Use it as the preferred X control plane once deployed.
- MASA OS remains source-of-truth for content assets, approval, routing, and learning.

## Adapter priority
1. `X_HARNESS_API_URL` + `X_HARNESS_API_KEY`
2. `X_USER_ACCESS_TOKEN` direct X API fallback

No secret belongs in Drive, GitHub, `publish_queue.payload`, or chat.

## Edge Functions
### `x-publish-worker`
- reads approved `publish_queue` X items
- requires `payload.human_approved = true`
- prefers X Harness `/api/posts`
- falls back to X `POST /2/tweets`
- stores `provider_publish_id`, adapter result, timestamps
- idempotency remains on the existing queue row

### `x-reconcile-worker`
For posts MASA publishes manually in the X app:
- reads unresolved manual intents from `publish_queue`
- fetches MASA's latest X posts
- matches normalized text + time window + similarity
- auto-links only above high confidence
- ambiguous matches are returned for human review instead of guessing

Manual intent payload:
```json
{
  "text": "...",
  "delivery_mode": "manual"
}
```

### `x-feedback-collector`
- reads published X queue rows
- prefers X Harness `/api/posts/:tweetId/metrics`
- falls back to direct X API
- writes provider-neutral snapshots to `content_metric_snapshots`

## Feedback schema
- `feedback_events`: comments/replies/DM/LINE/manual signals
- `content_metric_snapshots`: impressions/views/likes/replies/reposts/bookmarks/etc.
- `feedback_insights`: derived signals such as question, objection, pain, lead, phrase, confusion, anomaly

Raw/private conversation data stays in Supabase. Drive receives derived lessons/insights only.

## Human Gates
External publish/reply remains Human Gate initially.
- automatic collection: allowed
- automatic normalization/scoring: allowed
- drafts/next-action generation: allowed
- publish/reply: approval required until a narrow workflow earns auto mode

## X Harness deployment gate
X Harness itself requires one-time account infrastructure setup (Cloudflare + X account/OAuth). After deployment, set runtime secrets:
- `X_HARNESS_API_URL`
- `X_HARNESS_API_KEY`

Until then, direct X API can be used with:
- `X_USER_ACCESS_TOKEN`

## Next implementation slices
1. deploy/connect X Harness
2. E2E one approved C076 post -> Post ID receipt
3. run metrics snapshot at +1h / +24h / +72h / +7d
4. ingest replies into `feedback_events`
5. deterministic clustering -> `AI_ANALYSIS_QUEUE`
6. LLM analyzer -> `feedback_insights`
7. route Insight back to CONTENT_OS / T0048 / Agent OS

## Safety
- no browser-cookie automation on the main X account by default
- if free scraping is explored, use a separate read-only/sub account and treat it as optional fallback
- no secrets in repo/database payloads
- no duplicate publish retries after ambiguous provider failures without checking existing provider id/status
