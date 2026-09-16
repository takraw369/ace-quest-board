# ACE Knowledge Base Camp

Updated: 2026-09-16

## Decision

ACE `/knowledge` is not MASA's operator knowledge browser.

MASA's private/operator Knowledge OS belongs on `masahiro-yamada.com/mind` (FLOW MIND / Knowledge Cockpit). The dashboard wrapper also exists at `masahiro-yamada.com/dashboard/knowledge`.

ACE `/knowledge` is the user-facing **Base Camp**:

- a place to discover the next theme / mountain;
- a home for ACE learning assets such as video, slides, guides, audio, worksheets and Quest;
- a bridge from curiosity to action;
- a future discovery surface for optional paid theme packs.

The user should never need to understand canonical Markdown, repositories, source mirrors, blob SHAs or MASA project metadata to use ACE.

## Product metaphor

`ACE = mountain system`

- **Base Camp** = `/knowledge`
- **Trailhead / 登山口** = a theme pack or learning path
- **Trail tools / 道具** = video, slides, guide, audio, worksheet, Quest
- **Climb / 登る** = Predict → Do → Actual → Reflection
- **Evidence** = what the person actually experienced
- **Summit / 山頂** = temporary mastery / completed path, not a permanent endpoint
- **Next mountain** = another theme discovered from the current experience

Knowledge is therefore not a document shelf. It is a navigation layer from curiosity to lived learning.

## Commercial model

### ACE base subscription

Base ACE should include enough routes to create value without requiring add-ons.

Initial included trailheads:

- FLOW foundation
- BODY
- MIND

### Optional theme packs

Additional themes may be sold as optional access on top of ACE membership.

Examples:

- Food & Health
- Learning
- Relationships
- AI & Creation
- Athlete
- World Quest

Do not expose a purchase button until a real pack, entitlement and delivery path exist.

## Asset model

Every learning asset should belong to a theme / trailhead rather than exist as an isolated file.

Supported asset types:

- `video`
- `slide`
- `guide`
- `audio`
- `worksheet`
- `quest`
- `reflection`

Recommended logical contract:

```text
Theme Pack
  -> Trailhead
    -> Learning Assets
    -> Quest / Experience
    -> Reflection
    -> Evidence
    -> My ACE
    -> Next Theme
```

A PowerPoint deck or video created from ACE material should be registered as an asset under its theme and surfaced from Base Camp / the relevant trailhead.

## Source-of-truth boundary

### MASA operator knowledge

Primary owner: `masahiro-yamada.com/mind`

Dashboard wrapper: `masahiro-yamada.com/dashboard/knowledge`

Purpose:

- capture
- research
- source lineage
- canonical promotion
- project / content connection
- internal AI workflows

### ACE learning knowledge

Owner: `ace.sunlovesflow.com/knowledge`

Purpose:

- discover themes
- consume learning assets
- choose a next experience
- unlock optional theme packs
- connect learning to Quest and Evidence

Do not mirror MASA's entire private knowledge corpus into the user product.

## UX rules

1. Visual first, text second.
2. No more than three primary choices above the fold.
3. One card = one mountain / idea / action.
4. Long explanations use progressive disclosure.
5. A learning asset should lead toward an action or reflection whenever practical.
6. Optional packs should feel like discovering a new mountain, not browsing a storefront grid.
7. My ACE owns personal history and Evidence; Base Camp owns discovery.

## Runtime / data next step

When real content begins to accumulate, add a Supabase runtime model rather than hard-coding the catalog indefinitely.

Suggested entities:

- `ace_theme_packs`
- `ace_learning_assets`
- `ace_theme_pack_assets`
- entitlement link to the existing platform entitlement layer

Use Stripe only for actual paid offers; entitlement remains the runtime gate.

The UI may stay visually simple even if the backend grows deep.
