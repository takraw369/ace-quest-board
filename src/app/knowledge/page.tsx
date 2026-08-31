"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { APP_ROUTES } from "@/lib/appRoutes";
import {
  beginGoogleLogin,
  getAccessToken,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/auth/supabaseAuth";

type CanonicalDocument = {
  id: string;
  repo: string;
  branch: string;
  path: string;
  blob_sha: string;
  title: string;
  domain?: string | null;
  document_type: string;
  summary?: string | null;
  content: string;
  source_url: string;
  canonical: boolean;
  synced_at: string;
  updated_at: string;
};

type KnowledgeItem = {
  id: string;
  slug?: string | null;
  title: string;
  layer?: string | null;
  item_type?: string | null;
  domain?: string | null;
  summary?: string | null;
  content?: string | null;
  evidence_level?: string | null;
  confidence?: number | null;
  visibility?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

type Alias = { knowledge_id: string; alias: string };

type Source = {
  id: string;
  source_type: string;
  title?: string | null;
  url?: string | null;
  author?: string | null;
  published_at?: string | null;
  raw_text?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
};

type KnowledgeSource = {
  knowledge_id: string;
  source_id: string;
  relation: string;
  note?: string | null;
};

type Project = {
  id: string;
  slug: string;
  name: string;
  layer?: string | null;
  purpose?: string | null;
  status: string;
  priority: string;
  next_milestone?: string | null;
  source_url?: string | null;
  metadata?: Record<string, unknown> | null;
  updated_at?: string | null;
};

type WantLink = {
  knowledge_id: string;
  relation?: string | null;
  confidence?: number | null;
  reason?: string | null;
  want_to_items?: {
    id?: string;
    external_id?: string;
    title?: string;
    category?: string;
    theme?: string;
    center_pin_score?: number;
  } | null;
};

type QuestLink = {
  knowledge_id: string;
  role?: string | null;
  sort_order?: number | null;
  quests?: {
    id?: string;
    external_id?: string;
    title?: string;
    summary?: string;
    app_status?: string;
  } | null;
};

type Tab = "recent" | "knowledge" | "projects" | "sources";

type Selection =
  | { kind: "document"; value: CanonicalDocument }
  | { kind: "node"; value: KnowledgeItem }
  | { kind: "project"; value: Project }
  | { kind: "source"; value: Source }
  | null;

const tabs: Array<{ key: Tab; label: string; kanji: string }> = [
  { key: "recent", label: "Recent", kanji: "新" },
  { key: "knowledge", label: "Knowledge", kanji: "知" },
  { key: "projects", label: "Projects", kanji: "進" },
  { key: "sources", label: "Sources", kanji: "源" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function searchText(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

async function getJson<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Knowledge OS fetch failed: ${response.status}${body ? ` / ${body.slice(0, 120)}` : ""}`,
    );
  }

  return response.json();
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<CanonicalDocument[]>([]);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [wantLinks, setWantLinks] = useState<WantLink[]>([]);
  const [questLinks, setQuestLinks] = useState<QuestLink[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("recent");
  const [selected, setSelected] = useState<Selection>(null);
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (alive) setLoginRequired(true);
          return;
        }

        const [docs, knowledge, aliasData, sourceData, sourceLinks, projectData, wants, quests] =
          await Promise.all([
            getJson<CanonicalDocument[]>(
              "knowledge_documents?select=id,repo,branch,path,blob_sha,title,domain,document_type,summary,content,source_url,canonical,synced_at,updated_at&canonical=eq.true&order=updated_at.desc",
              accessToken,
            ),
            getJson<KnowledgeItem[]>(
              "knowledge_items?select=id,slug,title,layer,item_type,domain,summary,content,evidence_level,confidence,visibility,status,updated_at&order=updated_at.desc",
              accessToken,
            ),
            getJson<Alias[]>("knowledge_aliases?select=knowledge_id,alias", accessToken),
            getJson<Source[]>(
              "sources?select=id,source_type,title,url,author,published_at,raw_text,metadata,created_at&order=created_at.desc",
              accessToken,
            ),
            getJson<KnowledgeSource[]>(
              "knowledge_sources?select=knowledge_id,source_id,relation,note",
              accessToken,
            ),
            getJson<Project[]>(
              "os_projects?select=id,slug,name,layer,purpose,status,priority,next_milestone,source_url,metadata,updated_at&order=updated_at.desc",
              accessToken,
            ),
            getJson<WantLink[]>(
              "want_to_knowledge?select=knowledge_id,relation,confidence,reason,want_to_items(id,external_id,title,category,theme,center_pin_score)&order=confidence.desc",
              accessToken,
            ),
            getJson<QuestLink[]>(
              "quest_knowledge?select=knowledge_id,role,sort_order,quests(id,external_id,title,summary,app_status)&order=sort_order.asc",
              accessToken,
            ),
          ]);

        if (!alive) return;
        setDocuments(docs || []);
        setItems(knowledge || []);
        setAliases(aliasData || []);
        setSources(sourceData || []);
        setKnowledgeSources(sourceLinks || []);
        setProjects(projectData || []);
        setWantLinks(wants || []);
        setQuestLinks(quests || []);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Knowledge OSに接続できません");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const aliasMap = useMemo(() => {
    const map = new Map<string, string[]>();
    aliases.forEach((alias) => {
      map.set(alias.knowledge_id, [...(map.get(alias.knowledge_id) || []), alias.alias]);
    });
    return map;
  }, [aliases]);

  const sourceMap = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );

  const q = query.trim().toLowerCase();

  const filteredDocuments = useMemo(() => {
    if (!q) return documents;
    return documents.filter((doc) =>
      searchText([doc.title, doc.summary, doc.content, doc.domain, doc.path, doc.document_type]).includes(q),
    );
  }, [documents, q]);

  const filteredItems = useMemo(() => {
    if (!q) return items;
    return items.filter((item) =>
      searchText([
        item.title,
        item.summary,
        item.content,
        item.domain,
        item.layer,
        item.item_type,
        ...(aliasMap.get(item.id) || []),
      ]).includes(q),
    );
  }, [items, q, aliasMap]);

  const filteredProjects = useMemo(() => {
    if (!q) return projects;
    return projects.filter((project) =>
      searchText([
        project.name,
        project.slug,
        project.layer,
        project.purpose,
        project.status,
        project.priority,
        project.next_milestone,
      ]).includes(q),
    );
  }, [projects, q]);

  const filteredSources = useMemo(() => {
    if (!q) return sources;
    return sources.filter((source) =>
      searchText([source.title, source.source_type, source.author, source.url, source.raw_text]).includes(q),
    );
  }, [sources, q]);

  const selectedNodeSources =
    selected?.kind === "node"
      ? knowledgeSources
          .filter((link) => link.knowledge_id === selected.value.id)
          .map((link) => ({ link, source: sourceMap.get(link.source_id) }))
          .filter((entry) => entry.source)
      : [];

  const selectedWants =
    selected?.kind === "node"
      ? wantLinks.filter((link) => link.knowledge_id === selected.value.id && link.want_to_items)
      : [];

  const selectedQuests =
    selected?.kind === "node"
      ? questLinks.filter((link) => link.knowledge_id === selected.value.id && link.quests)
      : [];

  const visibleCount =
    tab === "projects"
      ? filteredProjects.length
      : tab === "sources"
        ? filteredSources.length
        : filteredDocuments.length + filteredItems.length;

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e8edf5] selection:bg-[#ff8a1f]/25">
      <div
        className="pointer-events-none fixed inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 10%,rgba(255,138,31,.08),transparent 28%),radial-gradient(circle at 85% 70%,rgba(74,107,155,.12),transparent 34%)",
        }}
      />

      <main className="relative z-10 mx-auto grid max-w-[1480px] gap-5 px-4 py-6 md:px-7 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section>
          <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-[#ff8a1f]/35 bg-[#ff8a1f]/[0.06] font-serif text-sm text-[#ffad62]">
                  知
                </div>
                <div>
                  <div className="text-[9px] font-bold tracking-[.22em] text-[#ff9a42]">
                    MASA KNOWLEDGE OS
                  </div>
                  <div className="font-serif text-lg font-semibold">Knowledge Core</div>
                  <p className="text-[9px] tracking-wide text-[#768196]">
                    GitHub Markdownが正本。Supabaseは検索・接続用ミラー。
                  </p>
                </div>
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight">
                知識を、見つけて使える状態へ。
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#8793a6]">
                最新の正本Markdown、意味ノード、進行Project、Sourceを一画面から横断します。
                ObsidianやGit操作は日常利用に不要です。
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-right">
              <div className="text-2xl font-semibold text-white">{visibleCount}</div>
              <div className="text-[9px] uppercase tracking-[.18em] text-[#66738a]">
                visible items
              </div>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="知識・Project・Sourceを横断検索"
              className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d1320] px-4 text-sm outline-none placeholder:text-[#59667a] focus:border-[#ff8a1f]/45"
            />
          </div>

          <div className="mb-5 grid grid-cols-4 gap-2">
            {tabs.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => {
                  setTab(entry.key);
                  setSelected(null);
                }}
                className={`rounded-xl border px-2 py-3 text-center transition ${
                  tab === entry.key
                    ? "border-[#ff8a1f]/45 bg-[#ff8a1f]/[0.07] text-white"
                    : "border-white/[0.07] bg-white/[0.02] text-[#7d899d] hover:border-white/[0.14]"
                }`}
              >
                <div className="font-serif text-base">{entry.kanji}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[.13em]">
                  {entry.label}
                </div>
              </button>
            ))}
          </div>

          {loading && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-sm text-[#7d899d]">
              Knowledge OSを同期中…
            </div>
          )}

          {!loading && loginRequired && (
            <div className="rounded-3xl border border-[#ff8a1f]/25 bg-[#ff8a1f]/[0.04] p-6">
              <div className="text-[10px] font-bold tracking-[.2em] text-[#ff9a42]">PRIVATE CORE</div>
              <h2 className="mt-2 font-serif text-2xl font-semibold">ログインするとKnowledge OSを開けます。</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#9ca8ba]">
                canonical Markdownのミラーはprivateです。Supabase Authの管理者セッションで閲覧します。
              </p>
              <button
                type="button"
                onClick={() => beginGoogleLogin("/knowledge")}
                className="mt-5 rounded-xl bg-[#ff8a1f] px-5 py-3 text-sm font-bold text-[#07152e]"
              >
                Googleでログイン
              </button>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-5 text-sm leading-7 text-red-200">
              {error}
            </div>
          )}

          {!loading && !loginRequired && !error && tab === "recent" && (
            <div className="space-y-7">
              <section>
                <SectionHeading
                  eyebrow="CANONICAL MARKDOWN"
                  title="正本の最近更新"
                  count={filteredDocuments.length}
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDocuments.slice(0, 12).map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      selected={selected?.kind === "document" && selected.value.id === doc.id}
                      onClick={() => setSelected({ kind: "document", value: doc })}
                    />
                  ))}
                </div>
              </section>

              <section>
                <SectionHeading
                  eyebrow="DERIVED KNOWLEDGE GRAPH"
                  title="意味ノードの最近更新"
                  count={filteredItems.length}
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.slice(0, 9).map((item) => (
                    <KnowledgeCard
                      key={item.id}
                      item={item}
                      selected={selected?.kind === "node" && selected.value.id === item.id}
                      onClick={() => setSelected({ kind: "node", value: item })}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}

          {!loading && !loginRequired && !error && tab === "knowledge" && (
            <div className="space-y-7">
              <section>
                <SectionHeading
                  eyebrow="SOURCE OF TRUTH"
                  title="Canonical Markdown"
                  count={filteredDocuments.length}
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredDocuments.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      doc={doc}
                      selected={selected?.kind === "document" && selected.value.id === doc.id}
                      onClick={() => setSelected({ kind: "document", value: doc })}
                    />
                  ))}
                </div>
              </section>

              <section>
                <SectionHeading
                  eyebrow="DERIVED / CONNECTED"
                  title="Knowledge Graph"
                  count={filteredItems.length}
                />
                <p className="mb-3 text-xs leading-6 text-[#67758a]">
                  ここは検索・意味接続用の派生レイヤーです。正本ではありません。
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((item) => (
                    <KnowledgeCard
                      key={item.id}
                      item={item}
                      selected={selected?.kind === "node" && selected.value.id === item.id}
                      onClick={() => setSelected({ kind: "node", value: item })}
                    />
                  ))}
                </div>
              </section>
            </div>
          )}

          {!loading && !loginRequired && !error && tab === "projects" && (
            <div>
              <SectionHeading eyebrow="ACTIVE WORK" title="Projects" count={filteredProjects.length} />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredProjects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    onClick={() => setSelected({ kind: "project", value: project })}
                    className={`min-h-40 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      selected?.kind === "project" && selected.value.id === project.id
                        ? "border-[#ff8a1f]/45 bg-[#ff8a1f]/[0.06]"
                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[.14em] text-[#6f7c91]">
                      <span>{project.priority}</span>
                      <span>{project.status}</span>
                    </div>
                    <h3 className="mt-4 font-serif text-lg font-semibold leading-7 text-[#eef2f8]">
                      {project.name}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-xs leading-6 text-[#8995a8]">
                      {project.purpose || project.next_milestone || "Project詳細を確認"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && !loginRequired && !error && tab === "sources" && (
            <div>
              <SectionHeading eyebrow="TRACEABILITY" title="Sources" count={filteredSources.length} />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredSources.map((source) => (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => setSelected({ kind: "source", value: source })}
                    className={`min-h-36 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      selected?.kind === "source" && selected.value.id === source.id
                        ? "border-[#ff8a1f]/45 bg-[#ff8a1f]/[0.06]"
                        : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14]"
                    }`}
                  >
                    <div className="text-[9px] uppercase tracking-[.14em] text-[#6f7c91]">
                      {source.source_type}
                    </div>
                    <h3 className="mt-3 font-serif text-base font-semibold leading-7 text-[#eef2f8]">
                      {source.title || "Untitled source"}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-[#8995a8]">
                      {source.author || source.url || source.raw_text || "Source metadata"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <div className="h-full overflow-auto rounded-3xl border border-white/[0.08] bg-[#0c121e]/95 p-5 shadow-2xl shadow-black/20">
            {!selected ? (
              <div className="grid min-h-72 place-items-center text-center text-sm leading-7 text-[#6f7c91]">
                カードを選ぶと、本文・正本パス・Source・Project接続をここに表示します。
              </div>
            ) : (
              <DetailPanel
                selection={selected}
                nodeSources={selectedNodeSources}
                wants={selectedWants}
                quests={selectedQuests}
                onClose={() => setSelected(null)}
              />
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count: number;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className="text-[9px] font-bold uppercase tracking-[.2em] text-[#66738a]">{eyebrow}</div>
        <h2 className="mt-1 font-serif text-xl font-semibold">{title}</h2>
      </div>
      <div className="text-xs text-[#657186]">{count}</div>
    </div>
  );
}

function DocumentCard({
  doc,
  selected,
  onClick,
}: {
  doc: CanonicalDocument;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-40 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        selected
          ? "border-[#ff8a1f]/45 bg-[#ff8a1f]/[0.06]"
          : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[.14em] text-[#6f7c91]">
        <span>CANONICAL</span>
        <span>{doc.domain || doc.document_type}</span>
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold leading-7 text-[#eef2f8]">{doc.title}</h3>
      <p className="mt-3 line-clamp-3 text-xs leading-6 text-[#8995a8]">
        {doc.summary || doc.content}
      </p>
      <div className="mt-4 text-[9px] text-[#5f6c81]">同期 {formatDate(doc.synced_at)}</div>
    </button>
  );
}

function KnowledgeCard({
  item,
  selected,
  onClick,
}: {
  item: KnowledgeItem;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-40 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
        selected
          ? "border-[#ff8a1f]/45 bg-[#ff8a1f]/[0.06]"
          : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14]"
      }`}
    >
      <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[.14em] text-[#6f7c91]">
        <span>{item.layer || "GRAPH"}</span>
        <span>{item.domain || item.item_type || ""}</span>
      </div>
      <h3 className="mt-4 font-serif text-lg font-semibold leading-7 text-[#eef2f8]">{item.title}</h3>
      <p className="mt-3 line-clamp-3 text-xs leading-6 text-[#8995a8]">
        {item.summary || item.content || "詳細を開いて確認"}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-[#68758a]">
        {item.status && <span>{item.status}</span>}
        {typeof item.confidence === "number" && <span>{Math.round(item.confidence * 100)}%</span>}
      </div>
    </button>
  );
}

function DetailPanel({
  selection,
  nodeSources,
  wants,
  quests,
  onClose,
}: {
  selection: Exclude<Selection, null>;
  nodeSources: Array<{ link: KnowledgeSource; source: Source | undefined }>;
  wants: WantLink[];
  quests: QuestLink[];
  onClose: () => void;
}) {
  if (selection.kind === "document") {
    const doc = selection.value;
    return (
      <div>
        <DetailHeader eyebrow="CANONICAL MARKDOWN" title={doc.title} onClose={onClose} />
        <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-[#8793a6]">
          <Badge>{doc.document_type}</Badge>
          {doc.domain && <Badge>{doc.domain}</Badge>}
          <Badge>{doc.branch}</Badge>
        </div>
        {doc.summary && <DetailSection label="ESSENCE">{doc.summary}</DetailSection>}
        <DetailSection label="NOTE">
          <div className="whitespace-pre-wrap">{doc.content}</div>
        </DetailSection>
        <DetailSection label="SOURCE OF TRUTH">
          <div className="space-y-2 text-xs leading-6 text-[#9aa7ba]">
            <div className="break-all">{doc.repo}/{doc.path}</div>
            <div>SHA {doc.blob_sha.slice(0, 12)}</div>
            <div>Mirror sync {formatDate(doc.synced_at)}</div>
            <a
              href={doc.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[#ff9a42] hover:underline"
            >
              GitHub正本を開く →
            </a>
          </div>
        </DetailSection>
      </div>
    );
  }

  if (selection.kind === "project") {
    const project = selection.value;
    return (
      <div>
        <DetailHeader eyebrow="PROJECT" title={project.name} onClose={onClose} />
        <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-[#8793a6]">
          <Badge>{project.status}</Badge>
          <Badge>{project.priority}</Badge>
          {project.layer && <Badge>{project.layer}</Badge>}
        </div>
        {project.purpose && <DetailSection label="PURPOSE">{project.purpose}</DetailSection>}
        {project.next_milestone && (
          <DetailSection label="NEXT MILESTONE">{project.next_milestone}</DetailSection>
        )}
        {project.source_url && (
          <DetailSection label="SOURCE">
            <a
              href={project.source_url}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm text-[#ff9a42] hover:underline"
            >
              {project.source_url}
            </a>
          </DetailSection>
        )}
      </div>
    );
  }

  if (selection.kind === "source") {
    const source = selection.value;
    return (
      <div>
        <DetailHeader eyebrow="SOURCE" title={source.title || "Untitled source"} onClose={onClose} />
        <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-[#8793a6]">
          <Badge>{source.source_type}</Badge>
          {source.author && <Badge>{source.author}</Badge>}
        </div>
        {source.raw_text && (
          <DetailSection label="RAW / EXCERPT">
            <div className="whitespace-pre-wrap">{source.raw_text}</div>
          </DetailSection>
        )}
        <DetailSection label="TRACE">
          <div className="space-y-2 text-xs leading-6 text-[#9aa7ba]">
            <div>published {formatDate(source.published_at)}</div>
            <div>registered {formatDate(source.created_at)}</div>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-[#ff9a42] hover:underline"
              >
                Sourceを開く →
              </a>
            )}
          </div>
        </DetailSection>
      </div>
    );
  }

  const item = selection.value;

  return (
    <div>
      <DetailHeader eyebrow="DERIVED KNOWLEDGE NODE" title={item.title} onClose={onClose} />
      <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-[#8793a6]">
        {[item.domain, item.layer, item.item_type, item.status].filter(Boolean).map((value) => (
          <Badge key={value}>{value}</Badge>
        ))}
      </div>

      {item.summary && <DetailSection label="ESSENCE">{item.summary}</DetailSection>}
      {item.content && (
        <DetailSection label="NOTE">
          <div className="whitespace-pre-wrap">{item.content}</div>
        </DetailSection>
      )}

      {(item.evidence_level || typeof item.confidence === "number") && (
        <DetailSection label="VERIFICATION">
          <div className="space-y-1 text-xs text-[#9aa7ba]">
            {item.evidence_level && <div>evidence: {item.evidence_level}</div>}
            {typeof item.confidence === "number" && (
              <div>confidence: {Math.round(item.confidence * 100)}%</div>
            )}
          </div>
        </DetailSection>
      )}

      {!!nodeSources.length && (
        <DetailSection label="SOURCES">
          <div className="space-y-2">
            {nodeSources.map(({ link, source }) => (
              <div
                key={`${link.knowledge_id}-${link.source_id}`}
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
              >
                <div className="text-[9px] uppercase tracking-[.12em] text-[#6f7c91]">
                  {link.relation}
                </div>
                <div className="mt-1 text-sm font-semibold text-[#e6ebf2]">
                  {source?.title || source?.source_type || "Source"}
                </div>
                {link.note && <div className="mt-1 text-xs leading-5 text-[#8591a5]">{link.note}</div>}
                {source?.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-[#ff9a42] hover:underline"
                  >
                    開く →
                  </a>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {!!wants.length && (
        <DetailSection label="望 · WANT TO">
          <div className="space-y-2">
            {wants.map((link, index) => {
              const want = link.want_to_items!;
              return (
                <Link
                  key={`${want.external_id}-${index}`}
                  href={`${APP_ROUTES.wantTo}?q=${encodeURIComponent(want.external_id || "")}`}
                  className="block rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 hover:border-[#ff8a1f]/35"
                >
                  <div className="text-[9px] text-[#ff9a42]">{want.external_id || "WANT"}</div>
                  <div className="mt-1 text-sm font-semibold text-[#e6ebf2]">{want.title}</div>
                  <div className="mt-1 text-[10px] text-[#77849a]">
                    {want.theme || want.category || ""} · {link.relation || "related"}
                  </div>
                </Link>
              );
            })}
          </div>
        </DetailSection>
      )}

      {!!quests.length && (
        <DetailSection label="行 · QUEST">
          <div className="space-y-2">
            {quests.map((link, index) => {
              const quest = link.quests!;
              return (
                <Link
                  key={`${quest.external_id}-${index}`}
                  href={`${APP_ROUTES.quest}?quest=${encodeURIComponent(quest.external_id || "")}`}
                  className="block rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 hover:border-[#ff8a1f]/35"
                >
                  <div className="text-[9px] text-[#ff9a42]">QUEST</div>
                  <div className="mt-1 text-sm font-semibold text-[#e6ebf2]">{quest.title}</div>
                  <div className="mt-1 text-[10px] text-[#77849a]">
                    {quest.app_status || ""} · {link.role || "applies"}
                  </div>
                </Link>
              );
            })}
          </div>
        </DetailSection>
      )}
    </div>
  );
}

function DetailHeader({
  eyebrow,
  title,
  onClose,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[9px] font-bold tracking-[.2em] text-[#ff9a42]">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-2xl font-semibold leading-9">{title}</h2>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-[#8793a6]"
      >
        ×
      </button>
    </div>
  );
}

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 border-t border-white/[0.07] pt-5">
      <div className="text-[9px] font-bold tracking-[.18em] text-[#66738a]">{label}</div>
      <div className="mt-2 text-sm leading-8 text-[#aeb9ca]">{children}</div>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/[0.08] px-2.5 py-1">{children}</span>;
}
