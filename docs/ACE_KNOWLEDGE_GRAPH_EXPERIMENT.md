# ACE Knowledge Graph Explorer — Experimental MVP (2026-10-11)

## Purpose
Make relationships among existing ACE lessons and MASA's Knowledge Canvas searchable without replacing the existing local semantic search. Ship as a *draft* first; no production claims or automatic deployment.

## Entry point and data flow
- UI: `/knowledge/graph-search` linked from existing `/knowledge`.
- Engine: `src/lib/aceKnowledgeGraph.ts` (pure TypeScript, no network).
- Public materials: reuses `ACE_SEARCH_DOCUMENTS` from `aceLocalSearch.ts`; no parallel content master or new database.
- Relationships:
  - A small **hand-edited** set of conceptual links between existing ACE entry points.
  - Learning cards -> explicitly recorded category -> other learning cards. A shared category **does not** imply causation.
  - Optional device-local `ace-knowledge-canvas-v1` nodes and edges, read from this browser's `localStorage`; pre-existing Canvas remains the editor and source of truth.
- Retrieval: simple Japanese-normalized lexical/bigram matching -> at most four seed items -> undirected breadth-first traversal to max 2 hops -> ranked candidate links, displayed with the exact traversed relationship labels.
- Safety: cap Canvas import at 500 KB, 200 nodes, 400 edges; do not load remote models, upload notes, make API calls, or treat unverified inferred links as facts.

## Not implemented
- No Jev integration, TypeSafe AI account, Jev token, remote judgment calls, auto-extraction of ontology, LLM answers, confidence calibration or graph DB.
- No embedding search *inside* this page; the independent EmbeddingGemma 2 experiment stays at `/knowledge/local-search`.
- No cross-device sync, Drive ingestion, private Supabase data, automatic update of Canvas, or user-specific knowledge graph on the server.
- No causal inference; output labels explicitly identify candidate discovery and connection provenance.

## How to test
1. Visit `/knowledge/graph-search` from ACE Knowledge, including at 320/375/390/430 px widths.
2. Try `Questと成長記録`; verify direct matches + connected materials, each with readable path and source link.
3. In `/knowledge/map` create two nodes with a connection (optionally label it), then open or refresh Graph Explorer in **the same browser**. Search for the first node; the connected node should appear with its link label.
4. Open `/knowledge/local-search` to compare conventional semantic retrieval. AI model activation there remains manual.
5. `npm ci && npm run build`; `npx playwright test tests/e2e/knowledge-graph.spec.ts`.
6. Confirm no sideways scroll, buttons >= 44 px, inputs 16 px on an actual iPhone, and navigation works.

## Evaluation before further rollout
- Compile 20–30 human-reviewed concepts with traceable original sources and explicit link types, rather than automatically inventing links.
- Create a multi-hop question benchmark; record correct discovery, bad connections, source traceability, latency, memory, and (if added later) API cost.
- If deterministic traversal helps, consider a **pluggable** decision provider (local rule baseline versus Jev or another judgment model), with user approval for any private data egress and a server-side secret store. Never expose keys in browser code.
- Only then consider server-persisted nodes/edges in existing Supabase and MASA Agent OS integration; retain the standalone Canvas + embedding feature until regression and privacy checks pass.

## Current state
Draft PR only. Connector-authored commits; full Next.js build, Playwright, user-device verification, and production deployment are NOT claimed until verified.
