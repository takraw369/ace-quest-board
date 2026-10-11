# Question Coach MVP — Ask Knowledge Extension

Status: Draft / Human Gate pending (2026-10-11)
Repository: takraw369/ace-quest-board
Working branch: feat/question-coach-mvp-20261011
Owner route: /knowledge/ask (no standalone app)

## Purpose

Question → Answer → (only when valuable) better question → thinking lens → deeper questions → optional save → reusable CORE QUEST asset.

The original answer remains primary. This extends ACE / FLOW OS Knowledge, consistent with docs/CANONICAL_APP_MAP.md.

## Canonical sources

- Google Drive CORE QUEST MASTER BANK is the curated question master.
- QUESTION_COACH_RULES is the policy; THINKING_LENSES contains 14 lenses.
- QUESTION_REFINERY is the intake/review; QUESTION_BANK is approved reusable material.
- Existing Supabase knowledge_documents is the factual knowledge retrieval source.
- Phase 1 personal history lives only in localStorage, scoped by logged-in user ID. Up to 50 entries per browser user; no Drive/Supabase synchronization yet.

## Implemented in feature branch

1. Existing authenticated Knowledge Ask continues to produce an answer.
2. Opt-in request flag question_coach:true returns an OpenAI structured coaching object without breaking existing unflagged clients.
3. Show a single improved question, rationale, lens, and zero to three deepening questions only when useful.
4. Do not show fake AI improvements during retrieval-only fallback.
5. Allow repeating a better/deeper question via the existing Ask endpoint.
6. Explicit local save and personal history with lens-use counts; counts are not ability/IQ scores.
7. Provide formula-escaped 15-column TSV copy for manual insertion into QUESTION_REFINERY, with direct link to the master.
8. Keep the existing static export and Cloudflare Workers Static Assets architecture.

## Safety boundaries

- OpenAI secret is never exposed in browser code.
- Private knowledge remains subject to the existing authentication and RLS boundaries.
- No automatic Drive writes or public sharing.
- No additional user identity master or new top-level navigation item.
- Sensitive questions are saved only after the user clicks the local save control.
- Browser local history is not encrypted or cross-device; use cautiously with sensitive information.

## Verification / Human Gate

1. GitHub PR build workflow must run npm ci, npm run build, and npm run test:e2e.
2. Manually verify the /knowledge/ask experience in AI and retrieval modes, simple and complex questions, deepeners, ask again, save, same-user reload, different-user isolation, copy/paste to the master.
3. Deploying Supabase Edge Function knowledge-ask is a separate operator action. Merging frontend code alone does not deploy the modified Edge code.
4. The dev branch deploys automatically to Cloudflare production; keep this work in the feature branch and do not merge without human review.
5. Confirm preview and production state from actual deployment results, not by assumption.

## Next phase (not built yet)

- RLS-protected Supabase per-user sync, after reviewing the existing schema.
- Secure Drive append/deduplication workflow with explicit delegated authorization and curation.
- Approved promotion to QUESTION_BANK with traceability.
- Richer Thinking Map and Quest recommendations grounded in observed behavior.
