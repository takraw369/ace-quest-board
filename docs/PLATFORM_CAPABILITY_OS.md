# PLATFORM CAPABILITY OS

**Legacy SaaS Function Harvest — WordPress × MYASP × Community × LMS × Funnel**  
Status: Canonical architecture seed  
Date: 2026-08-31

## Purpose

Do not clone an all-in-one SaaS. Extract the mechanism that solves a problem, normalize it into a reusable ACE capability, and keep vendor-specific behavior behind adapters.

**TTP the mechanism, not the product. Capability, not UI.**

## Capability domains

| Domain | Patterns to learn from | ACE capability |
|---|---|---|
| Publishing / CMS | WordPress, Astro-style static publishing, Ghost/Webflow/Framer | Page, Post, SEO metadata, Preview, Publish, Redirect, Asset |
| Funnel / Conversion | ClickFunnels, SeedProd, Systeme.io, Kartra, OptinMonster | Landing, Opt-in, Offer, Checkout step, CTA, Upsell, Campaign, Funnel Event |
| CRM / Automation | MYASP, GoHighLevel, GetResponse, Kartra, ActiveCampaign/Kit | Person, Segment, Scenario, Trigger, Condition, Action, Journey |
| Learning / Membership | Teachable, Kajabi, LearnWorlds, Podia, Circle | Course, Lesson, Drip, Progress, Learning State, Access |
| Community | Circle, Mighty Networks, Skool, Discord | Space, Post, Event, Role, Membership, Moderation, Community Identity |
| Commerce | Stripe + funnel/LMS tools | Product, Offer, Price, Purchase, Subscription, Refund, Entitlement |
| Referral / Affiliate | MYASP, Kartra, ClickFunnels | Referral code, Attribution, Partner, Commission rule, Referral event |
| Support / Booking | Kartra, GoHighLevel, scheduling/helpdesk tools | Booking event, Reminder, Ticket, Human follow-up |

## Shared core

### Person
Use the existing identity hierarchy instead of vendor-owned customer masters:

- `auth.users`
- `profiles`
- `contacts`
- `person_identities`

LINE, Google, email, Discord, community accounts, etc. are identities/channels, not independent people.

### Offer
Represents what was presented, to whom, under which conditions.

Candidate concepts: `product`, `offer`, `price`, `campaign`.

### Entitlement
Separates payment from access. A successful purchase, invitation, role, or progression event can grant/revoke access without hard-coding access logic into pages.

Candidate concepts: `entitlements`, `access_grants`.

### Content / Experience
The routable unit is not only a lesson. It can be a Knowledge Node, Quest, course lesson, event, person, project, tool, or other Next Experience.

### Event Ledger
Preserve why current state exists. Candidate events include:

`view`, `optin`, `click`, `reply`, `assessment`, `quest`, `purchase`, `refund`, `access_granted`, `completion`, `referral`, `contribution`, `meeting`.

Prefer extending existing `funnel_events`, `quest_events`, and related event structures over creating parallel ledgers without a schema review.

### Automation
Use a shared rule shape:

```text
TRIGGER -> CONDITION -> ACTION
```

Example:

```text
purchase.paid
-> verify offer/person
-> grant entitlement
-> record event
-> refresh Next Experience
-> notify through the appropriate channel only when useful
```

### Channel adapters
Web, LINE, email, community, Discord, SMS, and future channels should remain adapters. Channel-specific payloads must not leak into the domain core.

## Anti-bloat architecture

Feature count is not the same as runtime weight. The larger risk is operational coupling.

### Runtime guardrails

- Preserve static-first public pages.
- Keep route/feature boundaries; do not ship unused feature JS into every page.
- Move heavy aggregation, routing, and automation away from the browser.
- Use CDN/specialized media infrastructure for large media.
- Load optional capabilities only where the route needs them.

### Operational guardrails

Do not:

