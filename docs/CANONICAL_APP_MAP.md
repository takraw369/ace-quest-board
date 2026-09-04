# Canonical App Map

## One app, three layers

### Development / test surface
`https://ace-quest-board-dev.<workers.dev subdomain>`

Use this surface for MASA's real-device testing before release. The exact workers.dev hostname is determined by the Cloudflare account subdomain.

### Production surface
`https://ace.sunlovesflow.com`

Production is reserved for stable releases promoted from `dev` to `main`.

| Layer | Canonical route | Role |
| --- | --- | --- |
| 知 / Knowledge | `/knowledge` | Meaning, concepts, connected knowledge |
| 望 / Want to | `/want-to` | Direction, desires, priorities, achievement logs |
| 行 / Quest | `/` and `/quest` | Action, quests, execution |
| Today | `/today` | Personalized daily home, recommendations, growth state, Push onboarding |
| Learn | `/learn` | Personalized education / deeper content |
| People | `/people` | Connection recommendations |
| Calibration | `/calibration` | ACE calibration / current-state check |
| My ACE | `/my-ace` | Personal ACE view |
| Profile | `/profile` | Personal profile |
| LINE Connect | `/connect/line` | Connect LINE identity/session to PWA |

All user-facing layers belong in this repository unless a separate security boundary, audience, or runtime genuinely requires another app.

## Source of truth

- Code: `takraw369/ace-quest-board`
- Development branch: `dev`
- Production branch: `main`
- Knowledge / growth / PWA data: Supabase
- Want to: current app snapshot + source sheet, to be unified further without exposing private data
- Deployment: Cloudflare Workers Static Assets

## Deployment policy

- `dev` -> development Worker `ace-quest-board-dev` -> MASA real-device test
- approved/stable -> `main`
- production -> Wrangler `production` environment -> Worker `ace-quest-board` -> `ace.sunlovesflow.com`

## Retired / non-canonical surfaces

- Netlify production and deploy-preview URLs are retired and must not be treated as canonical.
- The direct `ace-quest-board...workers.dev` production Worker URL is not the user-facing canonical URL.
- Former standalone Knowledge surfaces are legacy/redirect-only.

## Private command center

`https://masa-os-dashboard.pages.dev` remains separate as the private operator surface for MASA. It is not part of the ACE user-facing app.

Private source data must not be copied into the public repository just to simplify the frontend. Public/personal UI and private operator data are separate security boundaries.

## Product sequence

1. Build on `dev`.
2. Test personally on the development Worker / PWA.
3. Fix friction from real usage.
4. Promote stable behavior to `main` / production.
5. Promote proven patterns into ACE-facing experiences.

## Anti-sprawl rule

Do not create a new standalone app for a feature that belongs to 知・望・行・Today or the personal ACE experience. First decide which existing route owns it and add it to this repository.

Create a separate app only when at least one of these is true:

- a different security boundary is required;
- a genuinely different audience/product is required;
- the runtime/infrastructure cannot reasonably live here.

A prototype or visual experiment is not, by itself, a reason to create a new canonical URL.
