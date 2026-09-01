"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  beginGoogleLogin,
  getAccessToken,
  getCurrentIdentity,
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
  updated_at?: string | null;
};

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

function priorityScore(priority?: string | null) {
  const normalized = (priority || "").trim().toUpperCase();
  if (normalized === "S" || normalized === "P0" || normalized === "CRITICAL") return 5;
  if (normalized === "A" || normalized === "P1" || normalized === "HIGH") return 4;
  if (normalized === "B" || normalized === "P2" || normalized === "MEDIUM") return 3;
  if (normalized === "C" || normalized === "P3" || normalized === "LOW") return 2;
  return 1;
}

function documentScore(doc: CanonicalDocument) {
  const typeScore: Record<string, number> = {
    knowledge: 7,
    core_concept: 7,
    project: 6,
    output: 5,
    tool: 3,
    system: 2,
    document: 2,
  };
  const updated = new Date(doc.updated_at).getTime();
  const recency = Number.isNaN(updated) ? 0 : updated / 1_000_000_000_000;
  return (typeScore[doc.document_type] || 1) * 10 + recency;
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
    throw new Error(`Knowledge Today fetch failed: ${response.status}${body ? ` / ${body.slice(0, 100)}` : ""}`);
  }

  return response.json();
}

export default function KnowledgeTodayPage() {
  const [documents, setDocuments] = useState<CanonicalDocument[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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

        const [docs, projectRows, identity] = await Promise.all([
          getJson<CanonicalDocument[]>(
            "knowledge_documents?select=id,repo,branch,path,blob_sha,title,domain,document_type,summary,content,source_url,canonical,synced_at,updated_at&canonical=eq.true&order=updated_at.desc&limit=200",
            accessToken,
          ),
          getJson<Project[]>(
            "os_projects?select=id,slug,name,layer,purpose,status,priority,next_milestone,source_url,updated_at&order=updated_at.desc",
            accessToken,
          ),
          getCurrentIdentity(),
        ]);

        if (!alive) return;
        setDocuments(docs || []);
        setProjects(projectRows || []);
        setDisplayName(identity?.displayName || null);
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

  const activeProjects = useMemo(
    () =>
      [...projects]
        .filter((project) => !["DONE", "ARCHIVED", "REFERENCE"].includes((project.status || "").toUpperCase()))
        .sort((a, b) => {
          const scoreDiff = priorityScore(b.priority) - priorityScore(a.priority);
          if (scoreDiff) return scoreDiff;
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        }),
    [projects],
  );

  const todayProjects = activeProjects.slice(0, 3);

  const todayDocuments = useMemo(
    () => [...documents].sort((a, b) => documentScore(b) - documentScore(a)).slice(0, 3),
    [documents],
  );

  const recentDocuments = documents.slice(0, 6);
  const nextProject = todayProjects[0] || null;
  const latestSync = documents[0]?.synced_at || null;
  const normalizedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return documents
      .filter((doc) =>
        [doc.title, doc.summary, doc.content, doc.domain, doc.document_type, doc.path]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .slice(0, 20);
  }, [documents, normalizedQuery]);

  return (
    <div className="min-h-screen bg-[#080d16] pb-24 text-[#edf2f8] selection:bg-[#ff8a1f]/25">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 4%,rgba(255,138,31,.10),transparent 28%),radial-gradient(circle at 85% 45%,rgba(58,91,145,.12),transparent 34%)",
        }}
      />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-5 md:px-7 md:py-8">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ff8a1f]/30 bg-[#ff8a1f]/[0.06] font-serif text-lg text-[#ffad62]">
              知
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[.22em] text-[#ff9a42]">MASA KNOWLEDGE OS</div>
              <h1 className="font-serif text-xl font-semibold">Today</h1>
            </div>
          </div>
          <Link
            href="/knowledge"
            className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-[#9aa7ba]"
          >
            全知識
          </Link>
        </header>

        {loading && (
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7 text-sm text-[#7f8ca0]">
            今日のKnowledgeを準備中…
          </div>
        )}

        {!loading && loginRequired && (
          <section className="rounded-3xl border border-[#ff8a1f]/25 bg-[#ff8a1f]/[0.04] p-6">
            <div className="text-[9px] font-bold tracking-[.2em] text-[#ff9a42]">PRIVATE CORE</div>
            <h2 className="mt-2 font-serif text-2xl font-semibold">Knowledge OSを開く</h2>
            <p className="mt-3 text-sm leading-7 text-[#96a3b5]">正本Markdownのミラーはprivateです。</p>
            <button
              type="button"
              onClick={() => beginGoogleLogin("/knowledge/today")}
              className="mt-5 rounded-xl bg-[#ff8a1f] px-5 py-3 text-sm font-bold text-[#07152e]"
            >
              Googleでログイン
            </button>
          </section>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-5 text-sm leading-7 text-red-200">
            {error}
          </div>
        )}

        {!loading && !loginRequired && !error && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 md:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold tracking-[.2em] text-[#ff9a42]">TODAY / NOW</p>
                  <h2 className="mt-2 font-serif text-2xl font-semibold">
                    {displayName ? `${displayName}、今日もここから。` : "今日もここから。"}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[#8996aa]">
                    正本 {documents.length}件 · Active Project {activeProjects.length}件
                  </p>
                </div>
                <div className="text-right text-[10px] leading-5 text-[#66748a]">
                  <div>last sync</div>
                  <div className="text-[#9aa7ba]">{formatDate(latestSync)}</div>
                </div>
              </div>

              {nextProject && (
                <div className="mt-5 rounded-2xl border border-[#ff8a1f]/20 bg-[#ff8a1f]/[0.045] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-bold tracking-[.16em] text-[#ff9a42]">NEXT MOVE</span>
                    <span className="text-[10px] text-[#7d899d]">{nextProject.priority} · {nextProject.status}</span>
                  </div>
                  <div className="mt-2 font-serif text-lg font-semibold">{nextProject.name}</div>
                  <p className="mt-2 text-sm leading-7 text-[#a7b2c2]">
                    {nextProject.next_milestone || nextProject.purpose || "次のマイルストーンを確認"}
                  </p>
                </div>
              )}
            </section>

            <section>
              <SectionTitle eyebrow="USE TODAY" title="今日見る3つ" />
              <div className="grid gap-3 md:grid-cols-3">
                {todayDocuments.map((doc) => (
                  <details key={doc.id} className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[.13em] text-[#68768b]">
                        <span>{doc.document_type}</span>
                        <span>{doc.domain || "canonical"}</span>
                      </div>
                      <h3 className="mt-3 font-serif text-base font-semibold leading-7">{doc.title}</h3>
                      <p className="mt-2 line-clamp-3 text-xs leading-6 text-[#8794a8]">{doc.summary || doc.content}</p>
                    </summary>
                    <div className="mt-4 border-t border-white/[0.07] pt-4 text-xs leading-7 text-[#a7b2c2]">
                      <div className="max-h-64 overflow-auto whitespace-pre-wrap">{doc.content}</div>
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-[#ff9a42] hover:underline"
                      >
                        GitHub正本を開く →
                      </a>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle eyebrow="ACTIVE WORK" title="進行Project" />
              <div className="grid gap-3 md:grid-cols-3">
                {todayProjects.map((project) => (
                  <div key={project.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                    <div className="flex items-center justify-between gap-2 text-[9px] uppercase tracking-[.13em] text-[#68768b]">
                      <span>{project.priority}</span>
                      <span>{project.status}</span>
                    </div>
                    <h3 className="mt-3 font-serif text-lg font-semibold">{project.name}</h3>
                    <p className="mt-2 text-xs leading-6 text-[#8996aa]">
                      {project.next_milestone || project.purpose || "Project詳細を確認"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section id="search" className="scroll-mt-5">
              <SectionTitle eyebrow="FIND FAST" title="正本を検索" />
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="例：健康、LINE、AI、子育て、Flow"
                  className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d1320] px-4 text-sm outline-none placeholder:text-[#566479] focus:border-[#ff8a1f]/45"
                />
              </div>

              {normalizedQuery && (
                <div className="mt-3 space-y-2">
                  <div className="text-[10px] text-[#68768b]">{searchResults.length}件表示</div>
                  {searchResults.map((doc) => (
                    <details key={doc.id} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                      <summary className="cursor-pointer list-none">
                        <div className="text-sm font-semibold leading-6">{doc.title}</div>
                        <div className="mt-1 text-[10px] text-[#68768b]">{doc.domain || doc.document_type} · {doc.path}</div>
                      </summary>
                      <div className="mt-3 border-t border-white/[0.06] pt-3 text-xs leading-7 text-[#9aa7ba]">
                        <div className="max-h-72 overflow-auto whitespace-pre-wrap">{doc.content}</div>
                        <a href={doc.source_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[#ff9a42]">
                          正本を開く →
                        </a>
                      </div>
                    </details>
                  ))}
                  {!searchResults.length && (
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm text-[#7f8ca0]">
                      該当する正本Markdownはありません。
                    </div>
                  )}
                </div>
              )}
            </section>

            <section>
              <SectionTitle eyebrow="WHAT CHANGED" title="最近の更新" />
              <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
                {recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-start justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{doc.title}</div>
                      <div className="mt-1 truncate text-[10px] text-[#657388]">{doc.path}</div>
                    </div>
                    <div className="shrink-0 text-[10px] text-[#657388]">{formatDate(doc.updated_at)}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <nav className="fixed inset-x-3 bottom-3 z-30 mx-auto grid max-w-md grid-cols-4 gap-1 rounded-2xl border border-white/[0.10] bg-[#0d1421]/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden">
        <Link href="/knowledge/today" className="rounded-xl bg-[#ff8a1f]/10 px-2 py-2 text-center text-[10px] text-[#ffad62]">今日</Link>
        <a href="#search" className="rounded-xl px-2 py-2 text-center text-[10px] text-[#8794a8]">検索</a>
        <Link href="/knowledge" className="rounded-xl px-2 py-2 text-center text-[10px] text-[#8794a8]">全知識</Link>
        <Link href="/want-to" className="rounded-xl px-2 py-2 text-center text-[10px] text-[#8794a8]">Want to</Link>
      </nav>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3">
      <div className="text-[9px] font-bold tracking-[.2em] text-[#68768b]">{eyebrow}</div>
      <h2 className="mt-1 font-serif text-xl font-semibold">{title}</h2>
    </div>
  );
}
