# Canonical App Map

## One entry, one app

Canonical production entry: `https://ace.sunlovesflow.com/`

Development/testing may use the `ace-quest-board-dev` workers.dev deployment, but it is not a user-facing canonical URL.

Users should be given one URL only. Internal routes are implementation details inside the same product, not separate products to bookmark or explain.

## Primary user flow

| Surface | Route | Role |
| --- | --- | --- |
| HOME | `/` | Today view: current state, calibration summary, recommendations, next move |
| QUEST | `/quest` | Do the next action |
| LEARN | `/learn` | Learn what is useful for the current phase |
| ME | `/me` | Current self, growth, calibration, curriculum, direction |

`/today` remains as a compatibility route for existing links but is no longer the canonical entry.

`/people` remains a contextual destination opened from recommendations when useful; it is not persistent primary navigation.

## 知・望・行 is the internal model

The conceptual model remains:

- 知 / Knowledge = meaning, concepts, connected knowledge
- 望 / Want to = direction, desires, priorities
- 行 / Quest = action, quests, execution

This model should drive recommendations and information architecture without forcing users to navigate three separate conceptual systems.

### Direction / Want to

`/want-to` is currently an advanced direction editor. It should not be treated as a separate product or primary entry point.

The long-term product behavior is:

1. Calibration senses the current state.
2. Direction clarifies the user's meaningful Want to.
3. ACE selects an appropriately sized Quest.
4. The user acts and reflects.
5. Knowledge is surfaced when it helps the next action.
6. The loop updates from real usage.

For MASA's private Want to Master, private source data must be moved behind the authenticated/private OS boundary before it becomes a production-facing personal feature. Do not expose private Drive/Sheet content merely to simplify the frontend.

## Source of truth

- Code: `takraw369/ace-quest-board`
- Knowledge data: Supabase Knowledge Core
- Want to source: canonical user/private source -> structured read model as needed
- Quest state: ACE app state / Supabase as promoted by usage evidence
- Private editable operating data: Google Drive / Google Sheets
- Hosting: Cloudflare Worker assets; hosting is delivery only, not the data or code source of truth

## Private command center

`/my-ace` is the authenticated private operator surface for MASA. It can live in the same codebase/domain while preserving a separate security boundary.

Private source data must not be copied into public client state just to reduce route count.

## Product sequence

1. One entry and one primary navigation.
2. Use personally and collect friction.
3. Integrate Direction/Want to into the ME and recommendation flow.
4. Improve usability from real usage.
5. Promote stable patterns into ACE-facing experiences.

## Anti-sprawl rule

Do not create a new standalone app or new user-facing URL for a feature that belongs inside ACE.

First decide whether it belongs to HOME, QUEST, LEARN, ME, or a contextual detail opened from one of them.

Create a separate app/domain only when at least one of these is true:

- a different security boundary cannot reasonably live in the same application;
- a genuinely different audience/product requires independent navigation and lifecycle;
- the runtime/infrastructure cannot reasonably live here.

A prototype, visual experiment, data view, or new feature is not by itself a reason to create a new canonical URL.
