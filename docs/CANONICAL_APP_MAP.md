# Canonical App Map

Updated: 2026-09-07

This file is the route/ownership source of truth for ACE and MASA operator surfaces. Its purpose is to prevent duplicate candidates from consuming human and AI reasoning time.

## 1. One role = one primary

| Role | Canonical owner | Rule |
| --- | --- | --- |
| MASA private/admin Control Plane | `https://masahiroyamada.com/dashboard` | **ONLY** MASA operator/admin surface |
| ACE product code/runtime | `takraw369/ace-quest-board` | Active product; do not treat it as MASA admin |
| ACE user personal surface | `/me` | Current state, growth, My ACE, Vitality 8, personal evidence |
| ACE user Evidence | `/me/evidence` | Prediction → Actual → Reflection history |
| ACE admin Voice Inbox | `https://masahiroyamada.com/dashboard/voice` | Operator workflow belongs to PRIMARY Dashboard |

`My ACE` may remain a product concept or UI label. It is **not** a route owner and must not recreate `/my-ace`.

## 2. Removed / non-canonical candidates

- `/my-ace` — removed. Do not restore, alias as an alternative, or use as an auth return route.
- `/my-ace/evidence` — migrated to `/me/evidence`.
- `/my-ace/voice` — migrated to PRIMARY Dashboard `/dashboard/voice`.
- `masa-os-dashboard.pages.dev` and other old Dashboard deploys — not candidates for MASA admin ownership.
- `https://ace-quest-board.takraw501.workers.dev` — technical ACE deployment/fallback only. A live URL does not make it canonical.
- Netlify/old preview surfaces — development history only; do not revive as product routes.

## 3. ACE user loop

ACE is one user-facing product. The core loop is:

`困 → 知 → 望 → Router → 行 → 振り返り → Evidence → 次の行`

Important routes:

| Route | Job |
| --- | --- |
| `/dictionary` | 困 / problem-first entry |
| `/knowledge/today` | daily knowledge |
| `/knowledge` | knowledge library |
| `/knowledge/ask` | ask from current curiosity/problem |
| `/want-to` | 望 / direction |
| `/quest-router` | choose up to three suitable experiments |
| `/quest` | Predict → Do → Actual → Reflection execution |
| `/today` | daily home |
| `/calibration` | BODY / COGNITION / EMOTION / ACTION state |
| `/me` | personal owner surface |
| `/me/evidence` | personal Evidence history |
| `/profile` | identity/profile |
| `/login` | Google/Supabase auth; successful return goes to `/me` |
| `/connect/line` | LINE/PWA identity connection |
| `/learn` | deeper content |
| `/people` | people/place connection |

Internal/backend names may retain compatibility wording temporarily when renaming them would add deployment risk. They must never be surfaced as a competing route/canonical owner.

## 4. Deployment/source of truth

- ACE code: `takraw369/ace-quest-board`
- Working branch: `dev`
- Stable/release branch: `main`
- ACE structured data: Supabase
- MASA operator/admin: `takraw369/masahiro-yamada-com` → `https://masahiroyamada.com/dashboard`
- Intended user-facing ACE domain: `https://ace.sunlovesflow.com` after verified custom-domain cutover
- Workers.dev ACE URL is a technical fallback, not a product-strategy decision source.

## 5. Retirement rule — completion definition

A retired surface is **not done** merely because a document says LEGACY.

Complete retirement means:

1. identify unique value;
2. migrate that value to its canonical owner;
3. switch all active references/auth returns/navigation;
4. remove old UI/routes and stale operator code;
5. use a bounded redirect only when real external compatibility requires it;
6. delete/disable the old surface;
7. update Drive/GitHub canonical context so future AI sessions do not select it.

**Legacy-but-live is not a final state.** Existence itself creates candidate noise, human decision cost, and AI/token tax.

## 6. Anti-sprawl rule

Do not create a standalone app or URL because a feature feels important. Create a new owner only when there is a genuinely different audience, security boundary, or runtime. Otherwise extend the existing canonical owner.
