/* ACE local embeddings: no server-side inference or question uploads.
 * The Transformers.js runtime and model weights are downloaded ONLY after opt-in.
 * Index contains public ACE lesson metadata, never private Supabase records.
 */
const MODEL = "onnx-community/embeddinggemma-2-ONNX";
const LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm";
const DIMENSIONS = 256;
const DATABASE = "ace-local-search-v1";
let extractor = null;
let documents = [];
let vectors = [];
let initialising = false;
let ready = false;

function emit(type, payload = {}) {
  self.postMessage({ type, ...payload });
}

function fingerprint(items) {
  let hash = 2166136261;
  for (const item of items) {
    const value = item.id + "\u0000" + item.title + "\u0000" + item.text;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return "gemma2-q4-" + DIMENSIONS + "-" + (hash >>> 0).toString(16);
}

function normaliseVector(input) {
  const sliced = Array.from(input).slice(0, DIMENSIONS);
  const length = Math.sqrt(sliced.reduce((sum, value) => sum + value * value, 0)) || 1;
  return sliced.map((value) => value / length);
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in self)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("indexes");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCachedIndex(key) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("indexes", "readonly");
      const request = transaction.objectStore("indexes").get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function writeCachedIndex(key, index) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction("indexes", "readwrite");
      transaction.objectStore("indexes").put(index, key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function bootstrap(items) {
  if (initialising || ready) return;
  initialising = true;
  documents = items.filter((item) => typeof item.id === "string" && typeof item.text === "string" && typeof item.title === "string");
  if (!documents.length) throw new Error("検索対象が空です");
  emit("progress", { message: "AIライブラリを取得中（初回のみ通信）" });
  const library = await import(LIBRARY_URL);
  const gpuSupported = Boolean(self.navigator && self.navigator.gpu);
  const device = gpuSupported ? "webgpu" : "wasm";
  emit("progress", { message: "モデルを取得・初期化中（" + device + "）" });

  extractor = await library.pipeline("feature-extraction", MODEL, {
    device,
    dtype: "q4",
    progress_callback: (event) => {
      if (event && event.status === "progress" && typeof event.progress === "number") {
        emit("progress", { message: "モデルをダウンロード中: " + Math.round(event.progress) + "%" });
      }
    },
  });

  const key = fingerprint(documents);
  let cached = null;
  try {
    cached = await readCachedIndex(key);
  } catch (_) {
    // Private browsing and storage-denied browsers may not permit IndexedDB.
  }
  if (Array.isArray(cached) && cached.length === documents.length &&
    cached.every((vector) => Array.isArray(vector) && vector.length === DIMENSIONS)) {
    vectors = cached;
    ready = true;
    emit("ready", { count: documents.length, device, fromCache: true });
    return;
  }

  const texts = documents.map((doc) => "title: " + doc.title + " | text: " + doc.text);
  const built = [];
  for (let start = 0; start < texts.length; start += 4) {
    const chunk = texts.slice(start, start + 4);
    const tensor = await extractor(chunk, { pooling: "mean", normalize: true });
    const rows = tensor.tolist();
    for (const row of rows) built.push(normaliseVector(row));
    emit("progress", {
      message: "教材を索引化中: " + Math.min(start + 4, texts.length) + " / " + texts.length,
    });
  }
  vectors = built;
  ready = true;
  try {
    await writeCachedIndex(key, vectors);
  } catch (_) {
    // Embeddings remain usable in memory when persistent storage is unavailable.
  }
  emit("ready", { count: documents.length, device, fromCache: false });
}

async function semanticSearch(query, requestId) {
  if (!ready || !extractor) throw new Error("AIの初期化が完了していません");
  const tensor = await extractor("task: search result | query: " + query, {
    pooling: "mean",
    normalize: true,
  });
  const queryVector = normaliseVector(tensor.tolist()[0]);
  const ranking = vectors.map((vector, index) => {
    let score = 0;
    for (let i = 0; i < DIMENSIONS; i += 1) score += vector[i] * queryVector[i];
    return { id: documents[index].id, score };
  });
  ranking.sort((a, b) => b.score - a.score);
  emit("results", { requestId, matches: ranking.slice(0, 12) });
}

self.onmessage = async (event) => {
  const data = event.data || {};
  try {
    if (data.type === "init") await bootstrap(Array.isArray(data.documents) ? data.documents : []);
    if (data.type === "search") {
      const query = String(data.query || "").trim().slice(0, 500);
      if (query) await semanticSearch(query, data.requestId);
    }
  } catch (error) {
    initialising = false;
    emit("error", { requestId: data.requestId, message: error instanceof Error ? error.message : "AIの起動に失敗しました" });
  }
};
