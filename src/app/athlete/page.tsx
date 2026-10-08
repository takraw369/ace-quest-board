'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Focus = 'scatter' | 'steady' | 'sharp';
type QuestId = 'reset' | 'one' | 'sense';
type Stage = 'check' | 'choose' | 'play' | 'reflect' | 'done';
type Feeling = 'できた' | '発見した' | '次に試したい';
type AthleteSession = {
  id: string;
  userId: null;
  startedAt: string;
  finishedAt: string;
  energy: number;
  focus: Focus;
  questId: QuestId;
  feeling: Feeling;
  note: string;
};
const STORAGE_KEY = 'ace_athlete_sessions_v1';
const ENERGY_LABELS = ['かなり重い', '少し重い', 'ふつう', '軽い', 'とても軽い'];
const FOCUS_OPTIONS: { id: Focus; icon: string; label: string }[] = [
  { id: 'scatter', icon: '〰', label: '散らばってる' },
  { id: 'steady', icon: '◉', label: '落ち着いてる' },
  { id: 'sharp', icon: '✦', label: '研ぎ澄んでる' },
];
const QUESTS: { id: QuestId; mark: string; name: string; tagline: string; cue: string; color: string; reflection: string }[] = [
  { id: 'reset', mark: '◌', name: 'RESET', tagline: '整えて、はじめる', cue: '一呼吸して、足裏と姿勢に意識を向ける。変化があるか観察しよう。', color: '#9bc6bf', reflection: '動き出す前と後で、身体の感じ方は変わった？' },
  { id: 'one', mark: '◎', name: 'ONE THING', tagline: '今日の一点を決める', cue: '今回の練習で観察したいことを、ひとつだけ選んで取り組む。', color: '#efd29d', reflection: '絞った一点について、何に気づいた？' },
  { id: 'sense', mark: '✧', name: 'SENSE', tagline: '自分の感覚を発見する', cue: 'うまくいった動きの直前、自分が何を感じたかを観察する。', color: '#b8adea', reflection: '再現したい感覚は見つかった？' },
];
const pill = 'min-h-11 rounded-2xl border px-4 py-3 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6d09e]';
const surface = 'rounded-[28px] border border-white/10 bg-white/[0.045] shadow-[0_16px_75px_rgba(0,0,0,.22)] backdrop-blur-lg';

function safeRead(): AthleteSession[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is AthleteSession =>
      entry !== null && typeof entry === 'object' &&
      typeof entry.id === 'string' && typeof entry.finishedAt === 'string' &&
      typeof entry.questId === 'string' && typeof entry.feeling === 'string'
    ).slice(0, 40);
  } catch {
    return [];
  }
}
const japaneseDate = (raw: string) => {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '日付不明' : new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(date);
};

