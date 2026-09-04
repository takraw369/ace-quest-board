# Canonical App Map

Updated: 2026-09-04

This document is the canonical URL / page registry for MASA public surfaces and ACE / FLOW OS.
The goal is to prevent URL sprawl, duplicate dashboards, and features becoming standalone apps without a real reason.

## 1. MASA media registry

### Primary / daily-use surfaces

| Surface | URL | Current role | Operating rule |
| --- | --- | --- | --- |
| MASA Official | `https://masahiro-yamada.com` | MASA individual canonical: thought, results, profile, credibility, contact | Public |
| MASA Control Plane | `https://masahiro-yamada.com/dashboard` | Business / Quest / Schedule / Funnel / finance operator view | Private operator use |
| Sun Loves Flow | `https://sunlovesflow.com` | Brand, products, Flow Check, LINE, purchase / conversion | Public |
| ACE current technical fallback | `https://ace-quest-board.takraw501.workers.dev` | Current live ACE / PWA / Push / Quest real-device surface | Use now for technical verification |
| ACE intended production | `https://ace.sunlovesflow.com` | Final user-facing ACE URL after Cloudflare custom-domain cutover verification | Do not retire fallback until verified |
| MASA OS | `https://masa-os-dashboard.pages.dev` | Separate private OS / dashboard | Compare with Control Plane until ownership is consolidated |

### Technical / fallback surfaces

| Surface | URL | Rule |
| --- | --- | --- |
| SLF Cloudflare preview | `https://sunlovesflow-hq.pages.dev` | Development / fallback only; not a public canonical |
| Netlify ACE surfaces | legacy | Retired. Do not restore or create new Netlify deploys |

Tracking parameters such as `utm_source=chatgpt.com` are never part of a canonical URL.

## 2. ACE product model

ACE is one user-facing app. The main experience is not a menu of features; it is a loop:

`困 → 知 → 望 → Router → 行 → 振り返り → 知恵 → 次の行`

- **困**: start from the user's real problem / question.
- **知**: understand meaning, concepts, and relevant knowledge.
- **望**: clarify direction and what the person actually wants.
- **Quest Router**: combine current context, ACE / FLOW state, and Quest Catalog to narrow the next experiment to at most three candidates.
- **行**: execute one Quest through Predict → Do → Actual → Reflection.
- **My ACE**: accumulate evidence, patterns, growth, and personal operating knowledge.

### Navigation rule

The user should not see every internal page in the primary navigation.
Primary navigation should stay close to:

- 困
- 知
- 望
- 行
- 私 / My ACE

`Today` may be the launch / daily home. `Quest Router` is an orchestration step, not a permanent top-level tab.

`Quest Catalog` is a backend canonical library, not a default browse page. Raw catalog browsing is an operator / research need; normal users should receive routed candidates instead of choosing among dozens of templates.

## 3. Existing user-facing routes

| Priority | Route | Experience owner | Status / rule |
| --- | --- | --- | --- |
| P0 | `/dictionary` | 困 | Exists. Problem-first entry point |
| P0 | `/knowledge/today` | 知 / Today | Exists. Daily knowledge surface |
| P0 | `/knowledge` | 知 / Library | Exists. Connected knowledge library |
| P0 | `/knowledge/ask` | 知 / Ask | Exists. Ask from current curiosity / problem |
| P0 | `/want-to` | 望 | Exists. Want to, direction, priorities, achievement logs |
| P0 | `/quest-router` | Router | New v0. Catalog → current person / context → max 3 candidates |
| P0 | `/` | 行 / Board | Exists. Vision → Milestone → Quest → Task board |
| P0 | `/quest` | 行 / execution | Exists. Personalized Predict → Do → Actual → Reflection flow |
| P0 | `/today` | Daily home | Exists. Growth state + personalized recommendations |
| P0 | `/calibration` | Current state | Exists. ACE BODY / COGNITION / EMOTION / ACTION calibration |
| P0 | `/my-ace` | 私 / Personal OS | Exists. Personal ACE view; becomes the owner of history / evidence / inventory |
| P0 | `/profile` | Identity | Exists. User identity / profile |
| P0 | `/login` | Auth | Exists |
| P0 | `/connect/line` | Identity / session connection | Exists. LINE → PWA identity bootstrap |
| P1 | `/learn` | Deepening | Exists. Quest-linked deeper content |
| P1 | `/people` | Connection | Exists. People / place recommendations |
| P1 | `/scout` | Discovery | Exists. Clarify whether this remains separate or is absorbed into Router / People |
| Internal / review | `/daily-harness` | Daily experiment harness | Exists. Do not promote to main nav until its unique user job is proven |
| Internal / compatibility | `/me` | Legacy / personal surface | Exists. Prefer My ACE as canonical personal owner unless a distinct job remains |
| Internal / operator | `/my-ace/voice` | Voice inbox | Exists. Keep private / operator-only unless deliberately productized |

## 4. Missing P0 capabilities before broad ACE release

These are mandatory capabilities. A new URL is created only when the job cannot cleanly live in an existing owner page.

### A. Onboarding

Preferred route: `/onboarding`

Must cover:
- what ACE / FLOW OS does;
- consent / basic privacy explanation;
- user stage / age-band needed for safe routing;
- LINE / session connection;
- first Calibration;
- first routed Quest.

