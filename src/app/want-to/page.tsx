'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_COLORS, WANT_TO_SEED, type WantToSeed } from '@/lib/wantToSeed';

type Achievement = {
  id: string;
  wantId: string;
  date: string;
  withWho: string;
  place: string;
  satisfaction: number;
  repeat: number;
  note: string;
};

type LevelMap = Record<string, number>;
type ViewMode = 'cards' | 'table';
type EnrichedWant = WantToSeed & {
  theme: string;
  type: string;
  timing: string;
  logs: Achievement[];
  count: number;
  avgSatisfaction: number | null;
  avgRepeat: number | null;
  myLevel?: number;
};

const ACHIEVEMENT_KEY = 'ace-want-achievements-v1';
const LEVEL_KEY = 'ace-want-levels-v1';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gkYpIk28ScWY5xlFfkjyyBVa0Cmx3pl_oQuJ5sC8ij4/edit';

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function inferTheme(item: WantToSeed) {
  const s = `${item.title} ${item.action}`;
  if (/生ききる|自分の人生|自分に戻る|自己決定|Want to|直感|自分しかできない/.test(s)) return '自己一致・自由';
  if (/睡眠|食事|健康|副交感|美容|口腔|脳機能|身体機能|回復/.test(s)) return '回復・健康';
  if (/パートナー|家族|親子|安心|仲間|信頼|関係/.test(s)) return '愛・つながり';
  if (/自然|BASE|平屋|二拠点|三拠点|土地|旅|温泉|日光|朝日|畑/.test(s)) return '自然・暮らし';
  if (/身体|競技|セパタクロー|アスリート|挑戦/.test(s)) return '挑戦・身体性';
  if (/研究|理解|解明|哲学|数秘|エニアグラム|一次資料|反証|分析|学習|仮説/.test(s)) return '探究・理解';
  if (/AI|OS|自動化|体系化|知識|再利用|仕組み|メソッド|モデル|プロトコル/.test(s)) return '知識化・仕組み化';
  if (/note|SNS|ブランド|発信|物語|検索|ストーリー|世界観|SEO/.test(s)) return '表現・物語';
  if (/商品|売上|収益|事業|仕事|現金化|顧客/.test(s)) return '価値提供・収益';
  if (/お金|資産|キャッシュフロー|防衛資金|資本|投資/.test(s)) return '自由・資産';
  if (/ACE|教育|育てる|成長OS|ゴール設定|コミュニティ|実践者/.test(s)) return '育成・自己決定';
  if (/次世代|残す|継承|世界一/.test(s)) return '継承・レガシー';
  if (/地域|国づくり|日本|社会|循環|生産者/.test(s)) return '循環・社会実装';
  return '統合・成長';
}

function inferType(item: WantToSeed) {
  const s = `${item.title} ${item.action}`;
  if (item.category === '家族・人間関係' && /関係|パートナー|家族|親子|仲間|信頼|協力|話/.test(s)) return '関係性';
  if (/研究|理解|解明|分析|学習|判断|読み解く|仮説|反証/.test(s)) return '探究';
  if (/土地を持つ|資金を持つ|防衛資金|資格取得|実物資産|取得|購入/.test(s)) return '獲得';
  if (/旅|温泉|体験|行く|見る|食べる/.test(s)) return '体験';
  if (/仕組み|OS|体系|自動化|メソッド|プログラム|モデル|循環|自走|プロトコル/.test(s)) return '仕組み';
  if (/作る|完成|確立|商品化|強くする|発展させる|増やす|育てる|教材化/.test(s)) return 'プロジェクト';
  if (/毎|定期的|続ける|日常化|習慣|保つ|積み上げる|ルーチン/.test(s)) return '習慣';
  if (item.category === '地域・社会・未来') return '貢献';
  return '状態';
}

function timingFor(type: string, item: WantToSeed) {
  if (type === '体験') return /増やす|続ける|定期|毎|季節/.test(item.title) ? 'Ongoing' : 'One-shot';
  if (type === '獲得') return 'One-shot';
  if (type === 'プロジェクト' || type === '仕組み') return 'Hybrid';
  return 'Ongoing';
}

function stars(n: number) {
  return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
}

