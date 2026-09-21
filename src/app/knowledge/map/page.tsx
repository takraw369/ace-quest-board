"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_ROUTES } from "@/lib/appRoutes";

type NodeType = "idea" | "question" | "asset" | "action";

type CanvasNode = {
  id: string;
  title: string;
  body: string;
  x: number;
  y: number;
  type: NodeType;
  tags: string[];
};

type CanvasEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

type CanvasState = {
  version: 1;
  title: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  updatedAt: string;
};

const STORAGE_KEY = "ace-knowledge-canvas-v1";
const NODE_W = 240;
const NODE_H = 132;

const typeMeta: Record<NodeType, { label: string; icon: string; className: string }> = {
  idea: { label: "IDEA", icon: "✦", className: "border-[#ff8a1f]/35 bg-[#ff8a1f]/[0.08]" },
  question: { label: "QUESTION", icon: "?", className: "border-[#7ba6ff]/35 bg-[#7ba6ff]/[0.08]" },
  asset: { label: "ASSET", icon: "◆", className: "border-[#68d6a3]/35 bg-[#68d6a3]/[0.08]" },
  action: { label: "ACTION", icon: "→", className: "border-[#d68cff]/35 bg-[#d68cff]/[0.08]" },
};

const seedNodes: CanvasNode[] = [
  { id: "core", title: "MASA Knowledge Canvas", body: "思考・資料・問い・行動を、1枚の地図に置く。", x: 760, y: 560, type: "idea", tags: ["core"] },
  { id: "input", title: "Input", body: "会話 / Drive / URL / 本 / 体験", x: 390, y: 350, type: "asset", tags: ["source"] },
  { id: "meaning", title: "意味をつなぐ", body: "共通構造・因果・関連性を線でつなぐ。", x: 1100, y: 350, type: "question", tags: ["thinking"] },
  { id: "output", title: "次の一手", body: "発信 / Quest / 商品 / 実装へ変換する。", x: 760, y: 820, type: "action", tags: ["next-action"] },
];

const seedEdges: CanvasEdge[] = [
  { id: "e-input-core", source: "input", target: "core" },
  { id: "e-core-meaning", source: "core", target: "meaning" },
  { id: "e-core-output", source: "core", target: "output" },
];

