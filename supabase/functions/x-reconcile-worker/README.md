# x-reconcile-worker

Links manual X posts back to existing `publish_queue` intents so MASA does not need to paste post URLs.

Input queue row must be provider `x`/`twitter`, unresolved, and include either:
- `payload.delivery_mode = "manual"`, or
- `payload.manual_post = true`

The worker fetches recent own posts, normalizes text, applies a time window and Dice bigram similarity, and only auto-links high-confidence unambiguous matches. Otherwise it returns a human-review candidate instead of guessing.

Runtime secret: `X_USER_ACCESS_TOKEN` (or future X Harness timeline adapter).