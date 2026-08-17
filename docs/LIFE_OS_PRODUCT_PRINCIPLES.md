# Life OS / Quest Board Product Principles

Updated: 2026-08-17
Source: Apple Notes「人生すごろくシステム運用中」＋現行ACE Quest Board

## 1. Core model

ACE Quest Board is not only a task manager. It is a **life-progress interface** that turns intentions into visible movement.

Keep the current hierarchy:

`Vision > Milestone > Quest > Task`

The **6 life categories** are a separate axis for balance and diagnosis; they should not replace the hierarchy above. A Quest/Task can belong to one life category while still serving a Vision and Milestone.

This separation prevents the data model from mixing:

- **Where am I going?** → Vision / Milestone
- **What am I doing next?** → Quest / Task
- **Which area of life is this strengthening?** → Life category

## 2. Gamification principle

The game layer exists to make progress perceptible, not to decorate the UI.

Use XP, levels, board movement, streaks, milestones, and completion feedback only when they help the user:

1. see the current position,
2. choose the next action,
3. feel accumulated progress,
4. rebalance neglected life categories.

Avoid reward mechanics that encourage meaningless task completion or competition detached from the user's Vision.

## 3. Messaging / notification architecture

Do not hard-code the product around LINE, Telegram, Discord, Slack, or another single messaging service.

Define a **Messaging Adapter** by capabilities instead:

- structured/rich messages,
- inline action buttons,
- image/video/document delivery,
- direct and group/channel notifications,
- deep links back to the relevant Quest/Task,
- progress updates,
- opportunity/deadline alerts,
- error/failure alerts,
- motivational or reflection prompts.

Provider-specific Markdown/HTML formats, button schemas, file limits, group rules, APIs, pricing, and policies are implementation details and must be verified against current provider documentation before use.

The original Apple Note listed several of these as a "LINE comparison advantage", but the competing platform was not identified. Treat those bullets as **capability requirements**, not as a durable vendor-comparison claim.

## 4. Notification → business value

Notifications are not monetization by themselves. Their business value is created by reducing leakage in the user journey:

`current state visibility → next action → completion → feedback → continued use → outcome`

Primary value mechanisms:

- real-time progress visibility,
- fewer missed opportunities/deadlines,
- faster error recovery,
- sustained motivation,
- higher continuation/retention,
- better timing for offers, coaching, or community interventions.

## 5. Monetization boundary

Free/core value should prove the basic loop:

`Goal/Vision → Quest → Action → visible progress`

Paid value can expand depth and coordination rather than artificially blocking the basic loop. Examples:

- advanced progress analytics,
- configurable life categories,
- personalized Quest generation,
- deeper reflection/history,
- team/community/group features,
- coaching/ACE support layers,
- automations and external integrations.

## 6. Design rule for the six life categories

The six categories should function as a **balance dashboard**, not six isolated mini-apps.

Useful outputs include:

- category distribution of active Quests,
- neglected-area detection,
- weekly/monthly balance review,
- cross-category effects,
- one Quest contributing to multiple outcomes without duplicating the Quest itself.

Keep category naming configurable so MASA's personal taxonomy can evolve without requiring a schema rewrite.

## 7. Product connection

This product principle connects:

- **ACE**: education / self-regulation principles,
- **Athlete Quest**: observation → adjustment → choice → experiment → self-direction,
- **Quest Board**: visible implementation layer,
- **Sun Loves Flow / Life OS**: whole-life integration and long-term operating system.

The intended flow is:

`Life categories → Vision → Milestone → Quest → Task → feedback → reflection → next Quest`

The value is not the number of completed tasks; it is the user's increasing ability to steer life intentionally.
