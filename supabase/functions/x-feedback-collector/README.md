# x-feedback-collector

Collects post metrics after publish and writes provider-neutral snapshots into `content_metric_snapshots`.

Adapter priority:
1. X Harness (`X_HARNESS_API_URL` + `X_HARNESS_API_KEY`)
2. direct X API (`X_USER_ACCESS_TOKEN`)

The worker never publishes or replies. It only reads metrics for already-published queue rows and stores snapshots for later deterministic scoring / AI analysis.