const seedState: CanvasState = {
  version: 1,
  title: "Knowledge Canvas",
  nodes: seedNodes,
  edges: seedEdges,
  viewport: { x: -430, y: -250, zoom: 0.9 },
  updatedAt: new Date(0).toISOString(),
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function toMarkdown(state: CanvasState) {
  const nodeMap = new Map(state.nodes.map((node) => [node.id, node]));
  const lines = [
    `# ${state.title}`,
    "",
    `Updated: ${state.updatedAt}`,
    "",
    "## Nodes",
    "",
  ];

  for (const node of state.nodes) {
    lines.push(`### ${node.title}`);
    lines.push(`- id: ${node.id}`);
    lines.push(`- type: ${node.type}`);
    if (node.tags.length) lines.push(`- tags: ${node.tags.join(", ")}`);
    if (node.body.trim()) lines.push(`- note: ${node.body.trim()}`);
    lines.push("");
  }

  lines.push("## Relationships", "");
  if (!state.edges.length) {
    lines.push("- none");
  } else {
    for (const edge of state.edges) {
      const from = nodeMap.get(edge.source)?.title ?? edge.source;
      const to = nodeMap.get(edge.target)?.title ?? edge.target;
      lines.push(`- ${from} -> ${to}${edge.label ? ` (${edge.label})` : ""}`);
    }
  }

  lines.push(
    "",
    "## AI instruction",
    "",
    "Treat this canvas as a graph, not a flat note. Preserve node meanings and relationships. Look for clusters, missing links, contradictions, leverage points, reusable assets, and concrete next actions."
  );

  return lines.join("\n");
}

export default function KnowledgeMapPage() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<{ id: string; clientX: number; clientY: number; x: number; y: number } | null>(null);
  const panRef = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);

  const [title, setTitle] = useState(seedState.title);
  const [nodes, setNodes] = useState<CanvasNode[]>(seedState.nodes);
  const [edges, setEdges] = useState<CanvasEdge[]>(seedState.edges);
  const [viewport, setViewport] = useState<Viewport>(seedState.viewport);
  const [selectedId, setSelectedId] = useState<string | null>("core");
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState("ローカル保存");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<CanvasState>;
        if (saved.version === 1 && Array.isArray(saved.nodes) && Array.isArray(saved.edges)) {
          setTitle(typeof saved.title === "string" ? saved.title : seedState.title);
          setNodes(saved.nodes);
          setEdges(saved.edges);
          if (saved.viewport) setViewport(saved.viewport);
          setSelectedId(saved.nodes[0]?.id ?? null);
        }
      }
    } catch {
      setStatus("保存データ読込エラー");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      const state: CanvasState = {
        version: 1,
        title,
        nodes,
        edges,
        viewport,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStatus(`保存済み ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [title, nodes, edges, viewport, hydrated]);

  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const graphState = useMemo<CanvasState>(
    () => ({ version: 1, title, nodes, edges, viewport, updatedAt: new Date().toISOString() }),
    [title, nodes, edges, viewport]
  );
  const aiText = useMemo(() => toMarkdown(graphState), [graphState]);

  const worldPointAtCanvasCenter = () => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 800, y: 600 };
    return {
      x: (rect.width / 2 - viewport.x) / viewport.zoom,
      y: (rect.height / 2 - viewport.y) / viewport.zoom,
    };
  };

  const addNode = (type: NodeType = "idea") => {
    const center = worldPointAtCanvasCenter();
    const id = makeId("node");
    const node: CanvasNode = {
      id,
      title: type === "question" ? "新しい問い" : type === "action" ? "次の一手" : type === "asset" ? "新しい資料" : "新しいアイデア",
      body: "",
      x: center.x - NODE_W / 2 + Math.random() * 60 - 30,
      y: center.y - NODE_H / 2 + Math.random() * 60 - 30,
      type,
      tags: [],
    };
    setNodes((current) => [...current, node]);
    setSelectedId(id);
  };

  const updateSelected = (patch: Partial<CanvasNode>) => {
    if (!selectedId) return;
    setNodes((current) => current.map((node) => (node.id === selectedId ? { ...node, ...patch } : node)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setSelectedId(null);
    setConnectSource((current) => (current === selectedId ? null : current));
  };

  const handleNodeClick = (id: string) => {
    setSelectedId(id);
    if (!connectMode) return;
    if (!connectSource) {
      setConnectSource(id);
      setStatus("接続先を選択");
      return;
    }
    if (connectSource === id) {
      setConnectSource(null);
      setStatus("接続元を解除");
      return;
    }
    const exists = edges.some(
      (edge) => (edge.source === connectSource && edge.target === id) || (edge.source === id && edge.target === connectSource)
    );
    if (!exists) {
      setEdges((current) => [...current, { id: makeId("edge"), source: connectSource, target: id }]);
    }
    setConnectSource(null);
    setStatus("接続しました");
  };

  const onNodePointerDown = (event: React.PointerEvent<HTMLDivElement>, node: CanvasNode) => {
    event.stopPropagation();
    if (connectMode) return;
    dragRef.current = { id: node.id, clientX: event.clientX, clientY: event.clientY, x: node.x, y: node.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(node.id);
  };

  const onNodePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.clientX) / viewport.zoom;
    const dy = (event.clientY - drag.clientY) / viewport.zoom;
    setNodes((current) => current.map((node) => (node.id === drag.id ? { ...node, x: drag.x + dx, y: drag.y + dy } : node)));
  };

  const onNodePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    panRef.current = { clientX: event.clientX, clientY: event.clientY, x: viewport.x, y: viewport.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(null);
  };

  const onCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const pan = panRef.current;
    if (!pan) return;
    setViewport((current) => ({ ...current, x: pan.x + event.clientX - pan.clientX, y: pan.y + event.clientY - pan.clientY }));
  };

  const onCanvasPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (panRef.current) {
      panRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const worldX = (cursorX - viewport.x) / viewport.zoom;
    const worldY = (cursorY - viewport.y) / viewport.zoom;
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    const zoom = clamp(viewport.zoom * factor, 0.35, 2.2);
    setViewport({ x: cursorX - worldX * zoom, y: cursorY - worldY * zoom, zoom });
  };

  const resetView = () => setViewport(seedState.viewport);

  const download = (filename: string, text: string, mime = "text/plain") => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => download("knowledge-canvas.json", JSON.stringify(graphState, null, 2), "application/json");
  const exportMarkdown = () => download("knowledge-canvas-ai.md", aiText, "text/markdown");

  const copyAiContext = async () => {
    await navigator.clipboard.writeText(aiText);
    setStatus("AI用Markdownをコピー");
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as CanvasState;
      if (parsed.version !== 1 || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error("invalid");
      setTitle(parsed.title || "Knowledge Canvas");
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      setViewport(parsed.viewport || seedState.viewport);
      setSelectedId(parsed.nodes[0]?.id ?? null);
      setStatus("JSONを読み込みました");
    } catch {
      setStatus("JSON形式を確認してください");
    }
  };

  const removeEdge = (id: string) => setEdges((current) => current.filter((edge) => edge.id !== id));

  return (
    <div className="min-h-screen overflow-hidden bg-[#070b12] text-[#edf2f8] selection:bg-[#ff8a1f]/30">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-[#0a0f18]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1800px] items-center gap-3 px-3 md:px-5">
          <Link href={APP_ROUTES.knowledge} className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-sm text-[#aeb8c7] hover:bg-white/[0.07]">←</Link>
          <div className="min-w-0 flex-1">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full bg-transparent text-sm font-bold outline-none md:text-base" aria-label="Canvas title" />
            <div className="text-[9px] font-semibold tracking-[.16em] text-[#68768b]">KNOWLEDGE CANVAS · {status}</div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={() => addNode("idea")} className="rounded-xl bg-[#ff8a1f] px-3 py-2 text-xs font-bold text-[#08101a]">＋ Idea</button>
            <button onClick={() => setConnectMode((value) => !value)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${connectMode ? "border-[#ff8a1f]/50 bg-[#ff8a1f]/10 text-[#ffad62]" : "border-white/[0.09] bg-white/[0.03] text-[#b7c2d1]"}`}>⌁ Connect</button>
            <button onClick={() => setAiOpen(true)} className="rounded-xl border border-[#68d6a3]/30 bg-[#68d6a3]/[0.07] px-3 py-2 text-xs font-bold text-[#8de4b9]">AI View</button>
          </div>
        </div>
      </header>

      <div className="fixed inset-x-0 bottom-20 top-16 md:bottom-0">
        <div
          ref={canvasRef}
          className="absolute inset-0 cursor-grab overflow-hidden active:cursor-grabbing"
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
          onWheel={onWheel}
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,.09) 1px, transparent 1px)",
            backgroundSize: `${28 * viewport.zoom}px ${28 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "0 0" }}>
            <svg className="absolute left-0 top-0 h-[2400px] w-[3200px] overflow-visible">
              {edges.map((edge) => {
                const source = nodes.find((node) => node.id === edge.source);
                const target = nodes.find((node) => node.id === edge.target);
                if (!source || !target) return null;
                const x1 = source.x + NODE_W / 2;
                const y1 = source.y + NODE_H / 2;
                const x2 = target.x + NODE_W / 2;
                const y2 = target.y + NODE_H / 2;
                const bend = Math.max(60, Math.abs(x2 - x1) * 0.35);
                const path = `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
                return <path key={edge.id} d={path} fill="none" stroke="rgba(161,174,194,.42)" strokeWidth="2" strokeLinecap="round" />;
              })}
            </svg>
          </div>

          <div className="absolute inset-0" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: "0 0" }}>
            {nodes.map((node) => {
              const meta = typeMeta[node.type];
              const active = selectedId === node.id;
              const source = connectSource === node.id;
              return (
                <div
                  key={node.id}
                  className={`absolute select-none rounded-[22px] border p-4 shadow-xl shadow-black/20 backdrop-blur-sm transition-[box-shadow,border-color] ${meta.className} ${active ? "ring-2 ring-white/30" : ""} ${source ? "ring-2 ring-[#ff8a1f]" : ""}`}
                  style={{ left: node.x, top: node.y, width: NODE_W, minHeight: NODE_H, touchAction: "none" }}
                  onPointerDown={(event) => onNodePointerDown(event, node)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp}
                  onPointerCancel={onNodePointerUp}
                  onClick={(event) => { event.stopPropagation(); handleNodeClick(node.id); }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[9px] font-bold tracking-[.15em] text-[#9eabbd]"><span className="text-sm">{meta.icon}</span>{meta.label}</div>
                    <div className="h-1.5 w-1.5 rounded-full bg-white/25" />
                  </div>
                  <div className="mt-3 line-clamp-2 font-semibold leading-5 text-[#edf2f8]">{node.title || "Untitled"}</div>
                  <div className="mt-2 line-clamp-3 text-[11px] leading-5 text-[#9ba7b8]">{node.body || "クリックして内容を編集"}</div>
                  {node.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{node.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded-full bg-black/20 px-2 py-0.5 text-[8px] text-[#aab5c5]">#{tag}</span>)}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute left-3 top-3 z-30 flex flex-col gap-2 md:left-5 md:top-5">
          <div className="flex rounded-2xl border border-white/[0.08] bg-[#0b111b]/88 p-1 shadow-xl backdrop-blur-xl">
            <button onClick={() => setViewport((current) => ({ ...current, zoom: clamp(current.zoom * 1.15, 0.35, 2.2) }))} className="h-9 w-9 rounded-xl text-sm text-[#c5cfdd] hover:bg-white/[0.06]">＋</button>
            <button onClick={() => setViewport((current) => ({ ...current, zoom: clamp(current.zoom / 1.15, 0.35, 2.2) }))} className="h-9 w-9 rounded-xl text-sm text-[#c5cfdd] hover:bg-white/[0.06]">−</button>
            <button onClick={resetView} className="h-9 rounded-xl px-3 text-[10px] font-bold text-[#8e9aac] hover:bg-white/[0.06]">FIT</button>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-[#0b111b]/80 px-3 py-2 text-[9px] text-[#718096] backdrop-blur">{Math.round(viewport.zoom * 100)}%</div>
        </div>

        {selected && (
          <aside className="absolute right-3 top-3 z-30 hidden w-[310px] rounded-[24px] border border-white/[0.09] bg-[#0c121d]/94 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl md:block">
            <div className="flex items-center justify-between"><div className="text-[9px] font-bold tracking-[.18em] text-[#718096]">NODE INSPECTOR</div><button onClick={deleteSelected} className="rounded-lg px-2 py-1 text-[10px] text-[#d38f95] hover:bg-[#d38f95]/10">削除</button></div>
            <label className="mt-4 block text-[9px] font-bold text-[#68768b]">TITLE</label>
            <input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-sm outline-none focus:border-[#ff8a1f]/40" />
            <label className="mt-4 block text-[9px] font-bold text-[#68768b]">NOTE</label>
            <textarea value={selected.body} onChange={(event) => updateSelected({ body: event.target.value })} rows={5} className="mt-1 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#ff8a1f]/40" />
            <label className="mt-4 block text-[9px] font-bold text-[#68768b]">TYPE</label>
            <div className="mt-2 grid grid-cols-4 gap-1">{(Object.keys(typeMeta) as NodeType[]).map((type) => <button key={type} onClick={() => updateSelected({ type })} className={`rounded-lg border px-1 py-2 text-[9px] ${selected.type === type ? "border-white/25 bg-white/10 text-white" : "border-white/[0.06] text-[#7f8ca0]"}`}>{typeMeta[type].icon}</button>)}</div>
            <label className="mt-4 block text-[9px] font-bold text-[#68768b]">TAGS</label>
            <input value={selected.tags.join(", ")} onChange={(event) => updateSelected({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="brain, health, product" className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-3 py-2.5 text-xs outline-none focus:border-[#ff8a1f]/40" />
            <div className="mt-5 border-t border-white/[0.07] pt-4">
              <div className="mb-2 text-[9px] font-bold tracking-[.16em] text-[#68768b]">RELATIONSHIPS</div>
              <div className="space-y-1">{edges.filter((edge) => edge.source === selected.id || edge.target === selected.id).map((edge) => { const otherId = edge.source === selected.id ? edge.target : edge.source; const other = nodes.find((node) => node.id === otherId); return <button key={edge.id} onClick={() => removeEdge(edge.id)} className="flex w-full items-center justify-between rounded-lg bg-white/[0.025] px-2.5 py-2 text-left text-[10px] text-[#9aa6b8]"><span className="truncate">⌁ {other?.title ?? otherId}</span><span className="text-[#6f7c8f]">×</span></button>; })}</div>
            </div>
          </aside>
        )}
      </div>

      <div className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.10] bg-[#0b111d]/94 p-1.5 shadow-2xl backdrop-blur-xl md:hidden">
        <button onClick={() => addNode("idea")} className="rounded-xl bg-[#ff8a1f] py-2.5 text-[10px] font-bold text-[#07111d]">＋ IDEA</button>
        <button onClick={() => setConnectMode((value) => !value)} className={`rounded-xl py-2.5 text-[10px] font-bold ${connectMode ? "bg-[#ff8a1f]/12 text-[#ffad62]" : "bg-white/[0.04] text-[#aab5c5]"}`}>⌁ LINK</button>
        <button onClick={() => setAiOpen(true)} className="rounded-xl bg-[#68d6a3]/[0.08] py-2.5 text-[10px] font-bold text-[#86dfb3]">AI</button>
        <button onClick={() => selected ? setAiOpen(false) : addNode("action")} className="rounded-xl bg-white/[0.04] py-2.5 text-[10px] font-bold text-[#aab5c5]">→ ACTION</button>
      </div>

      <div className="fixed bottom-5 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/[0.09] bg-[#0b111b]/92 p-1.5 shadow-2xl backdrop-blur-xl md:flex">
        {(Object.keys(typeMeta) as NodeType[]).map((type) => <button key={type} onClick={() => addNode(type)} className="rounded-xl px-3 py-2 text-[10px] font-bold text-[#9da9ba] hover:bg-white/[0.06] hover:text-white">{typeMeta[type].icon} {typeMeta[type].label}</button>)}
      </div>

      {aiOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-3 backdrop-blur-sm" onMouseDown={() => setAiOpen(false)}>
          <section className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-white/[0.10] bg-[#0b111b] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div><div className="text-[9px] font-bold tracking-[.18em] text-[#68d6a3]">AI READABLE VIEW</div><h2 className="mt-1 font-serif text-xl font-semibold">キャンバスを構造として渡す</h2></div>
              <button onClick={() => setAiOpen(false)} className="h-9 w-9 rounded-xl bg-white/[0.04] text-[#8895a7]">×</button>
            </div>
            <div className="grid min-h-0 flex-1 md:grid-cols-[1fr_230px]">
              <textarea readOnly value={aiText} className="min-h-[430px] resize-none bg-[#080d15] p-5 font-mono text-[11px] leading-6 text-[#b7c2d1] outline-none" />
              <div className="border-l border-white/[0.08] p-4">
                <div className="text-xs font-bold">AIへ渡す方法</div>
                <p className="mt-2 text-[11px] leading-5 text-[#8290a3]">見た目のスクショではなく、ノードと線をMarkdown/JSONに変換します。これなら関係性まで読めます。</p>
                <button onClick={copyAiContext} className="mt-4 w-full rounded-xl bg-[#68d6a3] px-3 py-2.5 text-xs font-bold text-[#07121b]">Markdownをコピー</button>
                <button onClick={exportMarkdown} className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5 text-xs font-bold">.md 書き出し</button>
                <button onClick={exportJson} className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5 text-xs font-bold">.json 書き出し</button>
                <button onClick={() => fileInputRef.current?.click()} className="mt-2 w-full rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5 text-xs font-bold">JSON 読み込み</button>
                <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importJson(file); event.currentTarget.value = ""; }} />
                <div className="mt-5 rounded-xl border border-[#ff8a1f]/20 bg-[#ff8a1f]/[0.05] p-3 text-[10px] leading-5 text-[#bda58d]">次段階ではDriveへ自動同期し、GPTが正本として直接参照できるようにする設計です。</div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