export default function AceAthletePage() {
  const [stage, setStage] = useState<Stage>('check');
  const [energy, setEnergy] = useState<number | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [selected, setSelected] = useState<QuestId | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [feeling, setFeeling] = useState<Feeling | null>(null);
  const [note, setNote] = useState('');
  const [sessions, setSessions] = useState<AthleteSession[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => { setSessions(safeRead()); setLoaded(true); }, []);
  const current = QUESTS.find((q) => q.id === selected);
  const recommended: QuestId = energy !== null && energy <= 2 ? 'reset' : focus === 'scatter' ? 'one' : 'sense';
  const orderedQuests = useMemo(() => [...QUESTS].sort((a, b) => (a.id === recommended ? -1 : b.id === recommended ? 1 : 0)), [recommended]);
  const reset = () => {
    setStage('check'); setEnergy(null); setFocus(null); setSelected(null); setStartedAt(null);
    setFeeling(null); setNote(''); setSaveError('');
  };
  const save = () => {
    if (energy === null || focus === null || selected === null || feeling === null) return;
    const now = new Date().toISOString();
    const entry: AthleteSession = {
      id: globalThis.crypto?.randomUUID?.() || `athlete-${Date.now()}`,
      userId: null,
      startedAt: startedAt || now, finishedAt: now, energy, focus,
      questId: selected, feeling, note: note.trim().slice(0, 240),
    };
    const next = [entry, ...sessions].slice(0, 40);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSessions(next); setSaveError(''); setStage('done');
    } catch {
      setSaveError('端末内に保存できませんでした。空き容量・ブラウザの設定をご確認ください。');
    }
  };
  const clear = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSessions([]); setConfirmClear(false); setSaveError('');
    } catch {
      setSaveError('記録を削除できませんでした。ブラウザの設定をご確認ください。');
    }
  };
  const stageIndex = ['check', 'choose', 'play', 'reflect', 'done'].indexOf(stage);

  return (
    <main className="relative min-h-[100dvh] min-w-0 overflow-x-hidden bg-[#070e16] px-4 pb-[calc(64px+env(safe-area-inset-bottom))] pt-6 text-[#eef4f3] selection:bg-[#69b6b3]/30 sm:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[440px] w-[440px] rounded-full bg-[#3d9c93]/[0.12] blur-[105px]" />
        <div className="absolute -right-48 top-[330px] h-[440px] w-[440px] rounded-full bg-[#d6a65d]/[0.09] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(circle at center, #d5e5e0 1px, transparent 1px)', backgroundSize: '27px 27px' }} />
      </div>
      <div className="relative mx-auto w-full min-w-0 max-w-[560px]">
        <header className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold tracking-[0.23em] text-[#8ccbc4]">ACE / ATHLETE BIOTOPE</div>
            <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-tight">自分の可能性を、プレイする。</h1>
          </div>
          <Link href="/quest-router" className="flex min-h-11 shrink-0 items-center rounded-full border border-white/15 px-3 text-[12px] text-[#cbd7d3] focus-visible:outline focus-visible:outline-2" aria-label="ACEのQuest Routerに戻る">ACEへ ↗</Link>
        </header>

        <section className="relative mt-7 overflow-hidden rounded-[32px] border border-[#72bdb3]/20 bg-gradient-to-br from-[#182d36] via-[#10202b] to-[#101722] px-5 pb-7 pt-6 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:px-7">
          <div className="absolute -right-12 -top-14 h-[200px] w-[200px] rounded-full border border-[#9cd9cc]/20" aria-hidden />
          <div className="absolute -right-2 -top-5 h-[160px] w-[160px] rounded-full border border-[#9cd9cc]/15" aria-hidden />
          <div className="relative flex items-start justify-between gap-2">
            <span className="rounded-full border border-[#bce4dc]/20 bg-[#adede1]/10 px-3 py-1.5 text-[10px] font-bold tracking-[.15em] text-[#afe1d7]">FIRST QUEST / v0.1</span>
            <span className="text-[11px] tabular-nums text-[#baccc8]">{loaded ? sessions.length : '—'} RECORDS</span>
          </div>
          <div className="relative my-6 grid place-items-center">
            <div className="grid h-[190px] w-[190px] place-items-center rounded-full border border-[#a9dbd3]/20 bg-[radial-gradient(circle,_rgba(125,208,194,0.16),_rgba(5,13,23,0)_68%)] shadow-[0_0_95px_rgba(88,167,155,.13)] sm:h-[215px] sm:w-[215px]">
              <div className="grid h-[154px] w-[154px] place-items-center rounded-full border border-dashed border-[#accfca]/25 sm:h-[178px] sm:w-[178px]">
                <div className="text-center">
                  <p className="font-serif text-[58px] font-light leading-none text-[#e2d2ad]" aria-hidden>{stage === 'done' ? '✦' : stage === 'play' ? '◎' : '◌'}</p>
                  <p className="mt-3 text-[10px] font-bold tracking-[.25em] text-[#acccc5]">{stage === 'done' ? 'EVIDENCE' : stage === 'play' ? 'IN MOTION' : 'YOUR FLOW'}</p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center font-serif text-[22px] font-semibold leading-relaxed">
            {stage === 'check' ? 'まず、今の自分を感じる。' : stage === 'choose' ? '今日は何を、試してみる？' : stage === 'play' ? '答えは、身体の中に。' : stage === 'reflect' ? '小さな気づきを、残そう。' : '今日の経験が、次の力になる。'}
          </p>
          <p className="mt-2 text-center text-[12px] leading-6 text-[#a7bcb8]">
            {stage === 'check' ? '2つのタップで、練習の入口へ。' : stage === 'choose' ? 'おすすめも、正解ではない。自分で選ぼう。' : stage === 'play' ? '練習中にアプリを見続けなくて大丈夫。' : stage === 'reflect' ? '長い文章はいらない。ひとつで十分。' : '評価ではなく、体験の足跡として保存。'}
          </p>
        </section>

        <div className="mt-5 flex gap-2" aria-label="体験の進行状況">
          {['CHECK', 'CHOOSE', 'PLAY', 'REFLECT', 'EVOLVE'].map((step, i) => (
            <div key={step} className="min-w-0 flex-1">
              <div className={`h-[3px] rounded-full transition-colors ${i <= stageIndex ? 'bg-[#a9d9ca]' : 'bg-white/10'}`} />
              <span className={`mt-2 block truncate text-[8px] font-bold tracking-[.05em] ${i === stageIndex ? 'text-[#d7e9e3]' : 'text-[#647c80]'}`}>{step}</span>
            </div>
          ))}
        </div>

        <div aria-live="polite" className="mt-7 min-w-0">
          {stage === 'check' && (
            <section className={`${surface} p-5 sm:p-7`}>
              <p className="text-[10px] font-bold tracking-[.21em] text-[#83b7b1]">01 / QUICK CHECK</p>
              <h2 className="mt-2 font-serif text-[25px] font-semibold">身体のエネルギーは？</h2>
              <div className="mt-5 grid grid-cols-5 gap-2" role="group" aria-label="エネルギーの自己申告">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" aria-pressed={energy === value}
                    onClick={() => setEnergy(value)}
                    className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border text-base font-bold transition-all focus-visible:outline focus-visible:outline-2 ${energy === value ? 'border-[#c5e7d8] bg-[#91cbb7]/20 text-white shadow-[0_0_32px_rgba(138,221,196,.12)]' : 'border-white/10 bg-white/[.035] text-[#9aaead]'}`}>
                    <span>{['◔', '◑', '◉', '◕', '●'][value - 1]}</span><span className="text-[11px]">{value}</span>
                  </button>
                ))}
              </div>
              <p className="mt-2 min-h-5 text-center text-[12px] text-[#b2c9c2]">{energy === null ? '数字は体感の目安。優劣ではありません。' : ENERGY_LABELS[energy - 1]}</p>
              <h2 className="mt-7 font-serif text-[25px] font-semibold">意識の状態は？</h2>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {FOCUS_OPTIONS.map((item) => (
                  <button key={item.id} aria-pressed={focus === item.id} type="button" onClick={() => setFocus(item.id)}
                    className={`min-h-[82px] min-w-0 rounded-2xl border px-1 py-3 transition-colors focus-visible:outline focus-visible:outline-2 ${focus === item.id ? 'border-[#c5e7d8] bg-[#91cbb7]/20' : 'border-white/10 bg-white/[.035]'}`}>
                    <span className="block text-[23px] text-[#e9d7ae]" aria-hidden>{item.icon}</span><span className="mt-1 block break-words text-[11px] font-semibold leading-4">{item.label}</span>
                  </button>
                ))}
              </div>
              <button type="button" disabled={energy === null || focus === null} onClick={() => setStage('choose')}
                className="mt-7 min-h-14 w-full rounded-2xl bg-[#c7e6d9] px-4 text-[15px] font-bold text-[#102626] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-35">
                今日のQuestを選ぶ　→
              </button>
            </section>
          )}

          {stage === 'choose' && (
            <section className="space-y-3">
              <div className="flex items-end justify-between px-1">
                <div><p className="text-[10px] font-bold tracking-[.2em] text-[#83b7b1]">02 / CHOOSE</p><h2 className="mt-2 font-serif text-[24px] font-semibold">3つの冒険</h2></div>
                <button type="button" onClick={() => setStage('check')} className="min-h-11 px-3 text-[12px] text-[#a9c2bb] underline underline-offset-4">戻る</button>
              </div>
              {orderedQuests.map((quest) => {
                const active = selected === quest.id;
                return (
                  <button key={quest.id} type="button" aria-pressed={active} onClick={() => setSelected(quest.id)}
                    className={`relative flex min-h-[115px] w-full min-w-0 items-center gap-4 rounded-[24px] border p-4 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#bfe2d2] ${active ? 'border-[#bde5d8] bg-[#173c42]' : 'border-white/10 bg-[#111e29]'}`}>
                    <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[.05] font-serif text-[37px]" style={{ color: quest.color }}>{quest.mark}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-[12px] font-bold tracking-wider" style={{ color: quest.color }}>{quest.name} {quest.id === recommended && <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] tracking-normal text-[#c4d5d0]">今の状態から提案</span>}</span>
                      <span className="mt-1 block font-serif text-[18px] font-semibold">{quest.tagline}</span>
                      <span className="mt-1 block text-[12px] leading-5 text-[#9eb5b4]">{quest.cue}</span>
                    </span>
                    <span className="shrink-0 text-xl text-[#9fbfba]">{active ? '●' : '○'}</span>
                  </button>
                );
              })}
              <button type="button" disabled={!selected} onClick={() => { setStartedAt(new Date().toISOString()); setStage('play'); }}
                className="mt-3 min-h-14 w-full rounded-2xl bg-[#d9be86] px-4 text-[15px] font-bold text-[#1c201c] disabled:opacity-35">このQuestで始める　→</button>
            </section>
          )}

          {stage === 'play' && current && (
            <section className={`${surface} p-6 text-center sm:p-8`}>
              <p className="text-[10px] font-bold tracking-[.2em] text-[#8fc8bc]">03 / PLAY IN REAL LIFE</p>
              <p className="mx-auto mt-7 grid h-28 w-28 place-items-center rounded-full border border-[#d6cc9a]/30 bg-[#a5bdaf]/10 font-serif text-[64px] text-[#e5d09d]">{current.mark}</p>
              <h2 className="mt-7 font-serif text-[27px] font-semibold">{current.tagline}</h2>
              <p className="mt-4 text-[15px] leading-8 text-[#d2deda]">{current.cue}</p>
              <p className="mt-5 text-[12px] leading-6 text-[#819c9b]">アプリを閉じても大丈夫。終わったら戻って、体験をひとつ記録しよう。</p>
              <button type="button" onClick={() => setStage('reflect')} className="mt-7 min-h-14 w-full rounded-2xl bg-[#c7e6d9] text-[15px] font-bold text-[#102626]">練習が終わった　→</button>
              <button type="button" onClick={() => setStage('choose')} className="mt-2 min-h-11 w-full text-[12px] text-[#a1b8b5]">Questを選び直す</button>
            </section>
          )}

          {stage === 'reflect' && current && (
            <section className={`${surface} p-5 sm:p-7`}>
              <p className="text-[10px] font-bold tracking-[.2em] text-[#83b7b1]">04 / REFLECTION</p>
              <h2 className="mt-2 font-serif text-[25px] font-semibold">今日、何が残った？</h2>
              <p className="mt-3 text-[13px] leading-6 text-[#a9bfba]">{current.reflection}</p>
              <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="今日の気づき">
                {(['できた', '発見した', '次に試したい'] as Feeling[]).map((item, index) => (
                  <button type="button" key={item} aria-pressed={feeling === item} onClick={() => setFeeling(item)}
                    className={`min-h-24 rounded-2xl border px-1 py-3 text-center focus-visible:outline focus-visible:outline-2 ${feeling === item ? 'border-[#bde5d8] bg-[#91cbb7]/20' : 'border-white/10 bg-white/[.035]'}`}>
                    <span aria-hidden className="block font-serif text-[28px] text-[#e4d1a0]">{['✦', '◈', '↗'][index]}</span>
                    <span className="mt-2 block text-[11px] font-semibold">{item}</span>
                  </button>
                ))}
              </div>
              <label htmlFor="athlete-one-line" className="mt-6 block text-[12px] font-semibold text-[#c4d7d1]">一言メモ <span className="font-normal text-[#809b97]">（任意・240文字まで）</span></label>
              <textarea id="athlete-one-line" value={note} maxLength={240} onChange={(event) => setNote(event.target.value)} rows={2}
                placeholder="例：肩の力が抜けた時、動きが軽くなった"
                className="mt-2 min-h-24 w-full min-w-0 resize-y rounded-2xl border border-white/15 bg-[#0a1922] p-4 text-[16px] leading-6 text-white outline-none placeholder:text-[#70898c] focus:border-[#acd9cd]" />
              <p className="mt-2 text-[11px] text-[#839d98]">※ここは本人の記録。端末内にだけ保存します。</p>
              {saveError && <p role="alert" className="mt-3 text-[12px] text-[#f1b5aa]">{saveError}</p>}
              <button type="button" disabled={!feeling} onClick={save} className="mt-6 min-h-14 w-full rounded-2xl bg-[#d9be86] px-4 text-[15px] font-bold text-[#1c201c] disabled:opacity-35">体験を記録する　✦</button>
              <button type="button" onClick={() => setStage('play')} className="mt-2 min-h-11 w-full text-[12px] text-[#a1b8b5]">戻る</button>
            </section>
          )}

          {stage === 'done' && current && (
            <section className={`${surface} p-6 sm:p-8`}>
              <p className="text-[10px] font-bold tracking-[.2em] text-[#e6d49e]">05 / YOUR EVIDENCE</p>
              <h2 className="mt-3 font-serif text-[27px] font-semibold">今日の成長は、ここに。</h2>
              <div className="mt-5 rounded-[22px] border border-[#d4ca9a]/20 bg-[#19282c] p-5">
                <p className="text-[12px] tracking-wider text-[#d8cca3]">{current.name}</p>
                <p className="mt-3 font-serif text-[23px] font-semibold">{feeling}</p>
                <p className="mt-3 break-words text-[14px] leading-7 text-[#b8d2c9]">{note.trim() || '言葉にならない体験も、大事な一歩。'}</p>
              </div>
              <p className="mt-4 text-[12px] leading-6 text-[#8eaaa4]">小さな事実を集めて、自分の勝ち筋を発見していこう。</p>
              <button type="button" onClick={reset} className="mt-6 min-h-14 w-full rounded-2xl bg-[#c7e6d9] text-[15px] font-bold text-[#102626]">次のQuestへ　→</button>
              <Link href="/my-ace" className="mt-3 flex min-h-11 items-center justify-center text-[12px] text-[#bbd2ca] underline underline-offset-4">My ACEへ戻る（同期は未対応）</Link>
            </section>
          )}
        </div>

        <section className="mt-9 min-w-0" aria-label="過去の体験記録">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-[10px] font-bold tracking-[.2em] text-[#8abbb3]">MY TRACE</p><h2 className="mt-1 font-serif text-[21px] font-semibold">積み重ねた体験</h2></div>
            <span className="rounded-full border border-white/10 px-3 py-2 text-[11px] text-[#a8c5ba]">{loaded ? sessions.length : '—'} 回</span>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2" aria-label="直近7回の体験">
            {Array.from({ length: 7 }, (_, i) => <div key={i} className={`grid h-9 min-w-0 place-items-center rounded-xl border text-[11px] ${sessions[i] ? 'border-[#a7d8bc]/30 bg-[#79b7a5]/20 text-[#cdeedb]' : 'border-white/10 bg-white/[.025] text-[#506773]'}`}>{sessions[i] ? '✦' : '·'}</div>)}
          </div>
          <div className="mt-4 space-y-2">
            {sessions.slice(0, 5).map((item) => {
              const q = QUESTS.find((value) => value.id === item.questId);
              return <div key={item.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3">
                <span className="text-[23px] text-[#d6cda6]" aria-hidden>{q?.mark || '✦'}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{q?.tagline || '過去のQuest'}</p><p className="truncate text-[11px] text-[#9aaeb0]">{item.feeling}{item.note ? ` · ${item.note}` : ''}</p></div>
                <span className="shrink-0 text-[11px] text-[#90a7a1]">{japaneseDate(item.finishedAt)}</span>
              </div>;
            })}
            {loaded && sessions.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-[13px] text-[#95aba5]">まだ記録はありません。最初のQuestからはじめよう。</p>}
          </div>
        </section>
        <footer className="mt-8 border-t border-white/10 pt-5 text-[11px] leading-6 text-[#88a29e]">
          <p>Prototype v0.1：記録はこのブラウザの端末内にのみ保存。ACE本体・Supabaseとはまだ同期されません。身体・集中の選択は自己観察用で、診断・能力判定ではありません。</p>
          {sessions.length > 0 && <button type="button" onClick={clear} className="mt-3 min-h-11 rounded-xl border border-white/15 px-4 text-[12px] text-[#c0cdca]">{confirmClear ? '本当に削除する（全件）' : '端末内の記録を削除'}</button>}
          {saveError && stage !== 'reflect' && <p role="alert" className="mt-2 text-[#efb8aa]">{saveError}</p>}
        </footer>
      </div>
    </main>
  );
}