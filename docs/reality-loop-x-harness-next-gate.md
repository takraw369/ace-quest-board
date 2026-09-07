# One-time X auth gate

The code path is deployed, but external X access still needs one authorized credential path.

Preferred: deploy X Harness and set Supabase runtime secrets:
- X_HARNESS_API_URL
- X_HARNESS_API_KEY

Fallback: direct X API user access token with write/read scopes:
- X_USER_ACCESS_TOKEN

This is intentionally not stored in code, Drive, DB payloads, or chat. Once configured, no additional code change is required for the first publish/metrics E2E.