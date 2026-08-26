# Canonical App Map

## One app, three layers

Production surface: `https://ace-quest-board.netlify.app`

| Layer | Canonical route | Role |
| --- | --- | --- |
| 知 / Knowledge | `/knowledge` | Meaning, concepts, connected knowledge |
| 望 / Want to | `/want-to` | Direction, desires, priorities |
| 行 / Quest | `/` | Action, quests, execution |

## Source of truth

- Code: `takraw369/ace-quest-board`
- Knowledge data: Supabase Knowledge Core
- Want to source: MASA Want to Master / app snapshot (to be unified further)
- Quest state: Quest Board app state (to be unified further)
- Hosting: Netlify is delivery only, not the data or code source of truth.

## Retired surfaces

- `willowy-liger-24e5c7.netlify.app` is legacy/redirect-only.
- `deploy-preview-*--ace-quest-board.netlify.app` is preview only and must never be treated as canonical.

## Private command center

`masa-os-dashboard.pages.dev` remains separate on Cloudflare Pages. It is the private operator surface and is not part of the public/personal three-layer app.

## Product sequence

1. Consolidate routes and sources of truth.
2. Use personally and collect friction.
3. Improve usability from real usage.
4. Promote stable patterns into ACE-facing experiences.

Do not create a new standalone app for a feature that belongs to 知・望・行. Add it to this repository and one of the canonical routes unless there is a clear security or product-boundary reason not to.
