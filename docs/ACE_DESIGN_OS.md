# ACE Design OS

## Purpose

ACE should not feel like a dashboard with a dark theme. It should feel like entering a coherent world whose visual language supports self-observation, direction, practice, growth, and reflection.

The design goal is not decoration. The design goal is to make the user feel, without explanation:

- I know where I am.
- I can see where I am heading.
- I know the next move.
- My actions leave traces.
- I am growing inside a living system.

## Emotional objective

ACE should create **quiet readiness**.

Not hype. Not spa-like passivity. Not fantasy-game noise.

The desired emotional movement is:

`settle -> sense -> choose -> act -> reflect -> grow`

Every major screen should reinforce one of these verbs.

## Design genes

ACE combines five design genes:

1. **Nature / Biotope**
   - living systems, seasons, terrain, circulation, recovery, growth
   - use as spatial and behavioral metaphors, not decorative leaf icons

2. **Japanese restraint**
   - ma, asymmetry, quiet hierarchy, material texture, selective emphasis
   - avoid pseudo-traditional ornament and stereotyped "Japanese" motifs

3. **Athlete clarity**
   - timing, next action, progress, recovery, feedback
   - action screens must be fast to read under physical or cognitive load

4. **Quest / Journey**
   - routes, checkpoints, choices, discoveries, milestones
   - gamification should reveal growth, not create compulsive reward loops

5. **OS / Intelligence**
   - the system connects state, direction, learning, action, people, and history
   - intelligence should feel calm and contextual rather than technical or chat-bot-heavy

## World model

The ACE world is not a menu tree. It is a living journey.

### HOME = Camp / Today
Where am I today? What matters now? What is the next move?

### ME = Inner Map
Current state, calibration, direction, identity-in-motion, growth history.

### QUEST = Trail
One concrete action at a time. Clear start, effort, completion, reflection.

### LEARN = Library / Dojo
Knowledge appears because it helps the current phase, not because a catalog exists.

### PEOPLE = Encounter
People, coaches, peers, places, and opportunities appear contextually when they can change the user's trajectory.

These names are conceptual design metaphors. The UI does not need to literally label every area as Camp, Trail, or Dojo.

## Visual direction

### Base palette

Use a restrained natural-dark foundation with light and warmth as signals of life and direction.

- deep ink / night: structural background
- moss / forest: regulation, life, recovery, connectedness
- sand / paper: reflection, memory, knowledge
- amber / sun: direction, active focus, center pin
- mineral gray: secondary information and inactive states

Color should encode meaning consistently. Do not add colors merely to make screens feel richer.

### Light

Light is a primary world-building device.

- current focus can appear as a small source of warmth
- completed or integrated elements can become subtly brighter or clearer
- overload or ambiguity should reduce contrast rather than turn everything red
- transitions between screens may shift light temperature or density subtly

### Texture

Use texture sparingly to avoid sterile SaaS flatness:

- paper grain for reflection or knowledge surfaces
- subtle topographic or radial field lines for direction and flow
- soft atmospheric gradients for state transitions

Never reduce legibility for texture.

## Typography

Use typography to separate reflection from execution.

- reflective / philosophical phrases: a Japanese-capable serif with strong readability
- action, metrics, buttons, navigation: a clean sans-serif
- large text should be rare and meaningful

Avoid making every heading poetic. Operational information must remain operational.

## Shape language

- containers: soft but not bubbly
- buttons: confident, simple, action-oriented
- progress: paths, arcs, nodes, rings, or terrain-derived structures are preferred over generic percentage bars when comprehension remains strong
- cards should not become the default answer to every information problem

The interface should use space and grouping before adding borders.

## Motion

Motion should communicate state change.

Good uses:

- a Quest becomes active
- a calibration shifts
- a route opens
- a reflection closes a loop
- progress accumulates over time

Motion should feel physical: settle, open, connect, pulse, flow.

Avoid casino-style celebration, constant particles, and decorative movement without meaning.

## Information hierarchy

Every primary screen should answer one dominant question.

### HOME
1. How am I now?
2. What matters today?
3. What do I do next?

### QUEST
1. What is the action?
2. Why now?
3. How small can I make the first move?
4. What happened after doing it?

### LEARN
1. Why is this relevant to me now?
2. What is the one idea to understand?
3. What changes in practice?

### ME
1. What is changing in me?
2. What direction am I choosing?
3. What patterns are emerging over time?

## Want to / Direction design

Want to should not be presented primarily as a large database.

The default experience should surface:

- 1 Center Pin
- up to 3 active directions
- evidence from recent behavior
- optional deeper exploration

A large Want to library remains an advanced editing and reflection tool.

The user should be able to move from:

`I want this -> this matters because -> this is my current distance -> this is today's smallest move`

without opening multiple apps or remembering multiple URLs.

## World-building through language

World-building is partly copywriting.

Prefer language that feels embodied and directional:

- current position
- next move
- trail / route
- bottleneck
- recovery
- direction
- rhythm
- phase
- trace
- reflection

Avoid excessive jargon, invented nouns, or RPG terminology that users must learn before they can act.

## Reference principles

Study products for specific strengths, not for visual copying.

- Calm: emotional state can be shaped by the interface before interaction
- Nike Run Club: action and performance information can remain clear and confident
- Duolingo: progress can become a visible world and habit loop
- Headspace: illustration and motion can make an abstract internal process approachable

ACE should synthesize these principles through its own philosophy, athletic roots, nature/biotope model, and Japanese restraint.

## Anti-patterns

Do not ship:

- generic SaaS dashboard layouts with ACE-colored cards
- gold-on-black luxury styling as a substitute for identity
- samurai, shrine, brush-calligraphy, or Zen stereotypes without functional meaning
- RPG inventory / badge overload
- charts because data exists
- five competing CTAs on one screen
- separate URLs that users must remember for each conceptual layer

## Design quality test

Before shipping a screen, ask:

1. What is the single question this screen answers?
2. What emotion should the user have after 3 seconds?
3. What is the one next action?
4. Does the visual hierarchy reveal that without reading instructions?
5. Does this feel like ACE if the logo is removed?
6. Is any decoration competing with action or understanding?
7. Does it work first on a phone, one-handed, in imperfect real-life conditions?

If question 5 is "no", the world-building is not strong enough yet.

## Next design sprint

1. Redesign HOME around `State -> Direction -> Next Quest`.
2. Integrate Center Pin Want to into ME and HOME.
3. Create one reusable visual language for state, direction, route, and completion.
4. Produce 3 high-fidelity mobile screens before expanding the design system.
5. Test by daily personal use before polishing secondary pages.
