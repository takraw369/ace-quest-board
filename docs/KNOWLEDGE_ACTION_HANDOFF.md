# Private Knowledge Action → practice → feedback

The existing `/compiler` accepts an explicitly selected private Dashboard JSON file. It prefills the editable source, marks AI candidates and private provenance, and compiles only when requested. This introduces no new corpus, service, source synchronization or public page.

1. Export a reviewed selection from the private Dashboard and choose it under **Dashboardの実践下書きを読み込む**.
2. Review source links, instruction, steps and conditions; edit the practice text as needed.
3. Choose **Questへ変換する**. The plan preserves stable proposal/source references and source-specific reflection questions.
4. Optionally connect to the existing Board. Its milestone and all Quest descriptions keep provenance; the practice Quest keeps the actual instruction and conditions.
5. Record an observed outcome and optional learning/next action, then complete a daily Quest.
6. Choose **振り返りをDashboard用JSONへ書き出す**. Import it explicitly in the private Dashboard for source-linked review. Repeated exports use the original log event ID and completion time.

Import stays in memory until compilation; plans/logs use existing localStorage. Source links open only when chosen and omit the referrer. `human_reviewed` is a claim in the file, not a publication authorization. No private text is placed in URL payloads, fetched from its canonical source or automatically sent to the Dashboard. Feedback does not automatically rewrite canonical knowledge.

## Contracts

Draft `masa-knowledge-action/v1` contains exactly: schema, proposalId, title, destination (`ACE|SLF|Athlete Quest`), mode (`training_reflection`), reviewStatus (`ai_candidate|human_reviewed`), visibility (`private`), sources (`nodeId,sourceKey,title,canonicalUrl`), practice (`instruction,steps,reflectionQuestions`), constraints.

Boundaries: 128KiB UTF-8 file; ASCII proposal ID 1–120 (`A-Z a-z 0-9 _ -`); source node IDs use Fabric UUID v1–5/standard variant; 1–12 unique sources; titles/source keys 240 characters; credential-free HTTPS canonical URL 2048 with no localhost/IP host; instruction 4000; 1–20 steps, 1–12 reflection questions, 0–20 constraints, each at most 1000 characters. Unknown fields, invalid enums, missing fields and unsafe links are rejected.

Feedback `masa-knowledge-action-feedback/v1` contains: eventId (`ace-` + original completion log ID, max120), original proposalId/sourceNodeIds, reflection (`outcome,learning,nextAction`), occurredAt (original completion time normalized to UTC ISO). Each field is at most1500 and the Dashboard-formatted note at most5000 characters. Outcome must be nonempty; absent optional fields stay empty. Longer legacy records are preserved and receive an actionable export error, never silent truncation. Existing source-linked legacy reflection maps to outcome.

Plan/log provenance and practiceReflection are optional additive fields; manual compilation and existing store versions remain compatible. Private source material is absent from code and tests.

## Fresh verification

Run `npm run build`, focused ESLint and `npx playwright test tests/e2e/knowledge-action-import.spec.ts tests/e2e/local-ai-search.spec.ts tests/e2e/quest-world-change.spec.ts --workers=2`. Tests use synthetic fixtures and block external origins for private flow. This document lists checks; only current-run receipts establish a PASS.

Keep feature commits plus patch/bundle and validation receipts in persistent task outputs. Never rely on temporary directories for recovery. Production deployment and authenticated runtime canaries require separate release receipts.
