# Question Coach: Drive Sheet → Supabase approval sync

Canonical Sheet: https://docs.google.com/spreadsheets/d/1qxKqUEzNDfug-of7sRBzC6FeCJrFSSFT6kBZtfLta5Q/edit#gid=950004

Sheet tab: QUESTION_COACH_ANSWERS, range A:Q.

## Current live state

- The first 5 questions are already published to the Supabase question_coach_answers table. The full live response is copied verbatim into the sheet.
- The next 10 are editorial DRAFTs. They are NOT published to the app until approved.
- OpenAI calls in knowledge-ask remain removed (Edge v6). Unmatched questions fall back to canonical retrieval, not an LLM.
- Current manually copied snapshot IS in sync; future edits need the secure sync bridge configured below.

## Owner review sequence

1. Inspect C:K (question, aliases, answer, improvement, Lens, deepeners, keywords, source).
2. Rewrite content as desired.
3. When the exact text is ready, set M to APPROVED and enter reviewer name in Q (e.g. MASA). Leave M as DRAFT or HOLD for anything uncertain.
4. Once an enabled sync run processes the row, it upserts into Supabase and changes L/O to the verified DB status/time; resets M to REVIEW_REQUIRED; marks N as DB_SYNCED. This prevents subsequent edits from being silently republished.
5. The website reads Supabase instantly for those approved questions; it never calls Google Sheets directly and never receives Google service credentials.

## One-time owner-managed setup (not yet enabled)

The GitHub Action is committed at .github/workflows/question-coach-sheet-sync.yml.

- Create a Google Cloud service account with Sheets API enabled and only required access. Obtain its JSON key (sensitive). Share the canonical Google Sheet with the service account email as Editor. Do not grant Drive-wide access.
- GitHub repo Settings → Secrets and variables → Actions → Secrets:
  - QC_GOOGLE_SERVICE_ACCOUNT_JSON = service account JSON (sensitive)
  - QC_SUPABASE_SERVICE_ROLE_KEY = the matching sunlovesflow-core Supabase secret key (sensitive)
- Verify the linked project URL is exactly https://qydbtholbwbuwiswmqsr.supabase.co (hard-coded cross-project write guard).
- Run GitHub Actions → Question Coach Sheet Sync → Run workflow, check dry_run=true. This requires access to the Sheet but cannot mutate either data store.
- After reviewing dry-run results, set GitHub Actions variable QC_SYNC_ENABLED to true. Schedule runs approximately every 3 hours, and manual dispatch is available. Dry-run defaults true on manual dispatch.
- No GitHub Secrets or Google service account credentials should be added to code, PR comments, Google Sheets cells, chat messages or frontend. Prefer short-lived / workload identity federation credentials in future.

## Security and failure behavior

- The public repository contains only synchronization code, not credentials.
- All rows must retain the exact header structure.
- Only M=APPROVED and Q nonempty will be processed; content is validated. A missing header, duplicate question key, unrecognized Lens, or invalid row blocks publication.
- Each DB write uses upsert by question_key and verifies the returned persisted answer before marking the Sheet synced.
- If Sheet marking fails after DB update, a later retry is idempotent.
- Google editing credentials and Supabase key are used in GitHub Actions only; no browser-exposed service-role key and no paid AI calls.
- Do not mistake this for a fully automatic live connection until secrets, spreadsheet-sharing permission, the opt-in variable, and a successful execution are confirmed.
- Reviewer approval is editorial. Factually sensitive material requires independent human source-checking.

## Technical check

Run node --test scripts/question-coach-sheet-sync.test.mjs

The question_coach_answers table has published-only SELECT RLS to authenticated users and no client writes. The service-role secret is used only in the server-side sync workflow. Never disable RLS to fix an auth error.
