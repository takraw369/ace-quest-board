# x-publish-worker

Publishes one approved X item from `publish_queue` and stores the provider post ID.

Adapter priority:
1. X Harness (`X_HARNESS_API_URL` + `X_HARNESS_API_KEY`)
2. direct X API (`X_USER_ACCESS_TOKEN`)

Safety:
- requires `payload.human_approved = true`
- never stores credentials in queue payload
- uses existing idempotent queue row
- writes provider response/error receipt back to Supabase
- after ambiguous failures, do not create a fresh queue row; inspect existing provider status first.