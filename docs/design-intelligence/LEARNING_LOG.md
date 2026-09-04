# ACE Design Learning Log

Use this file for concise lessons that should directly influence implementation.

Full research and long-form reasoning belong in Google Drive.

---

## 2026-09-04 — World-building must not replace clarity

### Learned
- A strong atmosphere can shape emotion before interaction.
- ACE still needs one dominant next action per primary screen.
- Excitement comes from anticipation and visible possibility, not from adding more decoration.

### ACE translation
- HOME should follow: `State -> Direction -> Next Quest`.
- Avoid presenting State, Direction, Learn, People, and Quest with equal visual weight.
- Use the environment/world as context, not as a competing UI layer.

### Implementation consequence
- Keep persistent navigation stable.
- Push one primary CTA.
- World art/atmosphere should sit behind the action hierarchy.

---

## 2026-09-04 — Day and night can carry different emotions with the same UX

### Learned
- Day can communicate openness, air, possibility, movement, exploration.
- Night can communicate moonlight, lantern warmth, mystery, story, reflection, quiet anticipation.
- Changing mood must not relocate controls or change the mental model.

### ACE translation
- Day: sky / wind / sun / growth / landscape opening.
- Night: indigo / moon / lantern / story / constellation / reflective depth.
- Japanese restraint should provide spacing, hierarchy, material sensitivity, and calm.
- Arabian-night influence should provide mystery, light, arch-like framing, and story — not costume ornament.

### Implementation consequence
- Build day/night as theme tokens and environmental layers.
- Keep HOME / QUEST / LEARN / ME navigation identical.
- Verify contrast and readability in both modes.

---

## 2026-09-04 — Motion should show causality

### Learned
- Motion is useful when it explains activation, completion, continuity, or progress.
- Celebration without meaning quickly becomes noise.

### ACE translation
- Quest starts -> route becomes active.
- Quest completes -> route connects / map opens / Biotope grows.
- Reflection closes -> world settles and next route becomes clearer.

### Implementation consequence
- Prefer stateful motion over particles/confetti.
- Support reduced motion.
- Important information must remain understandable without animation.

---

## 2026-09-04 — Progress should become a world, not only a number

### Learned
- Visible progression can create anticipation when the user sees what becomes available next.
- Numeric progress alone is efficient but emotionally thin.

### ACE translation
- XP is supporting data, not the main emotional reward.
- Actions should leave traces: path, terrain, growth, light, unlocked knowledge, changed Biotope.

### Implementation consequence
- Design a reusable `ProgressTrace` visual language.
- Keep numeric details available but secondary.

---

## 2026-09-04 — Research before visual invention

### Learned
- Do not begin with “make it look good.”
- Study several relevant products for a specific product problem.
- Extract principles rather than averaging aesthetics.

### ACE translation
For meaningful design changes:
1. define user + task + emotional target
2. research 3–5 strong references
3. extract hierarchy / flow / feedback / motion / accessibility principles
4. decide what ACE should not copy
5. lock a primary design direction
6. prototype
7. compare result against the reference principles

### Implementation consequence
- Every non-obvious design decision should be explainable by a user need, tested principle, or ACE world rule.
