# ACE Overall Direction — Product × Design × AI Learning

Updated: 2026-09-04

This file is the implementation-facing summary of the broader design direction. Long-form research, judgment, MASA feedback, and learning history stay canonical in Google Drive: `ACE DESIGN INTELLIGENCE｜Research Library & Learning Log`.

## 1. Product direction

ACE is not a collection of features. It is a Life / Growth OS that helps a user repeatedly move through:

`Sense current state -> choose direction -> act -> learn -> reflect -> update -> move again`

Users should not have to remember multiple conceptual URLs.

Primary navigation:

- HOME
- QUEST
- LEARN
- ME

`People`, `Want to`, and other supporting functions should appear contextually rather than as permanent top-level destinations.

The old `知 / 望 / 行` model remains useful as an internal conceptual model, not the primary navigation model.

## 2. Core user loop

1. Enter ACE through one canonical entry.
2. Current State / Calibration.
3. Direction / Want to.
4. Route / Biotope chosen from purpose, environment, and phase.
5. Today's Quest.
6. Contextual Learn / People / Environment only when useful.
7. Action.
8. Reflection / Trace.
9. Update current state and direction.
10. Generate the next meaningful Quest.

Different people may enter through different routes; the integrated destination is shared. This is the product expression of the Fuji trailhead model.

## 3. Want to becomes Direction

Do not treat Want to as a default database screen.

Default user-facing representation:

- 1 Center Pin
- up to 3 Active Directions
- recent evidence
- today's smallest move

The large Want to library remains an advanced editor / reflection surface.

Private MASA-specific Want to data must not be exposed as general user data. Private data belongs behind authenticated private surfaces; general users need their own structured state.

## 4. World direction

World-building is functional. Its job is to create a cognitive and emotional state that makes the next meaningful action feel natural.

### Day

- sky
- air
- sun
- green growth
- openness
- exploration
- possibility

Emotional movement:

`open -> curious -> energized -> move`

### Night

- moon
- lantern light
- indigo
- story
- immersion
- quiet anticipation

Emotional movement:

`settle -> immerse -> discover -> move`

A night direction may combine Arabian-Night mystery with Japanese restraint, space, material sensitivity, asymmetry, and calm hierarchy.

Do not paste cultural motifs as costume. Use light, rhythm, space, texture, language, and composition.

Day/night may change atmosphere, but must not relocate navigation or change core interaction logic.

## 5. Experience principle

ACE should feel less like "operating an app" and more like "returning to my world".

Excitement is not visual noise. It is anticipation: the feeling that another meaningful landscape, route, discovery, or growth state is ahead.

Progress should not rely only on XP or percentages.

Prefer visible world change:

- routes connect
- map areas open
- scenery expands
- Biotope grows
- traces accumulate
- current position becomes clearer

Quest completion should communicate that a real action changed the user's world.

## 6. Research-first design rule

Do not make meaningful design changes from taste alone.

Required sequence:

1. Problem definition
2. Research 3–5 strong references solving the same problem
3. Extract transferable principles
4. Validate against UX and accessibility standards
5. Translate into ACE
6. Create a Reference Lock
7. Build the smallest high-fidelity prototype
8. MASA feedback
9. Real use
10. Promote stable patterns only

Every non-obvious design decision should be explainable.

## 7. Research stack

### Real product screens / flows

- Mobbin
- Refero
- Banani
- App Store / Google Play
- public web
- product videos / YouTube

### UX / psychology

- Apple HIG
- Material 3
- Nielsen Norman Group
- Growth.Design
- Laws of UX

### Implementation / quality

- Figma official UI kits
- Apple / Material / Carbon design systems
- Checklist Design
- accessibility guidance

### World-building

- Godly
- Awwwards
- SANKOU!
- games
- film
- editorial design
- contemporary Japanese digital design

Do not depend on a single reference database.

## 8. Canonical ownership

- Google Drive = long-term knowledge, judgment, direction, research logs, MASA feedback
- GitHub = implementation rules, Design OS, patterns, templates, code, product specs
- Prototype = hypothesis validation artifact
- Supabase = user-specific structured state and data

Do not copy private personal context into public repository files.

## 9. AI learning loop

The model itself is not assumed to permanently learn from conversation.

Operational learning is:

`Research / Work -> Finding -> Drive -> GitHub Rule / Pattern -> Prototype / Code -> Review -> Good / Failure Pattern -> Design OS / Skill Update -> Next Work`

Useful learning should not die inside chat.

AI should perform research, comparison, organization, assetization, and implementation specification whenever it can. MASA should concentrate on worldview, lived experience, taste judgment, contradictions, and final direction.

## 10. Current center pin

Redesign ACE HOME into:

**"exciting, but impossible to get lost in."**

The structural spine is:

`State -> Direction -> Next Quest`

Day and night should express different emotions over the same UX skeleton.
