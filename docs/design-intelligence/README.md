# ACE Design Intelligence

This directory is the implementation-facing design memory for ACE.

## Source-of-truth split

- **Google Drive = canonical knowledge asset**
  - long-form research
  - reference studies
  - design principles
  - lessons learned
  - ACE translations
  - visual/world-building notes
- **GitHub = implementation-facing working memory**
  - patterns that should influence code
  - screen-level decisions
  - reusable interaction rules
  - implementation notes
  - QA criteria

Do not let GitHub become a competing knowledge base. When a design insight becomes strategically important, preserve the full reasoning in Drive and keep the concise implementation consequence here.

## What belongs here

1. Stable design principles that engineers/agents need while building.
2. Screen-specific findings that should change implementation.
3. Reusable patterns for State, Direction, Quest, Learn, completion, reflection, day/night, and world-building.
4. Accessibility and interaction constraints.
5. Known failed patterns and why they failed.
6. Reference locks for active design sprints.

## What does not belong here

- raw inspiration dumps
- large screenshot collections without analysis
- links with no extracted principle
- visual copying instructions
- temporary taste opinions with no product consequence

## Operating loop

`Research -> Extract principle -> Save full learning to Drive -> Translate to ACE -> Record implementation rule here -> Prototype -> Test -> Promote / reject`

## Current core principle

ACE should create **ready curiosity**: grounded enough to sense clearly, alive enough to want to move.

The UI should make the user understand, within seconds:

- where they are
- what matters now
- what the next move is
- how progress changes their world

World-building may change by time of day or context, but navigation and action clarity must remain stable.

## Related files

- `../ACE_DESIGN_OS.md` — stable ACE design principles
- `../ACE_DESIGN_RESEARCH_STACK.md` — research stack and research-first method
- `LEARNING_LOG.md` — concise implementation-relevant design lessons
- `REFERENCE_CAPTURE_TEMPLATE.md` — standard format for turning inspiration into reusable intelligence