function avg(values: number[]) {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function csvEscape(value: unknown) {
  const s = String(value ?? '');
  return `"${s.replaceAll('"', '""')}"`;
}

export default function WantToPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [source, setSource] = useState('');
  const [tier, setTier] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pinOnly, setPinOnly] = useState(false);
  const [view, setView] = useState<ViewMode>('cards');
  const [selected, setSelected] = useState<EnrichedWant | null>(null);
  const [achieving, setAchieving] = useState<WantToSeed | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [levels, setLevels] = useState<LevelMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setAchievements(JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY) || '[]'));
      setLevels(JSON.parse(localStorage.getItem(LEVEL_KEY) || '{}'));
    } catch {
      setAchievements([]);
      setLevels({});
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(achievements));
  }, [achievements, hydrated]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(LEVEL_KEY, JSON.stringify(levels));
  }, [levels, hydrated]);

  const enriched = useMemo<EnrichedWant[]>(() => WANT_TO_SEED.map((item) => {
    const theme = inferTheme(item);
    const type = inferType(item);
    const timing = timingFor(type, item);
    const logs = achievements.filter((a) => a.wantId === item.id);
    return {
      ...item,
      theme,
      type,
      timing,
      logs,
      count: logs.length,
      avgSatisfaction: avg(logs.map((a) => a.satisfaction)),
      avgRepeat: avg(logs.map((a) => a.repeat)),
      myLevel: levels[item.id],
    };
  }), [achievements, levels]);

  const categories = useMemo(() => [...new Set(WANT_TO_SEED.map((x) => x.category))], []);
  const types = useMemo(() => [...new Set(enriched.map((x) => x.type))], [enriched]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((item) => {
      const haystack = [item.id, item.category, item.title, item.source, item.tier, item.action, item.theme, item.type, item.timing, ...item.prereq, ...item.related].join(' ').toLowerCase();
      return (!q || haystack.includes(q))
        && (!category || item.category === category)
        && (!source || item.source === source)
        && (!tier || item.tier === tier)
        && (!typeFilter || item.type === typeFilter)
        && (!pinOnly || item.pin === 5);
    });
  }, [enriched, query, category, source, tier, typeFilter, pinOnly]);

  const totalAchieved = achievements.length;
  const achievedWants = new Set(achievements.map((a) => a.wantId)).size;
  const evaluated = Object.keys(levels).length;

  function saveAchievement(payload: Omit<Achievement, 'id'>) {
    setAchievements((prev) => [{ ...payload, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` }, ...prev]);
    setAchieving(null);
  }

  function exportLogs() {
    const header = ['Log ID','達成日','親Want ID','達成したこと','誰と','場所・体験','満足度 0-5','またやりたい度 0-5','メモ'];
    const rows = achievements.map((a) => {
      const want = WANT_TO_SEED.find((w) => w.id === a.wantId);
      return [a.id, a.date, a.wantId, want?.title || '', a.withWho, a.place, a.satisfaction, a.repeat, a.note];
    });
    const csv = '\uFEFF' + [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `want-to-achievements-${todayLocal()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-[#f7f5ef]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-white">← Quest</Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">✦</span>
                <h1 className="truncate text-lg font-black tracking-tight">Want to Master</h1>
              </div>
              <p className="text-[11px] text-slate-500">Master snapshot + local achievements</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="hidden rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-white sm:inline-flex">Sheet ↗</a>
            <button onClick={exportLogs} disabled={!achievements.length} className="rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:opacity-30">ログCSV</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Want to" value={WANT_TO_SEED.length} note="上限なし" />
          <Stat label="表示中" value={visible.length} note="検索・絞込" />
          <Stat label="★★★★★" value={WANT_TO_SEED.filter((x) => x.pin === 5).length} note="センターピン候補" />
          <Stat label="達成ログ" value={totalAchieved} note={`${achievedWants}項目`} />
          <Stat label="現在地評価" value={evaluated} note="0〜5本人評価" />
        </section>

        <section className="mt-5 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[2fr_repeat(4,1fr)]">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔎 温泉、家族、ACE、健康、W038…" className="min-h-12 rounded-2xl border border-stone-300 px-4 text-base outline-none focus:border-slate-500" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-12 rounded-2xl border border-stone-300 px-3">
              <option value="">全ジャンル</option>{categories.map((x) => <option key={x}>{x}</option>)}
            </select>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="min-h-12 rounded-2xl border border-stone-300 px-3">
              <option value="">全確度</option><option>明示</option><option>AI推定</option><option>探索候補</option>
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value)} className="min-h-12 rounded-2xl border border-stone-300 px-3">
              <option value="">全階層</option><option>前提</option><option>中間</option><option>上位</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="min-h-12 rounded-2xl border border-stone-300 px-3">
              <option value="">全Want to型</option>{types.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setPinOnly((x) => !x)} className={`rounded-full px-3 py-2 text-xs font-bold ${pinOnly ? 'bg-amber-300 text-amber-950' : 'border border-stone-300 bg-stone-50'}`}>★★★★★だけ</button>
              <button onClick={() => { setQuery(''); setCategory(''); setSource(''); setTier(''); setTypeFilter(''); setPinOnly(false); }} className="rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold">リセット</button>
            </div>
            <div className="flex rounded-full border border-stone-300 p-1 text-xs font-bold">
              <button onClick={() => setView('cards')} className={`rounded-full px-3 py-1.5 ${view === 'cards' ? 'bg-slate-900 text-white' : ''}`}>カード</button>
              <button onClick={() => setView('table')} className={`rounded-full px-3 py-1.5 ${view === 'table' ? 'bg-slate-900 text-white' : ''}`}>表</button>
            </div>
          </div>
        </section>

        <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
          <span>Sheetスナップショット: 2026-08-23</span>
          <span>達成ログ・本人評価はこの端末に保存</span>
        </div>

        {view === 'cards' ? (
          <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <article key={item.id} className="group rounded-3xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftWidth: 6, borderLeftColor: CATEGORY_COLORS[item.category] }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span className="rounded-full bg-stone-100 px-2 py-1">{item.id}</span>
                      <span className="rounded-full px-2 py-1" style={{ backgroundColor: `${CATEGORY_COLORS[item.category]}20`, color: CATEGORY_COLORS[item.category] }}>{item.category}</span>
                      <SourceBadge value={item.source} />
                    </div>
                    <h2 className="mt-3 text-lg font-black leading-snug">{item.title}</h2>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs tracking-tight text-amber-500">{stars(item.pin)}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{item.tier}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                  <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{item.theme}</span>
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{item.type}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{item.timing}</span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600">{item.action}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-stone-50 p-3 text-center">
                  <MiniStat label="現在地" value={item.myLevel === undefined ? '—' : `${item.myLevel}/5`} />
                  <MiniStat label="達成" value={`${item.count}回`} />
                  <MiniStat label="満足" value={item.avgSatisfaction === null ? '—' : `${item.avgSatisfaction}`} />
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => setSelected(item)} className="flex-1 rounded-2xl border border-stone-300 px-3 py-2.5 text-sm font-bold hover:bg-stone-50">詳細</button>
                  <button onClick={() => setAchieving(item)} className="flex-1 rounded-2xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-700">✓ 叶えた！</button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-4 overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="bg-stone-100 text-left text-xs text-slate-500"><tr><th className="p-3">ID</th><th>ジャンル</th><th>Want to</th><th>テーマ</th><th>型</th><th>中心ピン</th><th>現在地</th><th>達成</th><th className="pr-3">操作</th></tr></thead>
              <tbody>{visible.map((item) => <tr key={item.id} className="border-t border-stone-100"><td className="p-3 font-bold">{item.id}</td><td><span className="font-semibold" style={{ color: CATEGORY_COLORS[item.category] }}>{item.category}</span></td><td className="max-w-sm py-3 font-bold">{item.title}</td><td>{item.theme}</td><td>{item.type}</td><td className="text-amber-500">{stars(item.pin)}</td><td>{item.myLevel === undefined ? '—' : `${item.myLevel}/5`}</td><td>{item.count}回</td><td className="pr-3"><div className="flex gap-1"><button onClick={() => setSelected(item)} className="rounded-lg border px-2 py-1">詳細</button><button onClick={() => setAchieving(item)} className="rounded-lg bg-slate-900 px-2 py-1 text-white">叶えた</button></div></td></tr>)}</tbody>
            </table>
          </section>
        )}

        {!visible.length && <div className="mt-12 text-center text-slate-500">該当するWant toが見つからなかった。</div>}
      </main>

      {selected && <DetailModal item={selected} achievements={selected.logs} level={levels[selected.id]} onLevel={(level) => setLevels((p) => ({ ...p, [selected.id]: level }))} onAchieve={() => { setSelected(null); setAchieving(selected); }} onClose={() => setSelected(null)} />}
      {achieving && <AchievementModal item={achieving} onSave={saveAchievement} onClose={() => setAchieving(null)} />}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"><div className="text-2xl font-black">{value}</div><div className="mt-1 text-xs font-bold text-slate-600">{label}</div><div className="mt-1 text-[10px] text-slate-400">{note}</div></div>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div><div className="text-base font-black">{value}</div><div className="text-[10px] text-slate-400">{label}</div></div>;
}

function SourceBadge({ value }: { value: string }) {
  const cls = value === '明示' ? 'bg-emerald-100 text-emerald-700' : value === 'AI推定' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700';
  return <span className={`rounded-full px-2 py-1 ${cls}`}>{value}</span>;
}

function DetailModal({ item, achievements, level, onLevel, onAchieve, onClose }: { item: EnrichedWant; achievements: Achievement[]; level?: number; onLevel: (n: number) => void; onAchieve: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold text-slate-400">{item.id} · {item.category}</div><h2 className="mt-2 text-2xl font-black leading-tight">{item.title}</h2></div><button onClick={onClose} className="rounded-full border px-3 py-1.5">✕</button></div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{item.theme}</span><span className="rounded-full bg-sky-50 px-2 py-1 text-sky-700">{item.type}</span><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">{item.timing}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">{stars(item.pin)}</span></div>
      <section className="mt-5 rounded-2xl bg-stone-50 p-4"><div className="text-xs font-bold text-slate-400">達成・クリアの方向</div><p className="mt-1 leading-relaxed">{item.action}</p></section>
      <section className="mt-4"><div className="text-xs font-bold text-slate-400">現在地（本人評価）</div><div className="mt-2 flex gap-2">{[0,1,2,3,4,5].map((n) => <button key={n} onClick={() => onLevel(n)} className={`h-10 w-10 rounded-full border text-sm font-black ${level === n ? 'border-slate-900 bg-slate-900 text-white' : 'border-stone-300'}`}>{n}</button>)}</div><div className="mt-2 text-xs text-slate-500">0 未着手 → 1 構想 → 2 試行 → 3 実行 → 4 定着 → 5 自走・展開</div></section>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border border-stone-200 p-4"><div className="text-xs font-bold text-slate-400">前提</div><div className="mt-2 flex flex-wrap gap-1">{item.prereq.length ? item.prereq.map((x) => <span key={x} className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-bold">{x}</span>) : <span className="text-sm text-slate-400">起点候補</span>}</div></section><section className="rounded-2xl border border-stone-200 p-4"><div className="text-xs font-bold text-slate-400">関連</div><div className="mt-2 flex flex-wrap gap-1">{item.related.length ? item.related.map((x) => <span key={x} className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-bold">{x}</span>) : <span className="text-sm text-slate-400">—</span>}</div></section></div>
      <section className="mt-4 rounded-2xl border border-stone-200 p-4"><div className="flex items-center justify-between"><div className="text-xs font-bold text-slate-400">達成履歴</div><div className="text-sm font-black">{achievements.length}回</div></div>{achievements.slice(0,4).map((a) => <div key={a.id} className="mt-3 border-t border-stone-100 pt-3 text-sm"><div className="font-bold">{a.date} {a.place ? `· ${a.place}` : ''}</div><div className="mt-1 text-xs text-slate-500">{a.withWho || '同伴者未記録'} · 満足 {a.satisfaction}/5 · またやりたい {a.repeat}/5</div>{a.note && <div className="mt-1 text-xs text-slate-600">{a.note}</div>}</div>)}{!achievements.length && <div className="mt-2 text-sm text-slate-400">まだ達成ログなし。</div>}</section>
      <button onClick={onAchieve} className="mt-5 w-full rounded-2xl bg-slate-900 py-3 font-black text-white">✓ 叶えた！を記録</button>
    </div>
  </div>;
}

function AchievementModal({ item, onSave, onClose }: { item: WantToSeed; onSave: (x: Omit<Achievement,'id'>) => void; onClose: () => void }) {
  const [date, setDate] = useState(todayLocal());
  const [withWho, setWithWho] = useState('');
  const [place, setPlace] = useState('');
  const [satisfaction, setSatisfaction] = useState(5);
  const [repeat, setRepeat] = useState(5);
  const [note, setNote] = useState('');
  return <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
    <form onSubmit={(e) => { e.preventDefault(); onSave({ wantId: item.id, date, withWho, place, satisfaction, repeat, note }); }} className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold text-emerald-600">叶えた！</div><h2 className="mt-1 text-xl font-black">{item.title}</h2></div><button type="button" onClick={onClose} className="rounded-full border px-3 py-1.5">✕</button></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-500">達成日<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 text-base font-normal text-slate-900" /></label><label className="text-xs font-bold text-slate-500">誰と<input value={withWho} onChange={(e) => setWithWho(e.target.value)} placeholder="例：あいちゃん＋MAHRU" className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 text-base font-normal text-slate-900" /></label><label className="text-xs font-bold text-slate-500 sm:col-span-2">場所・体験<input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="例：箱根温泉" className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 text-base font-normal text-slate-900" /></label></div>
      <Rating label="満足度" value={satisfaction} onChange={setSatisfaction} /><Rating label="またやりたい度" value={repeat} onChange={setRepeat} />
      <label className="mt-4 block text-xs font-bold text-slate-500">メモ<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="新しく生まれたWant toや気づき" className="mt-1 w-full rounded-xl border border-stone-300 p-3 text-base font-normal text-slate-900" /></label>
      <button type="submit" className="mt-5 w-full rounded-2xl bg-emerald-600 py-3 font-black text-white">達成ログに追加</button>
    </form>
  </div>;
}

function Rating({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return <div className="mt-4"><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-2 flex gap-2">{[1,2,3,4,5].map((n) => <button key={n} type="button" onClick={() => onChange(n)} className={`h-10 w-10 rounded-full border font-black ${value === n ? 'border-amber-400 bg-amber-300 text-amber-950' : 'border-stone-300'}`}>{n}</button>)}</div></div>;
}
