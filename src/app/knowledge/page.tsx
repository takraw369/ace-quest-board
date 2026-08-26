'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { APP_ROUTES } from '@/lib/appRoutes';

const SUPABASE_URL = 'https://qydbtholbwbuwiswmqsr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mv8O-7lEXnuubYLVzXIJnA_A1irQJB9';

type KnowledgeItem = {
  id: string;
  slug?: string | null;
  title: string;
  layer?: string | null;
  item_type?: string | null;
  domain?: string | null;
  summary?: string | null;
  content?: string | null;
  visibility?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

type Alias = { knowledge_id: string; alias: string };
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

const restHeaders = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: restHeaders,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Knowledge fetch failed: ${response.status}`);
  return response.json();
}

export default function KnowledgePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [wantLinks, setWantLinks] = useState<WantLink[]>([]);
  const [questLinks, setQuestLinks] = useState<QuestLink[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [knowledge, aliasData, wants, quests] = await Promise.all([
          getJson<KnowledgeItem[]>('knowledge_items?select=id,slug,title,layer,item_type,domain,summary,content,visibility,status,updated_at&order=title.asc'),
          getJson<Alias[]>('knowledge_aliases?select=knowledge_id,alias'),
          getJson<WantLink[]>('want_to_knowledge?select=knowledge_id,relation,confidence,reason,want_to_items(id,external_id,title,category,theme,center_pin_score)&order=confidence.desc'),
          getJson<QuestLink[]>('quest_knowledge?select=knowledge_id,role,sort_order,quests(id,external_id,title,summary,app_status)&order=sort_order.asc'),
        ]);
        if (!alive) return;
        setItems(knowledge || []);
        setAliases(aliasData || []);
        setWantLinks(wants || []);
        setQuestLinks(quests || []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Knowledge Coreに接続できません');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const aliasMap = useMemo(() => {
    const map = new Map<string, string[]>();
    aliases.forEach((a) => map.set(a.knowledge_id, [...(map.get(a.knowledge_id) || []), a.alias]));
    return map;
  }, [aliases]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [
      item.title,
      item.summary,
      item.content,
      item.domain,
      item.layer,
      item.item_type,
      ...(aliasMap.get(item.id) || []),
    ].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [items, query, aliasMap]);

  const selected = items.find((item) => item.id === selectedId) || null;
  const selectedWants = selected ? wantLinks.filter((x) => x.knowledge_id === selected.id && x.want_to_items) : [];
  const selectedQuests = selected ? questLinks.filter((x) => x.knowledge_id === selected.id && x.quests) : [];

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e8edf5] selection:bg-[#ff8a1f]/25">
      <div className="pointer-events-none fixed inset-0 opacity-70" style={{backgroundImage:'radial-gradient(circle at 15% 10%,rgba(255,138,31,.08),transparent 28%),radial-gradient(circle at 85% 70%,rgba(74,107,155,.12),transparent 34%)'}} />

      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#090d16]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3 md:px-7">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#ff8a1f]/35 bg-[#ff8a1f]/[0.06] font-serif text-sm text-[#ffad62]">知</div>
            <div>
              <div className="text-[9px] font-bold tracking-[.22em] text-[#ff9a42]">KNOWLEDGE LAYER</div>
              <h1 className="font-serif text-lg font-semibold">Knowledge Core</h1>
              <p className="text-[9px] tracking-wide text-[#768196]">意味を見つけ、望みと行動へつなぐ。</p>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-[10px] font-semibold">
            <span className="hidden rounded-full border border-[#ff8a1f]/25 bg-[#ff8a1f]/[0.06] px-3 py-2 text-[#ffad62] sm:inline-flex">知 · Knowledge</span>
            <Link href={APP_ROUTES.wantTo} className="rounded-full border border-white/[0.09] px-3 py-2 text-[#aeb9ca] hover:border-[#ff8a1f]/30 hover:text-white">望 · Want to</Link>
            <Link href={APP_ROUTES.quest} className="rounded-full border border-white/[0.09] px-3 py-2 text-[#aeb9ca] hover:border-[#ff8a1f]/30 hover:text-white">行 · Quest</Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-[1440px] gap-5 px-4 py-6 md:px-7 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#66738a]">知 → 望 → 行</p>
              <h2 className="mt-1 font-serif text-3xl font-semibold tracking-tight">知識を、使える接続点に。</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[#8793a6]">別サイトではなく、このアプリ内のKnowledge正本としてSupabaseから直接読み込みます。</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-right">
              <div className="text-2xl font-semibold text-white">{visible.length}</div>
              <div className="text-[9px] uppercase tracking-[.18em] text-[#66738a]">knowledge nodes</div>
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
            <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="概念・言葉・問いを探す" className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#0d1320] px-4 text-sm outline-none placeholder:text-[#59667a] focus:border-[#ff8a1f]/45" />
          </div>

          {loading && <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-8 text-sm text-[#7d899d]">Knowledge Coreを同期中…</div>}
          {error && <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-5 text-sm text-red-200">{error}</div>}

          {!loading && !error && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((item) => (
                <button key={item.id} onClick={()=>setSelectedId(item.id)} className={`min-h-40 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${selectedId===item.id?'border-[#ff8a1f]/45 bg-[#ff8a1f]/[0.06]':'border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14]'}`}>
                  <div className="flex items-center justify-between gap-3 text-[9px] uppercase tracking-[.14em] text-[#6f7c91]"><span>{item.layer || 'CORE'}</span><span>{item.domain || item.item_type || ''}</span></div>
                  <h3 className="mt-4 font-serif text-lg font-semibold leading-7 text-[#eef2f8]">{item.title}</h3>
                  <p className="mt-3 line-clamp-3 text-xs leading-6 text-[#8995a8]">{item.summary || item.content || '詳細を開いて確認'}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
          <div className="h-full overflow-auto rounded-3xl border border-white/[0.08] bg-[#0c121e]/95 p-5 shadow-2xl shadow-black/20">
            {!selected ? (
              <div className="grid min-h-72 place-items-center text-center text-sm leading-7 text-[#6f7c91]">知識カードを選ぶと、要旨・Want to・Questとの接続をここに表示します。</div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-[9px] font-bold tracking-[.2em] text-[#ff9a42]">KNOWLEDGE NODE</p><h2 className="mt-2 font-serif text-2xl font-semibold leading-9">{selected.title}</h2></div>
                  <button onClick={()=>setSelectedId(null)} className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-[#8793a6]">×</button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[9px] text-[#8793a6]">
                  {[selected.domain, selected.layer, selected.item_type].filter(Boolean).map((x)=><span key={x} className="rounded-full border border-white/[0.08] px-2.5 py-1">{x}</span>)}
                </div>
                {selected.summary && <section className="mt-6 border-t border-white/[0.07] pt-5"><div className="text-[9px] font-bold tracking-[.18em] text-[#66738a]">ESSENCE</div><p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-[#c3ccda]">{selected.summary}</p></section>}
                {selected.content && <section className="mt-6 border-t border-white/[0.07] pt-5"><div className="text-[9px] font-bold tracking-[.18em] text-[#66738a]">NOTE</div><p className="mt-2 whitespace-pre-wrap text-sm leading-8 text-[#aeb9ca]">{selected.content}</p></section>}

                {!!selectedWants.length && <section className="mt-6 border-t border-white/[0.07] pt-5"><div className="mb-3 text-[9px] font-bold tracking-[.18em] text-[#66738a]">望 · WANT TO</div><div className="space-y-2">{selectedWants.map((link,i)=>{const w=link.want_to_items!;return <Link key={`${w.external_id}-${i}`} href={`${APP_ROUTES.wantTo}?q=${encodeURIComponent(w.external_id || '')}`} className="block rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 hover:border-[#ff8a1f]/35"><div className="text-[9px] text-[#ff9a42]">{w.external_id || 'WANT'}</div><div className="mt-1 text-sm font-semibold text-[#e6ebf2]">{w.title}</div><div className="mt-1 text-[10px] text-[#77849a]">{w.theme || w.category || ''} · {link.relation || 'related'}</div></Link>})}</div></section>}

                {!!selectedQuests.length && <section className="mt-6 border-t border-white/[0.07] pt-5"><div className="mb-3 text-[9px] font-bold tracking-[.18em] text-[#66738a]">行 · QUEST</div><div className="space-y-2">{selectedQuests.map((link,i)=>{const q=link.quests!;return <Link key={`${q.external_id}-${i}`} href={`${APP_ROUTES.quest}?quest=${encodeURIComponent(q.external_id || '')}`} className="block rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 hover:border-[#ff8a1f]/35"><div className="text-[9px] text-[#ff9a42]">QUEST</div><div className="mt-1 text-sm font-semibold text-[#e6ebf2]">{q.title}</div><div className="mt-1 text-[10px] text-[#77849a]">{q.app_status || ''} · {link.role || 'applies'}</div></Link>})}</div></section>}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
