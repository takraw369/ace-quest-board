# ACE Quest Board — Agent Instructions

## Canonical context
Before changing this repository, read CLAUDE.md.
Treat it as the canonical project definition for product purpose, architecture, deployment policy, data hierarchy, design decisions, current phase, and branch strategy.

## Framework
This repository uses Next.js 16 App Router.

Do not assume older Next.js APIs or conventions are still valid.
Before implementing unfamiliar Next.js behavior, check the relevant documentation under node_modules/next/dist/docs/ and follow deprecation notices.

## Architecture boundaries
- Keep the current static-export architecture unless a task explicitly requires server features.
- Deployment target is Cloudflare Workers Static Assets.
- Do not restore or introduce Netlify deployment.
- Preserve backward compatibility when evolving localStorage-backed state.
- Keep the hierarchy: Vision > Milestone > Quest > Task.
- Preserve future multi-user compatibility and existing userId-oriented design.

## Working branch
Normal implementation work belongs on dev.
Do not push directly to main unless the change is explicitly intended for the completed or release state.

## Before finishing a code change
Run npm run build.
Also run relevant tests or checks when the changed area provides them.
Do not claim a change is complete if the build or checks fail.
