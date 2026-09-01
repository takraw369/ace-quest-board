"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  beginGoogleLogin,
  getAccessToken,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/auth/supabaseAuth";

type Project = {
  id: string;
  slug: string;
  name: string;
  purpose?: string | null;
  status: string;
  priority: string;
  next_milestone?: string | null;
};

type RelatedDocument = {
  id: string;
  title: string;
  domain?: string | null;
  document_type: string;
  summary?: string | null;
  path: string;
  source_url: string;
  score: number;
};

type AskResult = {
  ok: boolean;
  mode: "ai" | "retrieval";
  model?: string | null;
  answer: string;
  application?: string[];
  project?: Project | null;
  related: RelatedDocument[];
};

function priorityScore(priority?: string | null) {
  const normalized = (priority || "").toUpperCase();
  if (["S", "P0", "CRITICAL"].includes(normalized)) return 5;
  if (["A", "P1", "HIGH"].includes(normalized)) return 4;
  if (["B", "P2", "MEDIUM"].includes(normalized)) return 3;
  if (["C", "P3", "LOW"].includes(normalized)) return 2;
  return 1;
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
  if (!response.ok) throw new Error(`knowledge_ask_bootstrap_${response.status}`);
  return response.json();
}

async function askKnowledge(question: string, projectId: string, accessToken: string): Promise<AskResult> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/knowledge-ask`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question, project_id: projectId || null }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || `knowledge_ask_${response.status}`);
  }
  return payload as AskResult;
}

const quickQuestions = [
  "今のKnowledge OSを次にどう進化させる？",
  "今の発信に使える知識は？",
  "このProjectのボトルネックに使える過去知識は？",
  "反対意見や注意点まで含めて整理して",
];

export default function KnowledgeAskPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [question, setQuestion] = useState("");
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (alive) setLoginRequired(true);
          return;
        }
        const rows = await getJson<Project[]>(
          "os_projects?select=id,slug,name,purpose,status,priority,next_milestone&order=updated_at.desc",
          accessToken,
        );
        if (!alive) return;
        setProjects(rows || []);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Knowledge Askを開けません");
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
        .sort((a, b) => priorityScore(b.priority) - priorityScore(a.priority)),
    [projects],
  );

  async function submit(nextQuestion?: string) {
    const q = (nextQuestion ?? question).trim();
    if (q.length < 2 || asking) return;
    setQuestion(q);
    setAsking(true);
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setLoginRequired(true);
        return;
      }
      const answer = await askKnowledge(q, projectId, accessToken);
      setResult(answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Knowledge Askに接続できません");
    } finally {
      setAsking(false);
    }
  }

  async function copyAnswer() {
    if (!result?.answer) return;
    const application = result.application?.length
      ? `\n\nProjectへの適用\n${result.application.map((item, index) => `${index + 1}. ${item}`).join("\n")}`
      : "";
    await navigator.clipboard.writeText(`${result.answer}${application}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="min-h-screen bg-[#080d16] pb-24 text-[#edf2f8] selection:bg-[#ff8a1f]/25">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 5%,rgba(255,138,31,.10),transparent 30%),radial-gradient(circle at 88% 55%,rgba(58,91,145,.13),transparent 34%)",
        }}
      />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-5 md:px-7 md:py-8">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ff8a1f]/30 bg-[#ff8a1f]/[0.06] font-serif text-lg text-[#ffad62]">問</div>
            <div>
              <div className="text-[9px] font-bold tracking-[.22em] text-[#ff9a42]">MASA KNOWLEDGE OS</div>
              <h1 className="font-serif text-xl font-semibold">Ask Knowledge</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/knowledge/today" className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-[#9aa7ba]">Today</Link>
            <Link href="/knowledge" className="rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-[#9aa7ba]">全知識</Link>
          </div>
        </header>

        {loading && (
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7 text-sm text-[#7f8ca0]">Knowledgeを接続中…</div>
        )}

        {!loading && loginRequired && (
          <section className="rounded-3xl border border-[#ff8a1f]/25 bg-[#ff8a1f]/[0.04] p-6">
            <div className="text-[9px] font-bold tracking-[.2em] text-[#ff9a42]">PRIVATE CORE</div>
            <h2 className="mt-2 font-serif text-2xl font-semibold">Knowledgeに聞く</h2>
            <p className="mt-3 text-sm leading-7 text-[#96a3b5]">privateな正本Knowledgeを使うため、ログインが必要です。</p>
            <button type="button" onClick={() => beginGoogleLogin("/knowledge/ask")} className="mt-5 rounded-xl bg-[#ff8a1f] px-5 py-3 text-sm font-bold text-[#07152e]">Googleでログイン</button>
          </section>
        )}

        {!loading && !loginRequired && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="space-y-5">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 md:p-6">
                <div className="text-[9px] font-bold tracking-[.2em] text-[#ff9a42]">ASK → RETRIEVE → APPLY</div>
                <h2 className="mt-2 font-serif text-2xl font-semibold">過去の知識を、今の判断に使う。</h2>
                <p className="mt-2 text-sm leading-7 text-[#8996aa]">質問すると正本Markdownから関連知識を探し、選んだProjectの現在地まで接続します。</p>

                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={5}
                  placeholder="例：Knowledge OSを毎日使いたくなる状態にするには、今ある知識から何を優先すべき？"
                  className="mt-5 w-full resize-none rounded-2xl border border-white/[0.08] bg-[#0d1320] px-4 py-4 text-sm leading-7 outline-none placeholder:text-[#566479] focus:border-[#ff8a1f]/45"
                />

                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="h-12 rounded-xl border border-white/[0.08] bg-[#0d1320] px-3 text-sm text-[#c8d1de] outline-none"
                  >
                    <option value="">Project指定なし</option>
                    {activeProjects.map((project) => (
                      <option key={project.id} value={project.id}>{project.priority} · {project.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={asking || question.trim().length < 2}
                    onClick={() => submit()}
                    className="h-12 rounded-xl bg-[#ff8a1f] px-6 text-sm font-bold text-[#07152e] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {asking ? "探して統合中…" : "Knowledgeに聞く"}
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {quickQuestions.map((item) => (
                    <button key={item} type="button" onClick={() => submit(item)} className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[10px] text-[#8996aa] hover:border-[#ff8a1f]/30">{item}</button>
                  ))}
                </div>
              </div>

              {error && <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-5 text-sm leading-7 text-red-200">{error}</div>}

              {result && (
                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 md:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-bold tracking-[.18em] text-[#ff9a42]">ANSWER</div>
                      <h2 className="mt-1 font-serif text-xl font-semibold">Knowledgeからの回答</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] ${result.mode === "ai" ? "border-emerald-300/20 text-emerald-200" : "border-amber-300/20 text-amber-200"}`}>
                        {result.mode === "ai" ? `AI · ${result.model || "model"}` : "Retrieval"}
                      </span>
                      <button type="button" onClick={copyAnswer} className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[9px] text-[#8996aa]">{copied ? "Copied" : "Copy"}</button>
                    </div>
                  </div>
                  <div className="mt-5 whitespace-pre-wrap text-sm leading-8 text-[#bac4d2]">{result.answer}</div>

                  {!!result.application?.length && (
                    <div className="mt-6 border-t border-white/[0.07] pt-5">
                      <div className="text-[9px] font-bold tracking-[.18em] text-[#66748a]">PROJECT APPLICATION</div>
                      <div className="mt-3 space-y-2">
                        {result.application.map((item, index) => (
                          <div key={`${item}-${index}`} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-sm leading-7 text-[#a9b5c6]">
                            <span className="mr-2 text-[#ff9a42]">{index + 1}.</span>{item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="text-[9px] font-bold tracking-[.18em] text-[#66748a]">APPLY TO</div>
                <div className="mt-2 font-serif text-lg font-semibold">{result?.project?.name || activeProjects.find((project) => project.id === projectId)?.name || "Project未指定"}</div>
                <p className="mt-2 text-xs leading-6 text-[#8290a5]">
                  {result?.project?.next_milestone || activeProjects.find((project) => project.id === projectId)?.next_milestone || "Projectを選ぶと、今のマイルストーンへの適用案まで返します。"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="text-[9px] font-bold tracking-[.18em] text-[#66748a]">RELATED CANONICAL</div>
                <h3 className="mt-1 font-serif text-lg font-semibold">関連する正本</h3>
                {!result && <p className="mt-3 text-xs leading-6 text-[#718097]">質問すると、根拠に使った正本がここに並びます。</p>}
                <div className="mt-3 space-y-2">
                  {result?.related.map((doc) => (
                    <a key={doc.id} href={doc.source_url} target="_blank" rel="noreferrer" className="block rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-[#ff8a1f]/30">
                      <div className="flex items-center justify-between gap-2 text-[9px] text-[#66748a]"><span>{doc.domain || doc.document_type}</span><span>{Math.round(doc.score)}</span></div>
                      <div className="mt-1 text-xs font-semibold leading-5 text-[#d7dee8]">{doc.title}</div>
                      {doc.summary && <div className="mt-1 line-clamp-3 text-[10px] leading-5 text-[#7f8ca0]">{doc.summary}</div>}
                    </a>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
