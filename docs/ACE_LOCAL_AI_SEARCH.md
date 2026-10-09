# ACE Knowledge — EmbeddingGemma 2 local search MVP

## Status (2026-10-10)
Implemented as an opt-in experiment on the existing Knowledge layer, not a replacement for private Knowledge Ask or GraphRAG.

- UI: /knowledge/local-search
- Entry: /knowledge → 端末内AI検索（実験版）
- Data: the public, already-bundled DAILY_QUIZZES plus a small set of ACE route guides. No Supabase private records or Google Drive files are indexed.
- Without AI: local Japanese bigram / substring search works immediately and downloads no AI model.
- With AI: pressing the start button creates a module Web Worker, loads Transformers.js 4.3.1 from jsDelivr, and the official ONNX community port of EmbeddingGemma 2 from Hugging Face. Runs feature-extraction in the browser (WebGPU if exposed to Worker, otherwise WASM).
- Embeddings: 256-dimensional truncated / normalized vectors for search, cached in browser IndexedDB. Model files are cached by the browser/runtime subject to quota.
- Query prefix: task: search result | query: [query]. Documents use title: [title] | text: [text]. Scores are cosine similarities via dot product.
- No app-hosted vector DB, embedding server, backend key, or background model download is required.

## What the MVP does not promise
- It is NOT verified yet on a physical iPhone or with a downloaded model. Module CDN/CORS, model availability, memory and WASM support must be verified on real devices. Build success alone is not AI runtime success.
- Offline use after first download depends on CDN/runtime model caching, browser storage policies, and the application's shell caching. It is NOT guaranteed fully offline.
- The whole service is not free for one million users: static asset bandwidth and model distribution can still have costs.
- Model startup may download hundreds of MB and can use much more memory than the compressed weights.
- Relevance percentages are cosine similarity multiplied by 100, not calibrated confidence.
- Quiz results link to /today rather than to a deep-linked quiz identifier.

## Validation checklist
1. Run npm ci && npm run build && npm run test:e2e.
2. On iPhone (320/375/390/430px widths): check no horizontal overflow; type a phrase, press search, tap a result.
3. With adequate Wi-Fi and free storage: tap 端末内AIを起動, observe runtime / indexing status, then submit a query. Confirm semantic mode appears and results link to real routes.
4. Toggle airplane mode after model cache and test explicitly; do not label the feature offline unless it passes.
5. Confirm loading failures fall back to keyword search without losing input. Test Safari as well as Chromium.

## Next improvements
- Ship the runtime with pinned npm lockfile or self-host verified ESM assets after model PoC.
- Measure initial download, cold start, query latency, peak memory, failure rate, precision@5 vs keyword search.
- Add an opt-in, authenticated, per-user private index only with deliberate data-access and storage controls.
- If the model is too heavy on iPhone, offer a smaller text embedding model while keeping EmbeddingGemma 2 on supported hardware.
