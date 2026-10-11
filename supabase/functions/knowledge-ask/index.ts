import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type KnowledgeDocument = {
  id: string;
  title: string;
  domain: string | null;
  document_type: string;
  summary: string | null;
  content: string;
  path: string;
  source_url: string;
  updated_at: string;
};

type Project = {
  id: string;
  slug: string;
  name: string;
  purpose: string | null;
  status: string;
  priority: string;
  next_milestone: string | null;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

function normalize(value: string) {
  return value.toLowerCase().normalize("NFKC");
}

function queryTerms(value: string) {
  const normalized = normalize(value);
  const terms = normalized
    .split(/[\s、。,.!?！？「」『』（）()\[\]{}:/\\|・]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);

  const compact = normalized.replace(/[\s、。,.!?！？「」『』（）()\[\]{}:/\\|・]/g, "");
  if (compact.length >= 4) {
    for (let i = 0; i <= compact.length - 3 && i < 36; i += 2) {
      terms.push(compact.slice(i, i + 3));
    }
  }

  return [...new Set(terms)].slice(0, 48);
}

function scoreDocument(doc: KnowledgeDocument, question: string, project: Project | null) {
  const title = normalize(doc.title || "");
  const summary = normalize(doc.summary || "");
  const content = normalize(doc.content || "");
  const domain = normalize(doc.domain || "");
  const path = normalize(doc.path || "");
  const q = normalize(question.trim());
  let score = 0;

  if (q.length >= 2) {
    if (title.includes(q)) score += 80;
    if (summary.includes(q)) score += 50;
    if (content.includes(q)) score += 25;
  }

  for (const term of queryTerms(question)) {
    if (title.includes(term)) score += 14;
    if (summary.includes(term)) score += 9;
    if (domain.includes(term)) score += 7;
    if (path.includes(term)) score += 4;
    if (content.includes(term)) score += 2;
  }

  if (project) {
    const projectText = [project.name, project.purpose, project.next_milestone].filter(Boolean).join(" ");
    for (const term of queryTerms(projectText)) {
      if (title.includes(term)) score += 5;
      if (summary.includes(term)) score += 3;
      if (domain.includes(term)) score += 2;
      if (content.includes(term)) score += 1;
    }
  }

  if (["knowledge", "core_concept"].includes(doc.document_type)) score += 4;
  if (doc.document_type === "project") score += 2;

  const updated = new Date(doc.updated_at).getTime();
  if (!Number.isNaN(updated)) {
    const ageDays = Math.max(0, (Date.now() - updated) / 86_400_000);
    score += Math.max(0, 3 - ageDays / 30);
  }

  return score;
}

function short(value: string | null | undefined, max = 360) {
  const text = String(value || "").trim().replace(/\n{3,}/g, "\n\n");
  return text.length <= max ? text : `${text.slice(0, max).trim()}…`;
}

function fallbackAnswer(question: string, related: KnowledgeDocument[], project: Project | null) {
  if (!related.length) {
    return {
      answer: `「${question}」に直接つながる正本を十分に見つけられませんでした。検索語を具体化するか、全知識から対象ノートを選んでください。`,
      application: [] as string[],
    };
  }

  const top = related.slice(0, 3);
  const evidence = top
    .map((doc, index) => `${index + 1}. ${doc.title}\n${short(doc.summary || doc.content, 220)}`)
    .join("\n\n");

  const application = project
    ? [
        `判断基準：${short(top[0]?.summary || top[0]?.content, 180)}`,
        `Project接続：${project.name} の「${project.next_milestone || project.purpose || "次のマイルストーン"}」に、この原理を当てて判断する。`,
        `次の一手：関連正本 ${top.map((doc) => `「${doc.title}」`).join(" / ")} を見ながら、1つだけ実装・発信・検証に落とす。`,
      ]
    : ["適用先Projectを選ぶと、現在のマイルストーンに接続した使い方まで出せます。"];

  return {
    answer: `関連する正本から見ると、まずこの3点が核です。\n\n${evidence}\n\nこれは生成AI未接続時のRetrieval回答です。事実・仮説・解釈の最終判定は各正本のSource / Verificationを優先してください。`,
    application,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: cors });

  const auth = req.headers.get("authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!auth.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
    return Response.json({ ok: false, error: "not_configured_or_unauthorized" }, { status: 401, headers: cors });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const question = String(body?.question ?? "").trim();
    const projectId = String(body?.project_id ?? "").trim();
    const withCoach = body?.question_coach === true;
    if (question.length < 2) {
      return Response.json({ ok: false, error: "question_required" }, { status: 400, headers: cors });
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Zero-token first: only return an editorially curated answer for a direct question/alias match.
    // Unknown queries never invoke a paid LLM provider.
    const curated = await supabase
      .from("question_coach_answers")
      .select("question_text,aliases,answer,upgraded_question,why_better,lens,deepeners,status")
      .eq("status", "published")
      .limit(250);
    if (curated.error) throw curated.error;
    const compact = (value: string) => normalize(value)
      .replace(/[\\s、。,.!?！？「」『』（）()\\[\\]{}:/\\\\|・？]/g, "");
    const compactQuestion = compact(question);
    const exactAnswer = (curated.data ?? []).find((entry) =>
      [entry.question_text, ...(Array.isArray(entry.aliases) ? entry.aliases : [])]
        .some((candidate: string) => compact(candidate) === compactQuestion)
    );
    if (exactAnswer) {
      const hasCoach = Boolean(
        withCoach && exactAnswer.upgraded_question?.trim() && exactAnswer.why_better?.trim()
      );
      return Response.json({
        ok: true,
        mode: "curated",
        model: null,
        answer: exactAnswer.answer,
        question_coach: hasCoach ? {
          should_show: true,
          upgraded_question: exactAnswer.upgraded_question,
          why_better: exactAnswer.why_better,
          lens: exactAnswer.lens || "META",
          deepeners: (exactAnswer.deepeners || []).slice(0, 3),
        } : null,
        application: [],
        project: null,
        related: [],
      }, { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const docsQuery = supabase
      .from("knowledge_documents")
      .select("id,title,domain,document_type,summary,content,path,source_url,updated_at")
      .eq("canonical", true)
      .limit(220);

    const projectQuery = projectId
      ? supabase
          .from("os_projects")
          .select("id,slug,name,purpose,status,priority,next_milestone")
          .eq("id", projectId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any);

    const [{ data: docs, error: docsError }, { data: project, error: projectError }] = await Promise.all([
      docsQuery,
      projectQuery,
    ]);

    if (docsError) throw docsError;
    if (projectError) throw projectError;

    const ranked = ((docs ?? []) as KnowledgeDocument[])
      .map((doc) => ({ doc, score: scoreDocument(doc, question, project as Project | null) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const related = ranked.map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      domain: doc.domain,
      document_type: doc.document_type,
      summary: short(doc.summary || doc.content, 420),
      path: doc.path,
      source_url: doc.source_url,
      score: Math.round(score * 10) / 10,
    }));

    // Retrieval-only fallback. Intentionally no OpenAI API key, request, or
    // automatic AI fallback: the owner has disabled all paid LLM usage.
    const fallback = fallbackAnswer(question, ranked.map((entry) => entry.doc), project as Project | null);
    return Response.json({
      ok: true,
      mode: "retrieval",
      model: null,
      answer: fallback.answer,
      question_coach: null,
      application: fallback.application,
      project: project || null,
      related,
    }, { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("knowledge-ask error", error);
    return Response.json({ ok: false, error: "knowledge_ask_failed" }, { status: 500, headers: cors });
  }
});
