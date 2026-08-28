'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { APP_ROUTES } from '@/lib/appRoutes';

const SUPABASE_URL = 'https://qydbtholbwbuwiswmqsr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mv8O-7lEXnuubYLVzXIJnA_A1irQJB9';

type DictionaryEntry = {
  id: string;
  category: string;
  pain_text: string;
  hidden_want?: string | null;
  root_structure?: string | null;
  metaphor_id?: string | null;
  metaphor_name?: string | null;
  reframe?: string | null;
  first_action?: string | null;
  cta_id?: string | null;
  cta_name?: string | null;
  cta_level?: string | null;
  cta_route?: string | null;
  content_type?: string | null;
  hook?: string | null;
  priority?: string | null;
  faq_question?: string | null;
  tags?: string[] | null;
  aliases?: string[] | null;
};

const headers = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
};

async function loadDictionary(): Promise<DictionaryEntry[]> {
  const select = [
    'id', 'category', 'pain_text', 'hidden_want', 'root_structure',
    'metaphor_id', 'metaphor_name', 'reframe', 'first_action',
    'cta_id', 'cta_name', 'cta_level', 'cta_route', 'content_type',
    'hook', 'priority', 'faq_question', 'tags', 'aliases',
  ].join(',');
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/ace_dictionary_entries?select=${select}&published=eq.true&order=priority.asc,id.asc`,
    { headers, cache: 'no-store' },
  );
  if (!response.ok) throw new Error(`Dictionary fetch failed: ${response.status}`);
  return response.json();
}

const priorityWeight: Record<string, number> = { A: 3, B: 2, C: 1 };

function searchableText(entry: DictionaryEntry) {
  return [
    entry.pain_text,
    entry.category,
    entry.hidden_want,
    entry.root_structure,
    entry.metaphor_name,
    entry.reframe,
    entry.first_action,
    entry.faq_question,
    entry.hook,
    ...(entry.tags || []),
    ...(entry.aliases || []),
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchScore(entry: DictionaryEntry, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return priorityWeight[entry.priority || ''] || 0;
  let score = 0;
  if (entry.pain_text.toLowerCase().includes(q)) score += 12;
  if ((entry.faq_question || '').toLowerCase().includes(q)) score += 8;
  if ((entry.tags || []).some((tag) => tag.toLowerCase().includes(q))) score += 6;
  if ((entry.hidden_want || '').toLowerCase().includes(q)) score += 5;
  if ((entry.reframe || '').toLowerCase().includes(q)) score += 4;
  if ((entry.root_structure || '').toLowerCase().includes(q)) score += 3;
  if ((entry.metaphor_name || '').toLowerCase().includes(q)) score += 2;
  return score + (priorityWeight[entry.priority || ''] || 0);
}

function levelLabel(level?: string | null) {
  const labels: Record<string, string> = {
    Self: 'その場でできる',
    Content: 'もう少し知る',
    Diagnose: '自分を整理する',
    Quest: '試してみる',
    Worksheet: '書いて整理する',
    Community: '人とつながる',
    Athlete: '競技で試す',
    Safety: '適切な相談先へ',
  };
  return labels[level || ''] || '次の一歩';
}

export default function DictionaryPage() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('すべて');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    loadDictionary()
      .then((data) => { if (alive) setEntries(data || []); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : '辞典に接続できません'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const categories = useMemo(
    () => ['すべて', ...Array.from(new Set(entries.map((entry) => entry.category))).sort((a, b) => a.localeCompare(b, 'ja'))],
    [entries],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((entry) => category === 'すべて' || entry.category === category)
      .filter((entry) => !q || searchableText(entry).includes(q))
      .sort((a, b) => matchScore(b, query) - matchScore(a, query) || a.id.localeCompare(b.id));
  }, [entries, query, category]);

  const selected = entries.find((entry) => entry.id === selectedId) || null;

  const related = useMemo(() => {
    if (!selected) return [];
    return entries
      .filter((entry) => entry.id !== selected.id)
      .map((entry) => ({
        entry,
        score:
          (entry.category === selected.category ? 4 : 0) +
          (entry.metaphor_id && entry.metaphor_id === selected.metaphor_id ? 3 : 0) +
          (entry.cta_level && entry.cta_level === selected.cta_level ? 1 : 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((x) => x.entry);
  }, [entries, selected]);

  return (
    <div className="min-h-screen bg-[#08120f] text-[#e8eee9] selection:bg-[#9ec6aa]/25">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 8%,rgba(158,198,170,.10),transparent 28%),radial-gradient(circle at 88% 68%,rgba(200,171,114,.07),transparent 34%)',
        }}
      />

      <main className="relative z-10 mx-auto grid max-w-[1440px] gap-5 px-4 py-6 md:px-7 lg:grid-cols-[minmax(0,1fr)_430px]">
        <section>
          <div className="mb-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full border border-[#9ec6aa]/35 bg-[#9ec6aa]/[0.07] font-serif text-sm text-[#cfe5d4]">困</div>
                <div>
                  <div className="text-[9px] font-bold tracking-[.22em] text-[#91b49c]">ACE DICTIONARY · ENTRY LAYER</div>
                  <div className="font-serif text-lg font-semibold">困った時のACE辞典</div>
                  <p className="text-[9px] tracking-wide text-[#72867a]">言葉にならないところから、次の一歩を見つける。</p>
                </div>
              </div>
              <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">困った時、ここから。</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#899b90]">
                うまく説明できなくても大丈夫。「疲れ」「夫婦」「自信」「子育て」「お金」など、今ひっかかっている言葉をそのまま入れてください。
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-right">
              <div className="text-2xl font-semibold text-white">{visible.length}</div>
              <div className="text-[9px] uppercase tracking-[.18em] text-[#667970]">matching paths</div>
            </div>
          </div>

          <div className="mb-5 grid gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3 sm:grid-cols-[1fr_190px]">
            <label className="block">
              <span className="sr-only">悩みを検索</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="今ひっかかっている言葉を入力"
                className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#0b1713] px-4 text-sm outline-none placeholder:text-[#596b61] focus:border-[#9ec6aa]/45"
              />
            </label>
            <label className="block">
              <span className="sr-only">カテゴリ</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#0b1713] px-3 text-sm text-[#c7d4cb] outline-none focus:border-[#9ec6aa]/45"
              >
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2 text-[10px] text-[#6f8377]">
            <span>よく使う言葉:</span>
            {['疲れ', '夫婦', '自信', '子育て', 'お金', 'SNS', '仕事'].map((word) => (
              <button key={word} onClick={() => setQuery(word)} className="rounded-full border border-white/[0.08] px-3 py-1.5 transition hover:border-[#9ec6aa]/30 hover:text-[#bfd7c5]">{word}</button>
            ))}
            {(query || category !== 'すべて') && <button onClick={() => { setQuery(''); setCategory('すべて'); }} className="ml-auto text-[#91b49c] underline decoration-[#91b49c]/30 underline-offset-4">条件をクリア</button>}
          </div>

          {loading && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-sm text-[#7c8e83]">ACE辞典を開いています…</div>}
          {error && <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-5 text-sm text-red-200">{error}</div>}
          {!loading && !error && visible.length === 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-center">
              <p className="font-serif text-lg text-[#d8e1da]">ぴったりの言葉がまだ見つかりません。</p>
              <p className="mt-2 text-sm leading-7 text-[#74877b]">もっと短い言葉にしてみるか、カテゴリだけ選んで眺めてみてください。</p>
            </div>
          )}

          {!loading && !error && visible.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((entry) => {
                const safety = entry.cta_level === 'Safety';
                return (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedId(entry.id)}
                    className={`min-h-48 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${selectedId === entry.id ? 'border-[#9ec6aa]/45 bg-[#9ec6aa]/[0.07]' : safety ? 'border-[#d5b27a]/20 bg-[#d5b27a]/[0.035] hover:border-[#d5b27a]/35' : 'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14]'}`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[9px] tracking-[.12em] text-[#708379]">
                      <span>{entry.category}</span>
                      <span className={safety ? 'text-[#d6b781]' : 'text-[#8baa94]'}>{levelLabel(entry.cta_level)}</span>
                    </div>
                    <h3 className="mt-4 font-serif text-lg font-semibold leading-7 text-[#edf3ee]">{entry.pain_text}</h3>
                    <p className="mt-3 line-clamp-2 text-xs leading-6 text-[#91a198]">{entry.reframe || entry.hidden_want || '少し角度を変えて見てみる'}</p>
                    {entry.metaphor_name && <div className="mt-4 inline-flex rounded-full border border-white/[0.08] px-2.5 py-1 text-[9px] text-[#75897c]">例え：{entry.metaphor_name}</div>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <div className="h-full overflow-auto rounded-3xl border border-white/[0.08] bg-[#0a1612]/95 p-5 shadow-2xl shadow-black/20">
            {!selected ? (
              <div className="grid min-h-80 place-items-center px-5 text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#9ec6aa]/20 bg-[#9ec6aa]/[0.04] font-serif text-xl text-[#9ec6aa]">?</div>
                  <p className="mt-5 font-serif text-lg text-[#cbd8cf]">「これ、近いかも」を選んでください。</p>
                  <p className="mt-2 text-sm leading-7 text-[#6f8276]">答えを決めつけるためではなく、今の自分を少し見やすくするための辞典です。</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-bold tracking-[.2em] text-[#91b49c]">{selected.category} · {selected.id}</p>
                    <h2 className="mt-2 font-serif text-2xl font-semibold leading-9">{selected.pain_text}</h2>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-[#87998e]">×</button>
                </div>

                {selected.hidden_want && (
                  <section className="mt-6 rounded-2xl border border-[#9ec6aa]/12 bg-[#9ec6aa]/[0.035] p-4">
                    <div className="text-[9px] font-bold tracking-[.18em] text-[#789a82]">本当は、こうなりたい</div>
                    <p className="mt-2 font-serif text-base leading-7 text-[#dce8df]">{selected.hidden_want}</p>
                  </section>
                )}

                {selected.reframe && (
                  <section className="mt-5 border-t border-white/[0.07] pt-5">
                    <div className="text-[9px] font-bold tracking-[.18em] text-[#667a6e]">まず知ってほしいこと</div>
                    <p className="mt-2 text-sm leading-8 text-[#c4d0c8]">{selected.reframe}</p>
                  </section>
                )}

                {selected.metaphor_name && (
                  <section className="mt-5 border-t border-white/[0.07] pt-5">
                    <div className="text-[9px] font-bold tracking-[.18em] text-[#667a6e]">例えで見ると</div>
                    <div className="mt-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 font-serif text-lg text-[#d9e2dc]">{selected.metaphor_name}</div>
                  </section>
                )}

                {selected.first_action && (
                  <section className="mt-5 border-t border-white/[0.07] pt-5">
                    <div className="text-[9px] font-bold tracking-[.18em] text-[#667a6e]">今日の一歩</div>
                    <div className="mt-2 rounded-2xl border border-[#c8ab72]/18 bg-[#c8ab72]/[0.045] p-4 text-sm font-medium leading-7 text-[#eadfca]">{selected.first_action}</div>
                  </section>
                )}

                {selected.cta_level === 'Safety' && (
                  <section className="mt-5 rounded-2xl border border-[#d5b27a]/20 bg-[#d5b27a]/[0.045] p-4">
                    <div className="text-[9px] font-bold tracking-[.18em] text-[#d3b57f]">安心を優先するテーマです</div>
                    <p className="mt-2 text-xs leading-6 text-[#cbbfa8]">症状や負担が強い、長引く、生活に支障がある、安全面が心配な場合は、この辞典だけで判断せず適切な医療・公的・専門相談につないでください。</p>
                  </section>
                )}

                <section className="mt-5 border-t border-white/[0.07] pt-5">
                  <div className="text-[9px] font-bold tracking-[.18em] text-[#667a6e]">次に進むなら</div>
                  <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                    <div className="text-[10px] text-[#799084]">おすすめ</div>
                    <div className="mt-1 text-sm font-semibold text-[#e2ebe4]">{selected.cta_name || levelLabel(selected.cta_level)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Link href={APP_ROUTES.knowledge} className="rounded-xl border border-white/[0.08] px-3 py-3 text-center transition hover:border-[#ff8a1f]/30"><span className="block font-serif text-lg text-[#ffad62]">知</span><span className="mt-1 block text-[9px] text-[#7d8e84]">知る</span></Link>
                    <Link href={APP_ROUTES.wantTo} className="rounded-xl border border-white/[0.08] px-3 py-3 text-center transition hover:border-[#ff8a1f]/30"><span className="block font-serif text-lg text-[#ffad62]">望</span><span className="mt-1 block text-[9px] text-[#7d8e84]">望む</span></Link>
                    <Link href={APP_ROUTES.quest} className="rounded-xl border border-white/[0.08] px-3 py-3 text-center transition hover:border-[#ff8a1f]/30"><span className="block font-serif text-lg text-[#ffad62]">行</span><span className="mt-1 block text-[9px] text-[#7d8e84]">やってみる</span></Link>
                  </div>
                </section>

                {selected.faq_question && (
                  <section className="mt-5 border-t border-white/[0.07] pt-5">
                    <div className="text-[9px] font-bold tracking-[.18em] text-[#667a6e]">よくある問い</div>
                    <p className="mt-2 text-sm leading-7 text-[#aebdb3]">{selected.faq_question}</p>
                  </section>
                )}

                {!!related.length && (
                  <section className="mt-5 border-t border-white/[0.07] pt-5">
                    <div className="mb-3 text-[9px] font-bold tracking-[.18em] text-[#667a6e]">似た悩み</div>
                    <div className="space-y-2">
                      {related.map((entry) => (
                        <button key={entry.id} onClick={() => setSelectedId(entry.id)} className="block w-full rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-left transition hover:border-[#9ec6aa]/25">
                          <div className="text-[9px] text-[#708379]">{entry.category}</div>
                          <div className="mt-1 text-xs leading-5 text-[#c7d3cb]">{entry.pain_text}</div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <p className="mt-6 border-t border-white/[0.07] pt-4 text-[9px] leading-5 text-[#53685b]">この辞典はFlower本人とACE AIが同じ正本を参照します。AIも1つの原因に決めつけず、複数候補から一緒に確かめる前提です。</p>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