This becomes important when ACE is opened beyond MASA's own test use.

### B. Settings / notifications / data control

Preferred route: `/settings`

Must cover:
- Push on / off and permission state;
- sound / haptics preference when feedback effects are enabled;
- LINE connection state;
- account / session state;
- privacy / data export / delete-account path;
- accessibility preferences as needed.

### C. Quest history / evidence

Do **not** create a separate app.
Preferred owner: `/my-ace` with a History / Evidence section; create `/my-ace/history` only if the surface becomes too dense.

Must show:
- completed Quest;
- Prediction / Actual / Reflection;
- date;
- XP / progression;
- repeated patterns;
- reusable evidence for future recommendations.

### D. Resume / deep link to a Quest

Do not create a dynamic route solely for aesthetics while the app remains static-export based.
Preferred owner: `/quest` with a stable query / recommendation reference contract, suitable for Push and LINE deep links.

### E. Legal / privacy surfaces

Before broad public account-based use, Privacy Policy and Terms must be reachable from ACE. They may live under Sun Loves Flow / MASA's public site if that is the legal canonical; ACE should link to them rather than duplicate the documents.

## 5. Strong P1 additions

### Knowledge Inventory

Preferred route: `/knowledge/inventory` or a first-class section inside `/my-ace`.

Inventory types:
- Insight Card
- Lens Card
- Skill Card
- Reset Card
- Pattern
- Wisdom
- Key
- Badge

The loop is:
`Quest → Content → Insight → Equip → Next Quest → Evidence → Wisdom`

### My ACE growth views

Prefer sections / tabs under `/my-ace` before adding URLs:
- Current FLOW / ACE state
- Growth / XP / streak
- History / Evidence
- Knowledge Inventory
- Patterns / personal operating knowledge

### Notifications center

Route `/notifications` only when Push / LINE creates enough history or actionable items to justify an inbox. Until then, settings + Today are enough.

### Help / support

Route `/help` when external users need troubleshooting, onboarding recovery, data / account support, or FAQs.

## 6. P2 / later experiences

Create these only when the core solo loop is proven:

- Community preview
- anonymous other-perspective examples
- 2-person Quest
- Group Quest
- Guild / Cohort
- live reflection
- peer feedback
- mentor / ACE facilitator
- deeper ACE preview / fit check

Prefer the marketing / offer detail and checkout on Sun Loves Flow unless there is a strong product reason to put commerce inside the ACE app.

## 7. Quest Catalog vs Quest Router vs Quest execution

### Quest Catalog

`public.quest_catalog` is the reusable canonical template library.
It stores age band, capability, phase, instructions, actor mode, estimated time, difficulty, XP, observation axes, tags, experience loop, and source lineage.

A catalog row is **not** yet a user's Quest.

### Quest Router

Router responsibilities:
1. Read the person's valid PWA session.
2. Use age / life-stage context explicitly rather than guessing.
3. Read current ACE / FLOW signals.
4. Exclude already completed catalog Quest references.
5. Respect the time available and attention state.
6. Rank the remaining catalog rows.
7. Show at most 3 candidates, with one Primary.
8. Let the person choose rather than silently forcing a recommendation.
9. Convert the selected catalog template into the existing personalized Quest recommendation contract.
10. Hand off to `/quest` for execution.

### Quest execution

`/quest` remains the canonical execution surface:

`Predict → Do → Actual → Reflection → XP → related Knowledge → next FLOW day`

Do not duplicate this loop in `/quest-router`.

## 8. Quest Router v0 rollout

### Now

- Implement catalog-backed Router API.
- Add `/quest-router` context selector and candidate UI.
- Reuse existing custom `flow-pwa` session.
- Reuse current `education_recommendations` Quest record as the selected personalized Quest.
- Reuse existing `/quest` execution and growth-action completion.

### Next

- Route into Router from Today / Want to when the person wants an alternative or when no valid Primary Quest exists.
- Add stable `/quest` deep-link / resume contract for Push and LINE.
- Store age / stage in an explicit profile / onboarding contract so it does not need to be selected every time.
- Add History / Evidence inside My ACE.
- Add Settings.

### Later

- Add richer context metadata to Quest Catalog: quick / deep mode, availability context, device, environment, and physical requirements.
- Learn from actual completion / skip / reflection data rather than making the routing rules increasingly complicated by hand.
- Add Knowledge Inventory and social / group experiences only after the solo loop is stable.

## 9. Deployment / source of truth

- Code: `takraw369/ace-quest-board`
- Working branch: `dev`
- Stable / release branch: `main`
- Architecture: Next.js 16 App Router, static export
- Deployment target: Cloudflare Workers Static Assets
- Current technical fallback: `https://ace-quest-board.takraw501.workers.dev`
- Intended user-facing production: `https://ace.sunlovesflow.com` after custom-domain cutover verification
- Knowledge / growth / PWA data: Supabase
- Private operator surface: MASA OS remains outside the ACE user app

Before finishing code changes, run the repository build and relevant checks. Normal implementation work belongs on `dev`; do not push directly to `main`.

## 10. Anti-sprawl rule

Do not create a standalone app or URL because a feature feels important.

First ask:
- Is this a new audience?
- Is a separate security boundary required?
- Is a separate runtime genuinely required?
- Can an existing owner page absorb the capability without becoming confusing?

If none apply, extend the existing ACE app.
