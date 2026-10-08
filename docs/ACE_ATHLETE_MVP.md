# ACE Athlete｜First Quest v0.1

Status: review candidate / 2026-10-08. Integration target: `ace-quest-board` (not a standalone product).

## Why
Athlete is the first ACE Biotope. The entry must be an embodied experience instead of a long-form survey. Its smallest complete loop is `State → Choice → Play → Reflection → Evidence → Next Choice`. It is not a skill-ranking test or a medical assessment.

## Where
- Route: `/athlete`, a mobile-first experiential mode of ACE.
- Entry: a single invitation from the existing Quest board home.
- Escape: `/quest-router` and `/my-ace`; do not add a permanent top-level tab.
- Existing `Vision > Milestone > Quest > Task`, `quest_catalog`, and Flow/ACE onboarding are untouched.

## v0.1 complete experience
1. **CHECK (10-second aim):** self-reported energy level 1–5 and attention state, chosen with large touch targets. These are observations, not scores.
2. **CHOOSE:** 3 micro-Quests; the first is a suggestion based on the user's own check-in, never a forced selection.
3. **PLAY:** physical-world action with an unambiguous instruction. The app is put away during practice; no fabricated timer or auto-completion.
4. **REFLECT (30-second aim):** a single selected feeling / discovery and optional one-line note (max 240 chars). No required essay.
5. **EVIDENCE:** clear completion card, local trace and next-Quest invitation.

## Local storage / privacy / contract
- `ace_athlete_sessions_v1` is an independent localStorage key; existing ACE keys and stores are not modified.
- Versioned shape: `{id, userId:null, startedAt, finishedAt, energy, focus, questId, feeling, note}`.
- Up to 40 entries, newest-first. Users can delete all with a two-step confirmation.
- No authentication or server write in v0.1. No cross-device sync; do not promise that the record appears in My ACE.
- In particular, do not store notes in analytics, post them to public social feeds, or show them to coaches without explicit consent.
- Results are **not** a personality diagnosis, a measure of athletic ability or a mental health score.

## Reuse / later gates (not implemented here)
- Use ACE Quest Router / `quest_catalog` as source of personalized options only after aligning inputs, session identity, `education_recommendations` and existing authorization boundaries.
- Map Reflection to growth events / Evidence with explicit consent and RLS after the real-person end-to-end flow is verified.
- The 3 local Quest templates are a **temporary UX seed**, not a second canonical Quest Catalog.
- Commercial matching for coaches, camps, equipment and travel is a future opt-in layer, not mixed into this initial learning flow.

## Acceptance
- Playwright iPhone-style tests at 320px verify no page-level horizontal overflow.
- First Quest can be completed without login, with local persistence after reload.
- Existing homepage and Quest Router work unchanged.
- `npm run build` and `npm run test:e2e` must pass before merge to `dev`, which automatically deploys to Cloudflare production.