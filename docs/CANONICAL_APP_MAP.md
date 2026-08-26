# Canonical App Map

## One app, three layers

Production surface: `https://ace-quest-board.netlify.app`

| Layer | Canonical route | Role |
| --- | --- | --- |
| 知 / Knowledge | `/knowledge` | Meaning, concepts, connected knowledge |
| 望 / Want to | `/want-to` | Direction, desires, priorities |
| 行 / Quest | `/` | Action, quests, execution |

All three layers share one global layer switcher. Navigation changes should be made once and reused across the app.

## Source of truth

- Code: `takraw369/ace-quest-board`
- Knowledge data: Supabase Knowledge Core
- Want to source: MASA Want to Master / app snapshot (to be unified further without exposing private data)
- Quest state: Quest Board app state (to be unified further)
- Hosting: Netlify is delivery only, not the data or code source of truth.

## Branch policy

- `main`: production candidate / stable baseline
- `dev`: active development
- feature branches: short-lived experiments and implementation work

Netlify production should ultimately track `main`. Preview deploys are verification surfaces only.

## Retired surfaces

- `willowy-liger-24e5c7.netlify.app` is legacy/redirect-only.
- `deploy-preview-*--ace-quest-board.netlify.app` is preview only and must never be treated as canonical.

## Private command center

`masa-os-dashboard.pages.dev` remains separate on Cloudflare Pages. It is the private operator surface and is not part of the public/personal three-layer app.

Private source data must not be copied into the public repository just to simplify the frontend. Public/personal UI and private operator data are separate security boundaries.

## Product sequence

1. Consolidate routes and sources of truth.
2. Use personally and collect friction.
3. Improve usability from real usage.
4. Promote stable patterns into ACE-facing experiences.

## Anti-sprawl rule

Do not create a new standalone app for a feature that belongs to 知・望・行. First decide which layer owns it and add it to this repository and canonical route.

Create a separate app only when at least one of these is true:

- a different security boundary is required;
- a genuinely different audience/product is required;
- the runtime/infrastructure cannot reasonably live here.

A prototype or visual experiment is not, by itself, a reason to create a new canonical URL.
