import { ACE_SEARCH_DOCUMENTS } from "@/lib/aceLocalSearch";

/**
 * Lightweight, explainable graph retrieval over existing ACE public lessons
 * and (optionally) this browser's Knowledge Canvas.
 *
 * This is NOT a Jev or LLM integration. No model, network request, automated
 * relationship extraction, or personal-data upload occurs in this module.
 */
export type KnowledgeGraphNode = {
  id: string;
  title: string;
  text: string;
  kind: "material" | "topic" | "canvas";
  href?: string;
  source: "ace" | "canvas";
};
export type KnowledgeGraphEdge = {
  source: string;
  target: string;
  label: string;
  basis: "editorial" | "category" | "user";
};
export type KnowledgeGraph = {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
};
export type GraphSearchHit = {
  node: KnowledgeGraphNode;
  score: number;
  hops: number;
  path: { node: KnowledgeGraphNode; via?: string }[];
  basis: "direct" | "connection";
};

type CanvasLike = {
  version?: unknown;
  nodes?: unknown;
  edges?: unknown;
};

const editorLinks: Array<[string, string, string]> = [
  ["ace-dictionary", "ace-calibration", "困りごとを現在地の確認へ"],
  ["ace-dictionary", "ace-knowledge", "困りごとから教材へ"],
  ["ace-calibration", "ace-quest", "現在地から実践へ"],
  ["ace-quest", "ace-athlete", "実践を練習日誌へ"],
  ["ace-athlete", "ace-myself", "振り返りを成長記録へ"],
  ["ace-quest", "ace-myself", "Questの証拠を記録"],
  ["ace-knowledge", "ace-quest", "教材を実践へ"],
];

/** Exported only for deterministic tests / reuse in other ACE surfaces. */
export function buildAceKnowledgeGraph(canvas?: unknown): KnowledgeGraph {
  const nodes: KnowledgeGraphNode[] = ACE_SEARCH_DOCUMENTS.map((doc) => ({
    id: doc.id,
    title: doc.title,
    text: doc.text,
    kind: "material",
    href: doc.href,
    source: "ace",
  }));
  const edges: KnowledgeGraphEdge[] = editorLinks.map(([source, target, label]) => ({
    source,
    target,
    label,
    basis: "editorial",
  }));

  const topicIds = new Set<string>();
  for (const doc of ACE_SEARCH_DOCUMENTS) {
    if (!doc.category.startsWith("学習カード / ")) continue;
    const topicId = "topic:" + doc.category;
    if (!topicIds.has(topicId)) {
      topicIds.add(topicId);
      nodes.push({
        id: topicId,
        title: doc.category,
        text: "教材データに明記された分類。同じ分類は関連候補であり、因果関係を意味しません。",
        kind: "topic",
        source: "ace",
      });
      edges.push({ source: "ace-knowledge", target: topicId, label: "教材の分類", basis: "category" });
    }
    edges.push({ source: topicId, target: doc.id, label: "同じ教材分野", basis: "category" });
  }

  // The Knowledge Canvas lives in this browser's localStorage. Only the
  // caller may provide its parsed data; nothing is transmitted to a server.
  const parsed = canvas as CanvasLike | null;
  if (parsed?.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
    return { nodes, edges };
  }
  const canvasIds = new Set<string>();
  for (const candidate of parsed.nodes.slice(0, 200)) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (typeof item.id !== "string" || !item.id || typeof item.title !== "string" || !item.title.trim()) continue;
    const id = "canvas:" + item.id.slice(0, 120);
    if (canvasIds.has(id)) continue;
    canvasIds.add(id);
    nodes.push({
      id,
      title: item.title.slice(0, 180),
      text: (typeof item.body === "string" ? item.body : "").slice(0, 1200) +
        (Array.isArray(item.tags) ? " " + item.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 20).join(" ") : ""),
      kind: "canvas",
      href: "/knowledge/map",
      source: "canvas",
    });
  }
  for (const candidate of parsed.edges.slice(0, 400)) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    if (typeof item.source !== "string" || typeof item.target !== "string") continue;
    const source = "canvas:" + item.source.slice(0, 120);
    const target = "canvas:" + item.target.slice(0, 120);
    if (source === target || !canvasIds.has(source) || !canvasIds.has(target)) continue;
    edges.push({
      source,
      target,
      label: typeof item.label === "string" && item.label.trim() ? item.label.slice(0, 80) : "Canvasで接続",
      basis: "user",
    });
  }
  return { nodes, edges };
}

function normalise(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, "").trim();
}

function grams(value: string): Set<string> {
  const chars = Array.from(normalise(value).replace(/[、。，．！？!?,;:：/]/g, ""));
  const items = new Set<string>();
  if (chars.length === 1) items.add(chars[0]);
  for (let i = 0; i < chars.length - 1; i++) items.add(chars[i] + chars[i + 1]);
  return items;
}

function matchScore(query: string, node: KnowledgeGraphNode): number {
  if (node.kind === "topic") return 0; // Topic is a bridge, not an answer.
  const q = normalise(query);
  if (!q) return 0;
  const title = normalise(node.title);
  const body = normalise(node.text);
  const qGrams = grams(q);
  const titleGrams = grams(title);
  const bodyGrams = grams(body);
  let titleOverlap = 0;
  let bodyOverlap = 0;
  for (const g of qGrams) {
    if (titleGrams.has(g)) titleOverlap++;
    if (bodyGrams.has(g)) bodyOverlap++;
  }
  const n = Math.max(qGrams.size, 1);
  return (title.includes(q) ? 6 : 0) + (body.includes(q) ? 3 : 0) + titleOverlap / n * 3 + bodyOverlap / n * 1.5;
}

/** At most 2 hops, preserving human-readable relation paths. */
export function searchAceKnowledgeGraph(graph: KnowledgeGraph, query: string, limit = 12): GraphSearchHit[] {
  if (!query.trim()) return [];
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = new Map<string, Array<{ next: string; label: string }>>();
  for (const edge of graph.edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue;
    for (const [from, to] of [[edge.source, edge.target], [edge.target, edge.source]]) {
      const current = adjacency.get(from) || [];
      current.push({ next: to, label: edge.label });
      adjacency.set(from, current);
    }
  }

  const seeds = graph.nodes
    .map((node) => ({ node, score: matchScore(query, node) }))
    .filter((item) => item.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const best = new Map<string, GraphSearchHit>();
  for (const seed of seeds) {
    const queue: Array<{ id: string; path: GraphSearchHit["path"]; hops: number }> = [
      { id: seed.node.id, path: [{ node: seed.node }], hops: 0 },
    ];
    const visited = new Set<string>([seed.node.id]);
    while (queue.length) {
      const current = queue.shift()!;
      const node = byId.get(current.id)!;
      const score = seed.score * Math.pow(0.35, current.hops);
      if (node.kind !== "topic") {
        const old = best.get(node.id);
        if (!old || score > old.score || (score === old.score && current.hops < old.hops)) {
          best.set(node.id, {
            node,
            score,
            hops: current.hops,
            path: current.path,
            basis: current.hops === 0 ? "direct" : "connection",
          });
        }
      }
      if (current.hops === 2) continue;
      for (const edge of adjacency.get(current.id) || []) {
        if (visited.has(edge.next)) continue;
        const next = byId.get(edge.next);
        if (!next) continue;
        visited.add(edge.next);
        queue.push({
          id: edge.next,
          hops: current.hops + 1,
          path: [...current.path, { node: next, via: edge.label }],
        });
      }
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.hops - b.hops || a.node.id.localeCompare(b.node.id))
    .slice(0, Math.max(1, Math.min(limit, 30)));
}
