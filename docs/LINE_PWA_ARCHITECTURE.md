# LINE → FLOW OS PWA Architecture

## Principle

LINE is the acquisition, light profiling, notification, and re-entry layer.
FLOW OS PWA is the education, Quest, reflection, growth, and recommendation layer.
Supabase is the single source of truth for identity and Human Graph data.

## Responsibility split

### LINE
- Friend acquisition from SNS / ads / referrals
- Lightweight Flow Check and short surveys
- Low-friction reply interactions
- Important reminders and re-entry prompts
- Stage-aware rich menu
- Human support / consultation entry

Do not run long-form education or multi-step Quest programs primarily in LINE.
Reply messages may be used for immediate interaction, but push delivery should be reserved for meaningful re-entry triggers.

### FLOW OS PWA
- Today / Home
- Recommended Education
- Quest execution
- Experience → prediction → actual result → reflection loop
- XP / streak / Growth Rank
- Flow Map / personal state
- Learning history
- People / place / event recommendations
- Want to / Vision / Project / Quest hierarchy

### Supabase
- contacts = canonical person record
- person_identities = cross-channel identity bridge
- growth_observations = Human Graph evidence
- education_input_profiles = observed learning preference
- curriculum_states = current learning position
- education_recommendations = recommendation ledger
- person_progress / xp_ledger = growth state
- quests / quest_events = Quest history

## Identity model

### LINE capture
LINE webhook stores `contacts.line_user_id` and synchronizes it into:

`person_identities(channel='line', external_user_id=<LINE user id>)`

### LIFF / PWA entry
The browser must NOT send a claimed LINE user ID or profile object as proof of identity.

Target flow:
1. LIFF initializes.
2. Client obtains a raw LINE ID token.
3. Client sends the raw token to a Supabase Edge Function over HTTPS.
4. Edge Function verifies the token with LINE Platform and validates the expected LINE Login channel ID.
5. Verification response `sub` is treated as the LINE user ID.
6. Resolve `person_identities(channel='line', external_user_id=sub)` to the canonical `contacts.id`.
7. Establish an app session for that person.

The exact app-session mechanism will be implemented separately. Do not expose service-role credentials to the browser.

## Navigation target

Rich menu eventually maps to PWA deep links:

- NEXT STEP → `/` or `/today`
- QUEST → `/quest`
- LEARN → `/learn`
- SELF → `/me`
- PEOPLE → `/people`
- TALK → LINE consultation

Existing GameBoard remains intact during migration and can later live under `/quest/map`.

## Cost policy

- Prefer LINE reply interactions for lightweight inbound flows.
- Avoid push messages for each Quest step.
- Use push only for high-value triggers: unfinished onboarding, meaningful recommendation, event reminder, membership action, or return prompt.
- Quest execution, education, reflection, and history happen in PWA and do not consume LINE message quota.

## Rollout

### Phase A — Foundation
- PWA manifest / standalone shell
- service worker
- canonical LINE identity synchronization
- mobile-first app shell

### Phase B — Identity bridge
- LIFF entry
- server-side LINE token verification
- canonical person resolution
- secure PWA session

### Phase C — First real loop
- Today screen
- recommendation card
- Education experience flow
- Quest completion
- XP / streak update
- Human Graph writeback

### Phase D — Re-entry
- stage-aware rich menu deep links
- selective LINE reminder policy
- return-to-PWA measurement

## Non-goals for now
- Native iOS / Android app
- Heavy LINE step-delivery sequences
- Full offline Quest editing
- Rebuilding the existing Quest Board from scratch
