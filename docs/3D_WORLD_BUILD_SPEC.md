# ACE Quest Board — 3D World Build Spec

Status: BUILD-READY SPEC / NOT IMPLEMENTED

## Purpose

Add an optional spatial projection of the existing ACE Quest hierarchy without replacing the Phase 1 core loop, duplicating state, or changing the current deployment architecture.

This spec follows the repository's canonical hierarchy and architecture:

`Vision > Milestone > Quest > Task`

The existing SVG board remains the primary Phase 1 surface until a 3D spike demonstrates real interaction value and acceptable performance.

## Architecture constraints

Preserve the current repository rules:

- Next.js 16 App Router.
- static export.
- Cloudflare Workers Static Assets.
- Zustand + localStorage Phase 1 state.
- future userId-compatible data model.
- `dev` is the normal implementation branch.
- do not introduce server features only to support 3D.

## Proposed surface

First candidate route: `/world`

Treat this as an optional client-side projection of existing data, not a second app.

Do not bind the production route name permanently until the spike is reviewed.

## First MVP

Render a lightweight scene using primitive geometry only.

### World mapping

- Vision -> horizon / destination marker.
- Milestone -> region / gate.
- Quest -> selectable node / encounter.
- Task -> concrete sub-node or action marker when useful.
- completed state -> visible world-state change derived from existing state.

### Core interaction

1. Load existing local state through the same store/data contract used by the primary board.
2. Project a small bounded set of nodes into 3D.
3. Allow orbit/pan or a similarly simple touch-safe navigation pattern.
4. Select a Quest node.
5. Show its existing details / action affordance without creating duplicate state.
6. Completion continues through the existing state mutation path.
7. Return to the normal board at any time.

## State contract

The 3D scene is a derived view.

It must not create a parallel copy of Vision/Milestone/Quest/Task state.

Use stable entity IDs from the existing hierarchy for scene object binding.

Recommended projection shape:

```ts
type WorldNode = {
  entityId: string;
  entityType: "vision" | "milestone" | "quest" | "task";
  position: [number, number, number];
  visualState: "locked" | "available" | "active" | "completed";
};
```

The exact type may be adjusted to the live codebase. Do not add a separate canonical world database for Phase 1.

## Runtime approach

Candidate: Three.js through the smallest client integration that fits the current Next.js/static-export setup.

Before implementation, inspect the current package versions and bundle. Do not add React Three Fiber or another abstraction by default unless it measurably simplifies the live code and does not create unnecessary bundle/maintenance cost.

## Asset policy

Phase 1 spike:

- primitives only;
- no Tripo dependency;
- no generated environment pack;
- no external 3D asset requirement.

Phase 2 after validation:

- GLB/GLTF assets may be generated via Tripo or modeled elsewhere;
- every production asset gets an Asset Manifest and rights status;
- lazy-load assets after core UI;
- use mobile/LOD variants when measurement shows they are needed.

## UX / visual direction

Preserve the current dark, immersive game feeling while avoiding a generic fantasy-game aesthetic.

The 3D world should communicate progress and relation, not become decorative scenery.

Animation should emphasize achievement/state change. Avoid constant spinning, bounce-heavy motion, or effects that obscure task meaning.

## Accessibility / fallback

Required:

- existing SVG board remains available;
- 3D load failure must not block Quest use;
- touch interaction works without hover;
- respect reduced-motion settings;
- provide textual labels/details outside the canvas where practical;
- keyboard access to the primary Quest flow remains available through the non-3D surface.

## Performance verification

Do not invent a fixed performance budget before measuring the current app.

The spike must record:

- incremental JS bundle cost;
- 3D runtime load timing;
- mobile interaction observation;
- any GLB/texture size when assets are later introduced;
- whether lazy loading keeps the primary board unaffected.

## Acceptance criteria

All begin `UNVERIFIED`.

- [ ] UNVERIFIED — `npm run build` passes with static export.
- [ ] UNVERIFIED — existing board and routes regressions are not introduced.
- [ ] UNVERIFIED — 3D scene reads existing state rather than duplicating it.
- [ ] UNVERIFIED — a Quest can be selected from the 3D projection.
- [ ] UNVERIFIED — state changes still use the existing mutation path.
- [ ] UNVERIFIED — the normal SVG board remains fully usable without 3D.
- [ ] UNVERIFIED — touch/mobile interaction is observed on a real or representative device.
- [ ] UNVERIFIED — incremental bundle/runtime cost is measured.

## Implementation sequence

1. Fresh-read live store/types and SVG board data mapping.
2. Create a pure projection function: existing hierarchy -> `WorldNode[]`.
3. Unit-test projection behavior where practical.
4. Add a lazy/client-only 3D scene with primitives.
5. Bind selection to existing Quest detail/action flow.
6. Verify build/static export.
7. Verify fallback/mobile/regression.
8. Review whether 3D made navigation/progress meaningfully clearer.
9. Only then evaluate Tripo-generated assets.

## Cross-repo references

- Drive: `CANONICAL｜3D EXPERIENCE LAYER｜Tripo × Astra × Three.js × FLOW/ACE｜v1.0`
- `takraw369/ace-method/docs/3D_LEARNING_LAYER.md`
- `takraw369/masa-automation/skills/3d-experience-builder/SKILL.md`

## Human gate

Do not replace the current primary board or deploy a materially heavier public 3D experience solely because the spike works technically. First review interaction value, mobile cost, and regression evidence.
