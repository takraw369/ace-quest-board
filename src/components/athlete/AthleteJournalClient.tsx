'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  type AthleteCheckin, type AthleteDrill, type AthleteLog, type AthleteQuest,
  type AthleteReflection, type AthleteTab, type LegacyAthleteSession,
  QUESTS, clearCheckin, formatDate, getStreak, localDate,
  readCheckin, readJournal, readLegacy, weeklyLoad, writeCheckin, writeJournal,
} from '@/lib/athleteJournal';

type NoteDraft = {
  date: string; title: string; sport: string; duration: number;
  rpe: number; focus: string; drills: AthleteDrill[]; memo: string;
};
const emptyDraft = (): NoteDraft => ({
  date: localDate(), title: '今日の練習', sport: '競技練習', duration: 60, rpe: 5,
  focus: '', drills: [], memo: '',
});
const nav: { tab: AthleteTab; mark: string; label: string }[] = [
  { tab: 'home', mark: '⌂', label: 'ホーム' },
  { tab: 'note', mark: '▤', label: 'ノート' },
  { tab: 'checkin', mark: '◉', label: 'チェック' },
  { tab: 'growth', mark: '↗', label: '成長' },
];
const metrics: { key: keyof Pick<AthleteCheckin, 'energy' | 'focus' | 'body' | 'sleep' | 'mood'>; name: string; icon: string; low: string; high: string }[] = [
  { key: 'energy', name: 'エネルギー', icon: 'ϟ', low: '低い', high: '高い' },
  { key: 'focus', name: '集中力', icon: '◎', low: '散漫', high: '集中' },
  { key: 'body', name: '身体の状態', icon: '◒', low: '重い', high: '軽い' },
  { key: 'sleep', name: '睡眠の質', icon: '☾', low: '浅い', high: '良い' },
  { key: 'mood', name: '気分', icon: '✧', low: '沈む', high: '前向き' },
];
const card = 'rounded-[24px] border border-white/[.09] bg-[#112230]/95 p-4 shadow-[0_14px_40px_rgba(0,0,0,.15)] sm:p-5';
const field = 'min-h-12 w-full min-w-0 rounded-xl border border-white/15 bg-[#081824] px-4 text-[16px] text-[#f4f6f2] outline-none placeholder:text-[#667f8a] focus:border-[#69dad1]';
const primary = 'flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ffe0a0] to-[#d8ad63] px-5 text-[15px] font-extrabold text-[#18202a] shadow-[0_12px_25px_rgba(204,158,77,.14)] transition-[filter] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe0a0] disabled:cursor-not-allowed disabled:opacity-40';
const secondary = 'flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-4 text-[13px] font-semibold text-[#d6e5e4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6bddce]';
const label = 'mb-2 block text-[12px] font-bold tracking-[.03em] text-[#dce8e5]';
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 100000)}`;

function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return <div className="flex min-w-0 items-end justify-between gap-3">
    <div className="min-w-0"><p className="text-[10px] font-bold tracking-[.23em] text-[#66cec6]">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-[21px] font-semibold tracking-[.02em] text-[#f7f4ea] sm:text-[24px]">{title}</h2></div>{right}
  </div>;
}
function MiniBars({ series }: { series: ReturnType<typeof weeklyLoad> }) {
  const maximum = Math.max(1, ...series.map(p => p.load));
  return <div role="img" aria-label={`直近7日の運動負荷: ${series.map(p => `${p.day}曜日 ${p.load}`).join('、')}`} className="grid grid-cols-7 items-end gap-2">
    {series.map((point, i) => <div key={point.date} className="flex min-w-0 flex-col items-center justify-end gap-2">
      <div className="relative flex h-24 w-full items-end overflow-hidden rounded-md bg-[#081b2a]">
        <div className={`w-full rounded-t-[4px] ${i === 6 ? 'bg-gradient-to-t from-[#4fa79f] to-[#82f4e0]' : 'bg-gradient-to-t from-[#367f87] to-[#68c7c7]'}`}
          style={{ height: point.load ? `${Math.max(9, Math.round(point.load / maximum * 100))}%` : '0%' }} />
      </div>
      <span className={`text-[11px] ${i === 6 ? 'font-bold text-[#d5efe8]' : 'text-[#91a7ac]'}`}>{point.day}</span>
    </div>)}
  </div>;
}
function ConditionGauge({ value }: { value: number | null }) {
  return <div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-[conic-gradient(#63d8cb_var(--gauge),#24404a_0)] p-[7px]"
    style={{ '--gauge': `${(value || 0) * 20}%` } as React.CSSProperties}>
    <div className="grid h-full w-full place-items-center rounded-full bg-[#112b35]">
      <div className="text-center"><p className="text-[23px] font-bold tabular-nums text-[#d8f9f0]">{value ?? '—'}</p><p className="text-[10px] text-[#89a9a9]">/ 5</p></div>
    </div>
  </div>;
}
function TrainingCard({ item, onOpen }: { item: AthleteLog; onOpen: (log: AthleteLog) => void }) {
  return <button type="button" onClick={() => onOpen(item)} className="flex min-h-[78px] w-full min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#10222f] px-4 py-3 text-left transition-colors hover:border-[#59c9bd]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#62d9c9]">
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#233d46] text-[24px] text-[#d6b978]">▤</span>
    <span className="min-w-0 flex-1">
      <span className="block text-[11px] text-[#72c7bf]">{formatDate(item.date)}　{item.sport}</span>
      <span className="mt-1 block truncate text-[14px] font-bold text-[#f2f5ef]">{item.title}</span>
      <span className="mt-1 block truncate text-[11px] text-[#94aeb4]">{item.focus || item.memo || '記録を確認・編集する'}</span>
    </span><span className="shrink-0 text-xl text-[#9ab9b6]" aria-hidden>›</span>
  </button>;
}
function Stat({ title, value, suffix, small }: { title: string; value: number; suffix: string; small?: string }) {
  return <div className="min-w-0 rounded-2xl border border-white/10 bg-[#102533] px-3 py-4">
    <p className="text-[10px] text-[#9db1b6]">{title}</p>
    <p className="mt-2 text-[27px] font-bold tabular-nums leading-none text-[#f9ebcc]">{value}<span className="ml-1 text-[11px] font-medium text-[#bacac9]">{suffix}</span></p>
    {small && <p className="mt-2 text-[10px] text-[#81b9ac]">{small}</p>}
  </div>;
}
function RatingRow({ name, icon, low, high, value, onChange }: {
  name: string; icon: string; low: string; high: string; value: number; onChange: (n: number) => void;
}) {
  return <div className="border-b border-white/[.08] py-4 last:border-0">
    <div className="mb-3 flex items-center gap-2"><span className="text-[19px] text-[#f5d394]" aria-hidden>{icon}</span><p className="text-[14px] font-semibold text-[#e8f0ed]">{name}</p><span className="ml-auto text-[11px] text-[#82ccc0]">{value}/5</span></div>
    <div className="grid grid-cols-5 gap-2" role="group" aria-label={name}>
      {[1,2,3,4,5].map(n => <button type="button" key={n} aria-pressed={value === n} onClick={() => onChange(n)}
        className={`grid aspect-square min-h-11 min-w-0 place-items-center rounded-full border text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8cf3de] ${value === n ? 'border-[#81eddf] bg-[#58d5cb] text-[#08222b] shadow-[0_0_18px_rgba(84,218,203,.2)]' : 'border-white/15 bg-[#10212d] text-[#afbec7]'}`}>{n}</button>)}
    </div>
    <div className="mt-2 flex justify-between text-[10px] text-[#819ba3]"><span>{low}</span><span>{high}</span></div>
  </div>;
}
function BrandHero({ onNote, onCheckin }: { onNote: () => void; onCheckin: () => void }) {
  return <div className="relative isolate overflow-hidden rounded-[28px] border border-[#cfbb8a]/20 bg-[#132735] shadow-[0_22px_70px_rgba(0,0,0,.25)]">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_22%,rgba(247,196,105,.36),transparent_37%),linear-gradient(125deg,#132632_0%,#17303a_55%,#070f1b_100%)]" aria-hidden />
    <svg className="pointer-events-none absolute bottom-0 right-0 h-full w-[70%] opacity-[0.55]" viewBox="0 0 330 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs><linearGradient id="aceHero" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#e9c78b" stopOpacity=".35"/><stop offset="1" stopColor="#4fc6c7" stopOpacity=".08"/></linearGradient></defs>
      <circle cx="264" cy="82" r="72" fill="url(#aceHero)"/><path d="M-50 276 Q140 173 410 266 M-30 298 Q156 194 390 284 M-20 329 Q166 218 380 301" stroke="#d6bd86" strokeOpacity=".32" strokeWidth="2" fill="none"/>
      <path d="M161 218l24-51 19-17 28 1-5-25 14-20 19 6-8 27-5 15 15 32-25 11-25-22-19 38-21 27z" fill="#070f19" opacity=".95"/>
      <circle cx="247" cy="95" r="13" fill="#070f19"/>
      <path d="M227 156l-45-15-36 16M230 199l-49 31-5 45M249 189l48 29 6 58" stroke="#08121b" strokeWidth="17" strokeLinecap="round" fill="none"/>
      <path d="M0 271 Q144 220 344 277 L344 320 0 320Z" fill="#06111c" fillOpacity=".75"/>
    </svg>
    <div className="relative z-10 p-5 pb-7 sm:p-7">
      <div className="flex items-center gap-2"><span className="h-[2px] w-6 bg-[#f1ca86]"/><span className="text-[10px] font-bold tracking-[.26em] text-[#e9ce9e]">TRAINING JOURNAL</span></div>
      <h2 className="mt-6 max-w-[270px] font-serif text-[28px] font-semibold leading-[1.45] text-[#fff5dc] sm:text-[35px]">今日の練習が、<br/>未来の自分をつくる。</h2>
      <p className="mt-3 max-w-[270px] text-[12px] leading-6 text-[#d0dbd9]">書く。振り返る。気づきを重ねる。<br/>次の一歩を、自分で選ぼう。</p>
      <div className="mt-7 grid max-w-[340px] grid-cols-2 gap-2">
        <button className="min-h-12 rounded-xl bg-gradient-to-r from-[#ffe0a2] to-[#d9ad62] px-3 text-[12px] font-extrabold text-[#1e2630]" onClick={onNote}>✎ 練習ノートを書く</button>
        <button className="min-h-12 rounded-xl border border-[#a2e8d5]/50 bg-[#0e313e]/80 px-3 text-[12px] font-bold text-[#c9eee3]" onClick={onCheckin}>◉ 練習前チェック</button>
      </div>
    </div>
  </div>;
}
export default function AthleteJournalClient() {
  const [tab, setTab] = useState<AthleteTab>('home');
  const [logs, setLogs] = useState<AthleteLog[]>([]);
  const [legacy, setLegacy] = useState<LegacyAthleteSession[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [checkin, setCheckin] = useState<Omit<AthleteCheckin, 'at'>>({
    energy: 3, focus: 3, body: 3, sleep: 3, mood: 3, goal: '', quest: 'one',
  });
  const [pending, setPending] = useState<AthleteCheckin | null>(null);
  const [draft, setDraft] = useState<NoteDraft>(() => ({
    date: '', title: '今日の練習', sport: '競技練習', duration: 60, rpe: 5, focus: '', drills: [], memo: '',
  }));
  const [draftDrill, setDraftDrill] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [reflectId, setReflectId] = useState<string | null>(null);
  const [reflection, setReflection] = useState<AthleteReflection>({ good: '', improve: '', confidence: 3 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  useEffect(() => {
    setLogs(readJournal()); setLegacy(readLegacy());
    const stored = readCheckin();
    setPending(stored);
    if (stored) setCheckin({ energy: stored.energy, focus: stored.focus, body: stored.body, sleep: stored.sleep, mood: stored.mood, goal: stored.goal, quest: stored.quest });
    setDraft(emptyDraft());
    setReady(true);
  }, []);
  const week = useMemo(() => weeklyLoad(logs), [logs]);
  const weekSessions = week.reduce((sum,p) => sum + p.sessions, 0);
  const weekMinutes = week.reduce((sum,p) => sum + p.minutes, 0);
  const streak = useMemo(() => getStreak(logs), [logs]);
  const conditionValue = pending ? Math.round((pending.energy + pending.body + pending.focus) / 3) : null;
  const recent = logs[0];
  const selectedLog = logs.find(l => l.id === reflectId) || null;
  const go = (next: AthleteTab) => { setError(''); setToast(''); setTab(next); window.scrollTo({ top: 0, behavior: 'instant' }); };
  const newNote = () => { setEditId(null); setDraft(emptyDraft()); setDraftDrill(''); go('note'); };
  const editNote = (log: AthleteLog) => {
    setEditId(log.id);
    setDraft({ date:log.date, title:log.title, sport:log.sport, duration:log.duration, rpe:log.rpe, focus:log.focus, drills:log.drills || [], memo:log.memo });
    setDraftDrill(''); go('note');
  };
  const submitCheckin = () => {
    const result: AthleteCheckin = { ...checkin, at: new Date().toISOString(), goal: checkin.goal.trim().slice(0,100) };
    if (!writeCheckin(result)) { setError('保存できませんでした。ブラウザの保存設定を確認してください。'); return; }
    setPending(result); setEditId(null);
    setDraft({ ...emptyDraft(), focus: result.goal });
    go('note'); setToast('チェックインを保存しました。次は練習ノートへ。');
  };
  const saveNote = () => {
    if (!ready || !draft.title.trim() || !draft.date || !Number.isFinite(draft.duration)) { setError('日付と練習名を入力してください。'); return; }
    const now = new Date().toISOString();
    const previous = editId ? logs.find(l => l.id === editId) : null;
    const entry: AthleteLog = {
      id: previous?.id || newId(), userId: null, date: draft.date,
      title: draft.title.trim().slice(0,60), sport:draft.sport.trim().slice(0,40),
      duration: Math.max(0, Math.min(1440, Math.round(draft.duration))),
      rpe:draft.rpe, focus:draft.focus.trim().slice(0,120),
      drills:draft.drills.slice(0,20), memo:draft.memo.trim().slice(0,1200),
      checkin:previous?.checkin || pending, reflection:previous?.reflection || null,
      createdAt:previous?.createdAt || now, updatedAt:now,
    };
    const next = [entry, ...logs.filter(l => l.id !== entry.id)]
      .sort((a,b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0,150);
    if (!writeJournal(next)) { setError('保存に失敗しました。ストレージの空き容量などをご確認ください。'); return; }
    setLogs(next);
    if (!previous && pending) { clearCheckin(); setPending(null); }
    setReflectId(entry.id);
    setReflection(entry.reflection || { good:'', improve:'', confidence:3 });
    setDeleteId(null);
    go('growth');
    setToast('練習ノートを保存しました。気づきを振り返ろう。');
  };
  const startReflection = (log: AthleteLog) => {
    setReflectId(log.id);
    setReflection(log.reflection || { good: '', improve: '', confidence: 3 });
    setDeleteId(null); go('growth');
  };
  const saveReflection = () => {
    if (!selectedLog) return;
    const now = new Date().toISOString();
    const next = logs.map(l => l.id === selectedLog.id ? { ...l,
      reflection: {good: reflection.good.trim().slice(0,500), improve: reflection.improve.trim().slice(0,500), confidence:reflection.confidence},
      updatedAt:now } : l);
    if (!writeJournal(next)) { setError('振り返りを保存できませんでした。'); return; }
    setLogs(next); setReflectId(null); setError('');
    setToast('振り返りを記録しました。次の一歩へ！');
  };
  const deleteLog = (id:string) => {
    if(deleteId !== id) { setDeleteId(id); return; }
    const next = logs.filter(l => l.id !== id);
    if (!writeJournal(next)) { setError('削除に失敗しました。'); return; }
    setLogs(next); setReflectId(null); setDeleteId(null);
    setToast('記録を削除しました。');
  };
  const addDrill = () => {
    const name = draftDrill.trim();
    if (!name || draft.drills.length >= 20) return;
    setDraft(d => ({ ...d, drills:[...d.drills, { id:newId(), name:name.slice(0,90), done:false }] }));
    setDraftDrill('');
  };
  const openTab = (next: AthleteTab) => {
    if (next === 'note' && !editId) setDraft(emptyDraft());
    go(next);
  };
  return <main className="relative min-h-[100dvh] min-w-0 overflow-x-hidden bg-[#07121e] pb-[calc(95px+env(safe-area-inset-bottom))] text-[#eaf0ef] selection:bg-[#63cec1]/30">
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-40 -top-48 h-[460px] w-[460px] rounded-full bg-[#428a98]/[.09] blur-[110px]" />
      <div className="absolute -right-40 top-[480px] h-[410px] w-[410px] rounded-full bg-[#c49b5c]/[.06] blur-[110px]" />
    </div>
    <div className="relative mx-auto w-full max-w-[620px] px-4 pt-5 sm:px-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div><p className="font-serif text-[29px] font-black italic leading-none tracking-[-.07em] text-[#eed09a]">ACE <span className="ml-1 not-italic text-[17px] font-semibold tracking-[.02em] text-[#f2f2ed]">Athlete</span></p>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[.2em] text-[#79a9ae]">TRAINING JOURNAL · FIND YOUR FLOW</p></div>
        <Link href="/quest-router" className="grid min-h-11 shrink-0 place-items-center rounded-full border border-white/15 px-4 text-[11px] font-semibold text-[#becfca]" aria-label="ACEのQuest Routerへ戻る">ACEへ ↗</Link>
      </header>
      {error && <div role="alert" className="mb-4 rounded-xl border border-[#e6a5a5]/40 bg-[#723b42]/30 px-4 py-3 text-[13px] text-[#ffd3d3]">{error}</div>}
      {toast && <div role="status" className="mb-4 rounded-xl border border-[#75d7c4]/30 bg-[#17453f]/40 px-4 py-3 text-[13px] text-[#bff5e4]">{toast}</div>}
      {!ready ? <p className="py-20 text-center text-sm text-[#93b0b6]">記録を読み込んでいます…</p> : <>
        {tab === 'home' && <div className="space-y-5">
          <BrandHero onNote={newNote} onCheckin={() => go('checkin')}/>
          <div className="grid grid-cols-3 gap-2">
            <Stat title="今週の練習" value={weekSessions} suffix="回" />
            <Stat title="今週の時間" value={weekMinutes} suffix="分" />
            <Stat title="継続日数" value={streak} suffix="日" small={streak ? '自分のペースで' : '今日から始めよう'} />
          </div>
          {pending && <div className={`${card} flex items-center gap-4`}>
            <ConditionGauge value={conditionValue} />
            <div className="min-w-0 flex-1"><p className="text-[10px] font-bold tracking-wider text-[#7fd5c7]">PRE-CHECK IN</p>
              <h3 className="mt-1 text-[17px] font-bold">練習の準備ができた</h3><p className="mt-1 truncate text-[12px] text-[#aec6c8]">{pending.goal || QUESTS.find(q=>q.id===pending.quest)?.subtitle}</p>
              <button className="mt-2 min-h-10 text-[12px] font-bold text-[#f0cc84] underline underline-offset-4" onClick={newNote}>ノートを書く →</button>
            </div>
          </div>}
          <section className={card}>
            <SectionTitle eyebrow="WEEKLY TRACE" title="今週のトレーニング" right={<span className="shrink-0 text-[10px] text-[#89a6ac]">運動負荷 = 分 × RPE</span>}/>
            <div className="mt-5"><MiniBars series={week}/></div>
            <p className="mt-4 text-[11px] leading-5 text-[#8fa7aa]">{weekSessions ? '記録に基づく主観的な運動負荷の目安です。' : '練習を記録すると、ここに7日間の積み重ねが現れます。'}</p>
          </section>
          <section className="space-y-3">
            <SectionTitle eyebrow="YOUR JOURNAL" title="最近の練習ノート"
              right={<button className="min-h-11 px-2 text-[12px] font-bold text-[#76d4c9]" onClick={() => go('growth')}>すべて見る →</button>}/>
            {logs.slice(0,3).map(log => <TrainingCard key={log.id} item={log} onOpen={editNote}/>)}
            {!recent && <div className={`${card} py-7 text-center`}><p className="text-[25px] text-[#d8bd81]">✎</p><p className="mt-2 text-[14px] font-bold">まだノートはありません</p><p className="mt-2 text-[12px] text-[#90adb1]">1回目の練習から、未来のヒントを残そう。</p><button onClick={newNote} className="mt-3 min-h-11 text-[13px] font-bold text-[#f1d08f] underline underline-offset-4">最初のノートを書く →</button></div>}
          </section>
        </div>}

        {tab === 'checkin' && <div className="space-y-4">
          <div className="rounded-[26px] border border-[#70c8c2]/25 bg-[linear-gradient(130deg,#13303a,#0c1a2a)] p-6">
            <p className="text-[10px] font-bold tracking-[.23em] text-[#73d9cd]">PRE-PRACTICE / 10 SEC</p>
            <h1 className="mt-3 font-serif text-[28px] font-semibold text-[#f6e9cb]">今の自分を、感じる。</h1>
            <p className="mt-2 text-[13px] leading-6 text-[#acc9c9]">数字は優劣じゃない。身体と心を観察して、今日の一歩を選ぼう。</p>
          </div>
          <section className={card} aria-label="練習前チェックイン">
            {metrics.map(metric => <RatingRow key={metric.key} {...metric} value={checkin[metric.key]} onChange={v=>setCheckin(s=>({...s,[metric.key]:v}))}/>)}
          </section>
          <section className={card}>
            <SectionTitle eyebrow="ACE QUEST" title="今日の小さなQuest" />
            <p className="mt-2 text-[12px] leading-6 text-[#96b4b7]">指示ではなく、選択。練習で試したいものを選ぼう。</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {QUESTS.map(q => <button key={q.id} type="button" aria-pressed={checkin.quest === q.id} onClick={()=>setCheckin(v=>({...v,quest:q.id}))}
                className={`min-h-[110px] min-w-0 rounded-2xl border px-2 py-3 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#83eade] ${checkin.quest===q.id ? 'border-[#72e4d9] bg-[#1b4548]' : 'border-white/10 bg-[#0d1d2b]'}`}>
                <span className="block text-[28px] text-[#ebd09c]">{q.icon}</span>
                <span className="mt-2 block text-[10px] font-black text-[#ddeae4]">{q.title}</span>
                <span className="mt-1 block text-[10px] leading-4 text-[#9db7b6]">{q.subtitle}</span>
              </button>)}
            </div>
            <label htmlFor="athlete-goal" className={`${label} mt-6`}>今日の目標 <span className="font-normal text-[#8da9ad]">（ひとつでOK）</span></label>
            <input id="athlete-goal" value={checkin.goal} maxLength={100} onChange={e=>setCheckin(v=>({...v,goal:e.target.value}))} placeholder="例：最初の一歩を丁寧に" className={field}/>
          </section>
          <button type="button" className={primary} onClick={submitCheckin}>チェックインを保存して練習へ　→</button>
          <p className="text-center text-[11px] leading-5 text-[#819da4]">記録はこのブラウザ内に保存されます。共有はされません。</p>
        </div>}

        {tab === 'note' && <div className="space-y-4">
          <div className="rounded-[26px] border border-[#d7b675]/20 bg-[linear-gradient(125deg,#162c38,#0c1c29)] p-6">
            <p className="text-[10px] font-bold tracking-[.23em] text-[#e9cc93]">TRAINING LOG / TODAY</p>
            <h1 className="mt-3 font-serif text-[28px] font-semibold text-[#fff3d7]">{editId ? '練習ノートを編集' : '練習を、未来の力に。'}</h1>
            <p className="mt-2 text-[12px] leading-6 text-[#a8c3c5]">記録するのは、結果だけじゃない。身体の感覚も、成長の証。</p>
          </div>
          {pending && !editId && <div className="flex items-center gap-3 rounded-2xl border border-[#6cc9bd]/20 bg-[#15353c] px-4 py-3"><span className="text-xl text-[#78d9c6]">✓</span><div><p className="text-[12px] font-bold">練習前チェックイン連携済み</p><p className="mt-1 text-[11px] text-[#abc5c3]">{QUESTS.find(q=>q.id===pending.quest)?.title} / {pending.goal || '感覚を観察する'}</p></div></div>}
          <section className={card}>
            <SectionTitle eyebrow="SESSION" title="今日の練習" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="min-w-0"><label htmlFor="athlete-date" className={label}>日付</label><input type="date" id="athlete-date" required value={draft.date} onChange={e=>setDraft(v=>({...v,date:e.target.value}))} className={`${field} px-2 text-[14px] [color-scheme:dark]`}/></div>
              <div className="min-w-0"><label htmlFor="athlete-sport" className={label}>種目</label><select id="athlete-sport" value={['競技練習','筋力トレーニング','試合','コンディショニング'].includes(draft.sport) ? draft.sport : 'その他'} onChange={e=>setDraft(v=>({...v,sport:e.target.value}))} className={`${field} px-2 text-[14px]`}>
                {['競技練習','筋力トレーニング','試合','コンディショニング','その他'].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
            </div>
            <div className="mt-4"><label htmlFor="athlete-title" className={label}>練習タイトル</label><input id="athlete-title" required maxLength={60} className={field} value={draft.title} onChange={e=>setDraft(v=>({...v,title:e.target.value}))} placeholder="例：チーム練習"/></div>
            <div className="mt-4"><label htmlFor="athlete-duration" className={label}>練習時間（分）</label><input id="athlete-duration" type="number" min="0" max="1440" step="5" className={field} value={draft.duration} onChange={e=>setDraft(v=>({...v,duration:Number(e.target.value)}))}/></div>
          </section>
          <section className={card}>
            <SectionTitle eyebrow="FOCUS" title="今日のテーマ" />
            <label htmlFor="athlete-focus" className={`${label} mt-4`}>意識したことをひとつ</label>
            <input id="athlete-focus" maxLength={120} className={field} value={draft.focus} onChange={e=>setDraft(v=>({...v,focus:e.target.value}))} placeholder="例：ファーストタッチの質"/>
            <h3 className="mt-7 text-[14px] font-bold">練習メニュー</h3>
            <div className="mt-3 space-y-2">{draft.drills.map(drill => <div key={drill.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/[.08] bg-[#0c1d2a] p-2">
              <button type="button" aria-label={`${drill.name}を${drill.done?'未完了':'完了'}にする`} aria-pressed={drill.done} onClick={()=>setDraft(d=>({...d,drills:d.drills.map(v=>v.id===drill.id?{...v,done:!v.done}:v)}))} className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border text-[16px] ${drill.done?'border-[#68dcca] bg-[#29625a] text-[#cefff3]':'border-white/15 text-[#87a2a9]'}`}>{drill.done?'✓':'○'}</button>
              <span className={`min-w-0 flex-1 break-words text-[13px] ${drill.done?'text-[#d3e7de]':'text-[#afc0c6]'}`}>{drill.name}</span>
              <button type="button" onClick={()=>setDraft(d=>({...d,drills:d.drills.filter(v=>v.id!==drill.id)}))} aria-label={`${drill.name}を削除`} className="grid h-10 w-10 shrink-0 place-items-center text-[18px] text-[#a2aeb9]">×</button>
            </div>)}</div>
            <div className="mt-3 flex gap-2"><input aria-label="練習メニューを追加" value={draftDrill} onChange={e=>setDraftDrill(e.target.value)} maxLength={90} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addDrill();}}} placeholder="例：サーブ 20本" className={`${field} flex-1`}/>
              <button type="button" disabled={!draftDrill.trim() || draft.drills.length>=20} onClick={addDrill} className="min-h-12 shrink-0 rounded-xl border border-[#70d2c6]/40 px-4 text-[13px] font-bold text-[#8de5d9] disabled:opacity-40">＋追加</button></div>
          </section>
          <section className={card}>
            <SectionTitle eyebrow="EFFORT & NOTE" title="今日の感覚" />
            <label className={`${label} mt-6`}>主観的運動強度（RPE） <span className="float-right text-[#f8d18e]">{draft.rpe}/10</span></label>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10" role="group" aria-label="主観的運動強度">
              {Array.from({length:10},(_,i)=>i+1).map(n=><button key={n} aria-pressed={draft.rpe===n} type="button" onClick={()=>setDraft(v=>({...v,rpe:n}))} className={`min-h-11 rounded-xl border text-[13px] font-bold ${draft.rpe===n?'border-[#f4d49a] bg-[#ecc47e] text-[#243039]':'border-white/10 bg-[#0c1c29] text-[#a8bec2]'}`}>{n}</button>)}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-[#91aab0]"><span>かなり楽</span><span>かなりきつい</span></div>
            <label htmlFor="athlete-memo" className={`${label} mt-6`}>メモ・気づき <span className="font-normal text-[#89a7ae]">（任意）</span></label>
            <textarea id="athlete-memo" maxLength={1200} rows={5} value={draft.memo} onChange={e=>setDraft(v=>({...v,memo:e.target.value}))} placeholder="どんな感覚だった？ 上手くいったことは？ 次に試したいことは？" className={`${field} min-h-32 resize-y py-3 leading-7`}/>
            <p className="mt-2 text-right text-[11px] text-[#8ca2aa]">{draft.memo.length}/1200</p>
          </section>
          <button type="button" onClick={saveNote} className={primary}>✎ ノートを保存して振り返る</button>
          {editId && <button type="button" onClick={newNote} className={`${secondary} w-full`}>新しいノートを書く</button>}
          <p className="text-center text-[11px] text-[#7b9da4]">保存した記録は成長画面から編集できます。</p>
        </div>}

        {tab === 'growth' && <div className="space-y-5">
          <div className="rounded-[26px] border border-[#d7b675]/20 bg-[linear-gradient(130deg,#192a39,#0d1b2b)] p-6">
            <p className="text-[10px] font-bold tracking-[.23em] text-[#ecc884]">REFLECTION / GROWTH</p>
            <h1 className="mt-3 font-serif text-[28px] font-semibold text-[#f6ebd7]">昨日の自分が、今日のヒント。</h1>
            <p className="mt-2 text-[12px] leading-6 text-[#abc5c7]">勝敗だけじゃない。気づきの積み重ねが、強さになる。</p>
          </div>
          {selectedLog && <section className={`${card} border-[#cfb477]/30`}>
            <SectionTitle eyebrow="POST PRACTICE" title="今日の振り返り" right={<button className="min-h-11 text-[12px] text-[#a9c2c1]" onClick={()=>setReflectId(null)}>閉じる ×</button>}/>
            <p className="mt-2 text-[12px] text-[#9db3b8]">{formatDate(selectedLog.date)} · {selectedLog.title}</p>
            <label htmlFor="athlete-good" className={`${label} mt-5`}>✦ 良かったこと</label>
            <textarea id="athlete-good" value={reflection.good} onChange={e=>setReflection(v=>({...v,good:e.target.value}))} maxLength={500} rows={3} placeholder="今日できたこと、うまくいった瞬間" className={`${field} min-h-24 py-3`}/>
            <label htmlFor="athlete-improve" className={`${label} mt-5`}>↗ 次に試したいこと</label>
            <textarea id="athlete-improve" value={reflection.improve} onChange={e=>setReflection(v=>({...v,improve:e.target.value}))} maxLength={500} rows={3} placeholder="次回の小さな挑戦は？" className={`${field} min-h-24 py-3`}/>
            <div className="mt-6"><label className={label}>今日の自信度（自己評価）</label><div className="grid grid-cols-5 gap-2" role="group" aria-label="今日の自信度">
              {[1,2,3,4,5].map(n => <button type="button" key={n} aria-pressed={reflection.confidence===n} onClick={()=>setReflection(v=>({...v,confidence:n}))} className={`grid aspect-square min-h-11 min-w-0 place-items-center rounded-full border text-[16px] ${reflection.confidence===n?'border-[#7ae7d9] bg-[#66d9cb] text-[#08202c]':'border-white/15 bg-[#0d1c29] text-[#b2c5c6]'}`}>{n}</button>)}</div></div>
            <button type="button" className={`${primary} mt-6`} onClick={saveReflection}>振り返りを保存する　✓</button>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><button onClick={()=>editNote(selectedLog)} className="min-h-11 text-[12px] font-bold text-[#e6ce9b] underline underline-offset-4">ノートを編集する</button>
              <button onClick={()=>deleteLog(selectedLog.id)} className="min-h-11 text-[12px] text-[#e5aaaa] underline underline-offset-4">{deleteId===selectedLog.id?'削除を確定する':'この記録を削除'}</button></div>
          </section>}
          <div className="grid grid-cols-3 gap-2">
            <Stat title="累計練習" value={logs.length} suffix="回" />
            <Stat title="累計時間" value={logs.reduce((s,l)=>s+l.duration,0)} suffix="分" />
            <Stat title="振り返り" value={logs.filter(l=>l.reflection).length} suffix="回" />
          </div>
          <section className={card}>
            <SectionTitle eyebrow="YOUR PROGRESS" title="成長の足跡" />
            <p className="mt-2 text-[12px] text-[#a3b8b9]">直近7日の主観的運動負荷</p>
            <div className="mt-5"><MiniBars series={week}/></div>
            <p className="mt-4 text-[11px] leading-5 text-[#819ea5]">負荷は練習時間とRPEから算出。能力や健康状態の判定ではありません。</p>
            {logs.some(l=>l.reflection) && <div className="mt-5 border-t border-white/10 pt-4"><p className="text-[12px] font-bold text-[#e5d09d]">最近の自信度</p>
              <div className="mt-3 flex flex-wrap gap-2">{logs.filter(l=>l.reflection).slice(0,8).reverse().map(l=><div key={l.id} className="min-w-0 rounded-xl bg-[#1d3a45] px-3 py-2 text-center"><p className="text-[18px] font-bold text-[#79e2d3]">{l.reflection?.confidence}</p><p className="text-[10px] text-[#9fb5b5]">{formatDate(l.date)}</p></div>)}</div>
            </div>}
          </section>
          <section className="space-y-3">
            <SectionTitle eyebrow="YOUR JOURNAL" title="練習記録" right={<button onClick={newNote} className="min-h-11 px-2 text-[12px] font-bold text-[#f0d293]">＋ 記録する</button>}/>
            {logs.map(l=><div key={l.id} className="space-y-2"><TrainingCard item={l} onOpen={startReflection}/>{l.reflection && <div className="rounded-xl border border-[#b2ccbc]/10 bg-[#10242f] px-4 py-2 text-[12px] text-[#b8d9cf]">✦ {l.reflection.good || '振り返り記録あり'}</div>}</div>)}
            {!logs.length && <div className={`${card} py-8 text-center`}><p className="text-[24px] text-[#f0d08f]">✦</p><p className="mt-2 text-sm">記録すると、ここにあなたの成長が現れます。</p><button onClick={newNote} className="mt-3 min-h-11 text-[13px] font-bold text-[#e6d19a] underline underline-offset-4">最初のノートを書く</button></div>}
          </section>
          {legacy.length > 0 && <section className={card}><SectionTitle eyebrow="ACE FIRST QUEST" title="以前のQuest記録"/>
            <p className="mt-2 text-[11px] leading-5 text-[#8fa8ab]">旧バージョンの体験記録も、そのまま残しています。</p>
            <div className="mt-3 space-y-2">{legacy.slice(0,10).map(l=><div className="rounded-xl border border-white/10 bg-[#0b1d29] p-3" key={l.id}><p className="text-[11px] text-[#91ccc4]">{formatDate(l.finishedAt.slice(0,10))} · {l.questId}</p><p className="mt-1 break-words text-[13px]">{l.feeling} {l.note && `· ${l.note}`}</p></div>)}</div>
          </section>}
        </div>}
      </>}
      <footer className="mt-9 border-t border-white/10 py-5 text-[11px] leading-6 text-[#83a1a9]">
        <p>ACE Athlete v0.2 · 端末内保存版。記録はこのブラウザだけに保存され、ACE本体・Supabaseへの同期やコーチへの共有はまだ行いません。数値は自己観察用です。</p>
      </footer>
    </div>
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#4f777c]/25 bg-[#06131f]/95 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_rgba(0,0,0,.3)] backdrop-blur-xl" aria-label="ACE Athleteメニュー">
      <div className="mx-auto grid max-w-[620px] grid-cols-4 gap-2 px-4">{nav.map(item=><button type="button" key={item.tab} aria-current={tab===item.tab?'page':undefined} onClick={()=>openTab(item.tab)}
        className={`flex min-h-[53px] min-w-0 flex-col items-center justify-center rounded-xl text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#87efdb] ${tab===item.tab?'bg-[#274b4b]/60 text-[#f5d18a]':'text-[#8ea6ad]'}`}>
        <span className="text-[23px] leading-6" aria-hidden>{item.mark}</span><span className="mt-1 text-[10px] font-bold">{item.label}</span>
      </button>)}</div>
    </nav>
  </main>;
}