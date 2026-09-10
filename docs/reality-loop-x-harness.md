# Reality Loop — X Harness Adapter

## Goal
Close the output/feedback/revenue loop without requiring MASA to paste post URLs or reaction screenshots into ChatGPT.

`CONTENT_OS asset -> content_publications -> publish_queue -> provider -> post id -> metrics/feedback -> business outcome -> next action`

The X adapter is one channel inside this provider-neutral flow. Metricool is optional and is not a source of truth.

## Canonical layers
- Content asset / reusable knowledge: `CONTENT_OS` / `os_content_items`
- Distribution plan + business outcome read model: existing `content_publications`
- Provider execution / idempotency: existing `publish_queue`
- Raw observed metrics: existing `content_metric_snapshots`
- Reactions / comments / external signals: existing `feedback_events`
- Derived learning: existing `feedback_insights`
- Canonical architecture / decisions: Google Drive

No duplicate content library, publication table, person source-of-truth, or parallel social OS is introduced.

## Adopted OSS
- X Harness: `Shudesu/x-harness-oss` (MIT)
- MASA integration is verified against the pinned upstream contract used by the Harness Suite.
- MASA OS remains source-of-truth for content assets, approval, routing, and learning.

## Adapter priority
1. `X_HARNESS_API_URL` + `X_HARNESS_API_KEY`
2. `X_USER_ACCESS_TOKEN` direct X API fallback

Optional runtime config:
- `X_HARNESS_ACCOUNT_ID`: explicit Harness account selection. If omitted, workers resolve the first active account from `GET /api/x-accounts`.

No secret belongs in Drive, GitHub, `publish_queue.payload`, or chat.

## Verified X Harness HTTP contract
The pinned X Harness API requires an `xAccountId` for publishing.

- account discovery: `GET /api/x-accounts`
- publish: `POST /api/posts` with `{ xAccountId, text, ... }`
- recent owned posts + `public_metrics`: `GET /api/posts/history?xAccountId=...&limit=100`

Do not assume a per-post `/api/posts/:tweetId/metrics` endpoint unless the pinned upstream adds one and the adapter is revalidated.

## Edge Functions
### `x-publish-worker`
- reads approved `publish_queue` X items
- requires `payload.human_approved = true`
- resolves a Harness account before `POST /api/posts`
- falls back to X `POST /2/tweets` when a direct token is configured
- stores `provider_publish_id`, adapter result, timestamps
- idempotency remains on the existing queue row
- honors provider-neutral `scheduled_for`; a queued item cannot be published before its intended time
- if bridged by `publication_id`, syncs successful publication back to `content_publications`
- a publication-read-model sync warning never causes a second provider post after the provider already accepted the first one

### `tiktok-publish-worker`
- uses the same `scheduled_for` execution rule
- preserves TikTok's creator-consent and provider-status flow
- if bridged by `publication_id`, syncs terminal provider success back to `content_publications`

### `x-reconcile-worker`
For posts MASA publishes manually in the X app:
- reads unresolved manual intents from `publish_queue`
- prefers Harness `GET /api/posts/history`
- falls back to direct X timeline retrieval
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
- prefers Harness `GET /api/posts/history` and extracts the target post's `public_metrics`
- falls back to direct X API
- writes provider-neutral snapshots to `content_metric_snapshots`
- preserves unavailable metrics as `null`; missing data is not converted to zero
- labels snapshots by measurement window in `raw_metrics.window`
- deduplicates each measurement window per queue row
- if `publication_id` exists, syncs known cumulative impressions / engagements / clicks to `content_publications`, preserving unknown values and downstream LINE/purchase/revenue outcomes

Automatic due windows:
- `1h`: collect from +1h to before +6h
- `24h`: collect from +24h to before +48h
- `72h`: collect from +72h to before +96h
- `7d`: collect from +168h to before +192h

A targeted/manual invocation may request `window=1h|24h|72h|7d|manual`. `force=true` is reserved for explicit recovery/retest, not normal scheduled collection.

### `distribution-intelligence`
Provider-neutral internal control/read layer over the same existing models. It does not publish content.

Actions:
- `planner`: returns both the existing `content_publications` plan and the `publish_queue` execution state
- `stage_publication`: bridges a `ready` / `scheduled` publication into a `draft` queue item with `human_approved=false`; it cannot bypass the Human Gate
- `best_times`: best posting slots learned from MASA's own observed performance across Reality Loop and manually measured publications
- `report`: channel/provider/campaign performance plus LINE registrations, purchases, revenue and recycle decisions
- `inbox`: normalized feedback events without exposing raw provider payloads
- `ingest_signal`: deduped adapter/manual/benchmark signal ingestion; optional structured insight routes back to CONTENT_OS
- `overview`: planner + best times + report + inbox in one internal call