- create a new Person master for each channel;
- create product-specific payment/access logic;
- put webhook orchestration directly into UI components;
- duplicate the same automation separately for LINE, web, and email;
- copy a vendor UI merely because the vendor has one;
- build commodity infrastructure such as card networks, SMTP deliverability, general-purpose video streaming, or general chat before it is a differentiator.

## Capability admission rule

Before building a feature, evaluate:

1. **Problem** — what problem does it solve?
2. **Mechanism** — why does the pattern work?
3. **User value** — what does the person receive?
4. **Existing capability** — can the current platform express it already?
5. **Source of truth** — where does canonical data live?
6. **Event** — what evidence/history must be stored?
7. **Dependency** — what vendor lock-in is introduced?
8. **Runtime cost** — does it increase client/runtime weight?
9. **Ops cost** — does it add maintenance, permission, or failure surfaces?
10. **Reuse** — will at least two flows reuse it?
11. **Now value** — does it directly unblock a current customer/revenue/experience bottleneck?

Decision: `BUILD | ADAPT | CONNECT | DEFER | REJECT`.

As a default, internal implementation is favored when a capability is reusable across multiple flows or is required for a current bottleneck. Otherwise connect a specialist service and retain the domain event/data needed to switch later.

## Vendor-pattern harvest

### WordPress
Harvest editing/publishing, templating, SEO, preview and content lifecycle. Prefer structured content + static generation over plugin accumulation.

### MYASP
Harvest scenario/step messaging, payment-triggered follow-up, member access, LINE integration, event-driven segmentation, and referral/affiliate concepts. Normalize them into Person + Event + Automation + Entitlement rather than recreating MYASP itself.

### ClickFunnels / Kartra / Systeme.io
Harvest funnel-step modeling, offer transitions, order bumps/upsells, conversion events and lifecycle automation.

### Circle / Mighty Networks / Skool
Harvest spaces, member-led interaction, events, cohorts, roles and community workflows. Community account IDs remain identities linked to a Person.

### Teachable / Kajabi / LMS tools
Harvest curriculum, drip, resume/progress, membership and coaching flows. ACE progress remains Evidence/Learning-State oriented rather than completion-only.

### OptinMonster
Harvest behavioral CTA targeting and campaign rules, not the WordPress/plugin dependency.

## Implementation phases

### NOW

- Reuse current Stripe, Supabase Auth, `contacts`, purchase records and funnel events.
- Establish the shared Offer / Entitlement / Automation-event vocabulary before adding UI.
- Treat this document as the capability contract for future feature harvesting.
- Do not build a giant admin console.

### NEXT

- Purchase -> entitlement -> My ACE/content access.
- Step journey for registration / assessment / consultation / purchase / onboarding / follow-up.
- Drip, progress and resume primitives.
- Referral attribution.
- Lightweight campaign/segment primitives.

### LATER

- Community spaces/cohorts/events where real usage requires them.
- Advanced experimentation/personalization.
- Affiliate payout operations.
- Helpdesk, coach pipeline and booking integrations.
- Advanced lifecycle automation.

### FUTURE

Most marketing SaaS optimizes what to sell next. ACE should combine Person State, Goal, Learning State, Evidence, Relationship and Offer Eligibility to return the **Next Good Experience**. Sales automation and education routing may share the event layer without making revenue maximization the sole objective.

## Current architecture constraints

- Keep Next.js static export unless a task explicitly requires a server architecture change.
- Keep Cloudflare Workers Static Assets as the current deployment target.
- Do not reintroduce Netlify.
- Supabase is the structured identity/data foundation; do not create parallel identity masters.
- Review existing schema before creating new tables or ledgers.

## Reference patterns

- WordPress migration case: https://note.com/wildriver/n/neb8ca8a2b3dd
- MyASP functions: https://myasp.jp/func/
- Circle courses: https://circle.so/platform/courses
- Teachable: https://www.teachable.com/
- ClickFunnels CRM/platform: https://www.clickfunnels.com/features/crm
- Kartra features: https://kartra.com/feature/
- Mighty Networks: https://www.mightynetworks.com/
