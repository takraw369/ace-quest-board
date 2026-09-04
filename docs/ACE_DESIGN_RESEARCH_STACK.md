# ACE Design Research Stack

## Purpose

ACE design work must be research-first, not vibe-first.

The design agent should not jump from a verbal brief directly into CSS or mockups. It must study real shipped products, extract patterns, choose a deliberate direction, and only then build.

## Connected / connectable research layers

### 1. Mobbin — primary product UI evidence

Use Mobbin first for real shipped product screens and common UX patterns.

Best for:
- home/dashboard structures
- onboarding
- profile / self-tracking
- progress
- notifications
- permissions
- paywalls
- bottom navigation
- empty states
- health / fitness / education / habit apps

Operating rule:
- search by problem, not aesthetic
- inspect several products
- extract the repeated pattern
- note one or two unusual/high-quality exceptions
- never copy one product wholesale

Connection paths:
- ChatGPT: use the Mobbin app when connected
- Codex / Claude Code / Cursor: Mobbin MCP (`https://api.mobbin.com/mcp`)
- Mobbin MCP requires a paid Mobbin plan

### 2. Refero — design taste + structured research methodology

Use Refero when visual direction, detailed screen design, or journey/flow quality matters.

Refero research has three layers:
1. Styles — visual direction and taste
2. Screens — concrete UI patterns and hierarchy
3. Flows — multi-step journey logic

Best for:
- visual language
- typography / spacing / surfaces
- screen hierarchy
- onboarding / cancellation / settings / account flows
- anti-generic-AI design review

Connection paths:
- Codex / Claude Code / Cursor / other MCP-compatible agents
- MCP endpoint: `https://api.refero.design/mcp`
- Refero MCP requires Refero Pro
- Refero's research-first skill can also be installed into compatible agents

## ACE research protocol

For a meaningful screen or redesign:

### Step 1 — Brief

Write a compact brief:

- WHAT is being designed
- WHO it is for
- PLATFORM
- primary user GOAL
- desired FEELING
- main RISK / objection
- constraints
- research needed: styles / screens / flows

### Step 2 — Research visual direction

For a major visual redesign:
- search 3–5 visual directions
- inspect 3–4 strong full references
- choose ONE dominant direction
- borrow only narrow details from secondary references

Do not average multiple references into a generic middle.

### Step 3 — Research product patterns

Use Mobbin and/or Refero screens for the concrete problem.

Examples for ACE:
- "daily readiness home screen"
- "fitness progress without dashboard overload"
- "habit app next action hierarchy"
- "learning app contextual recommendation"
- "self-reflection mobile UX"
- "quest or journey progress visualization"

### Step 4 — Research journey logic

Use flows when the experience spans multiple steps.

Examples:
- first ACE onboarding
- calibration → direction → quest
- quest completion → reflection → next move
- LINE/app connection
- subscription / coaching purchase

### Step 5 — Reference Lock

Before implementation, lock the direction:

Primary reference/direction: [one dominant source]
Preserve: [3–5 traits]
Borrow only: [1–2 secondary details]
Role rules: [what each color/component/media role means]
Media strategy: [real/generated/code-native]
Reject: [generic defaults that would dilute the direction]
Token commitments: [background/type/accent/radius/border/shadow/media]

### Step 6 — Decision Ledger

Every major design choice needs a reason.

| Decision | Source | Role / rule | Why for ACE |
|---|---|---|---|
| Example: one dominant CTA on HOME | product screen evidence | primary action only | keeps next move obvious |

If a major choice has no source, user constraint, or craft rule, research more or remove it.

### Step 7 — Build smallest high-fidelity surface

Default order for ACE:
1. HOME
2. QUEST
3. ME
4. LEARN

Do not build a full design system before these core screens prove themselves.

### Step 8 — Visual QA

After build:
- compare against the reference lock
- check information hierarchy
- check one-handed phone use
- check daylight and night readability
- check reduced motion
- check whether ACE still feels distinctive without the logo

## Day / Night rule

Day and night are separate atmospheric expressions of the same product logic.

Day:
- sky
- air
- sunlight
- openness
- exploration
- forward energy

Night:
- indigo
- moonlight
- lantern warmth
- story
- mystery
- quiet anticipation

The controls, navigation, information hierarchy, and task logic should remain stable across modes.

## Special world-building rule: Arabian Night × Japan

Do not create a costume collage.

Use transferable emotional/material principles:
- Arabian Night: mystery, warm lantern light, arches, story, celestial navigation
- Japan: ma, quiet hierarchy, asymmetry, paper/material restraint, controlled detail

Avoid:
- cliché samurai/shrine/brush motifs
- excessive palace ornament
- generic luxury black-and-gold
- fantasy decoration that reduces clarity

Desired emotional sequence at night:

`settle -> become curious -> discover -> choose -> move`

## Default research depth

Small visual improvement:
- 2–3 searches
- 2–3 references
- short synthesis

Major redesign / new visual language:
- 3–5 searches
- 3–4 strong references
- screen research for key components
- clear reference lock before coding

Product workflow:
- styles for visual language
- screens for key states
- flows for sequencing

## First ACE research targets

1. HOME: State → Direction → Next Quest
2. QUEST completion + reflection
3. ME / Inner Map
4. Day/night atmosphere without navigation drift
5. Contextual LEARN recommendations

## Operating principle

AI carries the research burden.
MASA supplies worldview, taste judgment, lived experience, and directional approval.

The target is not "AI-generated design."
The target is "research-backed ACE design that feels inevitable."