## Feedback schema
- `feedback_events`: comments/replies/DM/LINE/manual signals
- `content_metric_snapshots`: impressions/views/likes/replies/reposts/bookmarks/etc. over time
- `feedback_insights`: derived signals such as question, objection, pain, lead, phrase, confusion, anomaly, or performance movement

Raw/private conversation data stays in Supabase. Drive receives derived lessons/insights only.

## Metricool TTP -> MASA Distribution Intelligence
This is feature-pattern transfer, not a clone and not a dependency on Metricool's paid X connection.

- Visual planner / calendar -> existing `content_publications.scheduled_at` as the planning read model; `publish_queue.scheduled_for` is the execution snapshot.
- Cross-network publishing -> one provider-neutral queue; X, TikTok, Instagram, Threads, YouTube etc. remain adapters rather than separate OSs.
- Best time to post -> `get_distribution_best_times_v1`; learns only from MASA's own observed results and exposes sample count/confidence instead of inventing certainty.
- Unified analytics / reporting -> `content_publications` business outcomes + `content_metric_snapshots` operational measurements + `distribution-intelligence:report`.
- Inbox / reactions -> existing `feedback_events` + `distribution-intelligence:inbox/ingest_signal`.
- Campaign tracking -> `campaign_ref`; copy/content test tracking -> `variant_ref`; CTA/entry tracking -> `cta_ref`.
- Content library / reuse -> CONTENT_OS remains canonical. `asset_id` / `source_ref` links every distribution instance back to the reusable asset; no second content library is created.
- Recycle / evergreen -> existing `content_publications.recycle_decision` (`reuse` / `iterate` / `retire`) feeds the next content action.
- SmartLinks / link-in-bio -> reuse LINE Harness `/r/{ref}`, gates, forms and tracked CTA routes; no duplicate smart-link product.
- Conversion attribution -> existing `content_publications.line_registrations`, `purchases`, `revenue_yen` extend beyond social vanity metrics to actual business outcome.
- Automated lists / flows -> schedule and queue state machine are the common execution primitive. New automation must route through approval/idempotency rather than bypass them.
- Competitor/benchmark observation -> ingest permitted public/manual observations as `competitor_observation` signals; do not build brittle cookie scraping.
- Team/client approval -> current MASA mode keeps one Human Gate. Add multi-reviewer semantics only when a real team workflow requires it.
- AI writing assistant -> reuse CONTENT_OS / ChatGPT intelligence; do not add a second AI copy generator inside Distribution.
- Drive/asset integration -> Google Drive remains canonical knowledge/asset storage; Distribution stores refs/results, not duplicate files.

### Execution bridge fields
`publish_queue` carries optional:
- `publication_id`
- `scheduled_for`
- `campaign_ref`
- `variant_ref`
- `cta_ref`

These fields describe one distribution execution instance. They do not replace canonical content/publication definitions.

## Human Gates
External publish/reply remains Human Gate initially.
- automatic collection: allowed
- automatic normalization/scoring: allowed
- drafts/next-action generation: allowed
- staging into execution queue: allowed, but staged as unapproved draft
- publish/reply: approval required until a narrow workflow earns auto mode

## X connection policy after Metricool TTP
Metricool's X connector is optional. The MASA core must still work without it.

For X execution, available adapters remain:
1. X Harness when deployed/authenticated
2. direct official X API when explicitly configured
3. manual publish + reconciliation when provider read access is available

Planner, attribution, CONTENT_OS routing and non-X channel learning must not be blocked by an X adapter decision.

## X Harness deployment gate
X Harness itself still requires one-time account infrastructure/auth setup. After deployment, set Supabase runtime secrets/config without exposing them to chat/Drive/GitHub:
- `X_HARNESS_API_URL`
- `X_HARNESS_API_KEY`
- optionally `X_HARNESS_ACCOUNT_ID`

Direct X can alternatively use:
- `X_USER_ACCESS_TOKEN`

## E2E acceptance path
1. create/choose a `content_publications` row linked to the canonical CONTENT_OS asset
2. stage it to `publish_queue`; Human Gate approves it
3. connect/auth one permitted provider adapter without exposing credentials
4. worker publishes at/after `scheduled_for` and persists provider post ID, or manual publish is reconciled automatically
5. `content_publications` receives published state
6. metrics collector records due snapshots and updates known publication metrics
7. LINE registrations / purchases / revenue remain on the same publication outcome row
8. derived feedback routes learning back to CONTENT_OS
9. after enough observed posts, `best_times` becomes evidence-based scheduling input
10. `reuse` / `iterate` / `retire` closes the content recycle loop

## Safety
- no browser-cookie automation on the main X account by default
- no secrets in repo/database payloads/Drive/chat
- no duplicate publish retry after an ambiguous provider failure without first checking existing provider ID/status
- do not treat untracked metrics as numeric zero
- do not overwrite LINE/purchase/revenue outcomes when refreshing social metrics
- do not rewrite or publish content merely because a metrics collection job ran
- Distribution Intelligence cannot bypass the Human Gate to publish