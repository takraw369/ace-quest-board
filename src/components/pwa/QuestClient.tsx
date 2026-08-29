'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { DailyQuestState, growthAction, loadBootstrap, PwaBootstrap, recommendationOf, sessionIsUsable } from '@/lib/pwa';

type Experiment = { intro?: string; prediction?: string; action?: string; actual?: string; reflection?: string };
type CompletionResult = {
  xp?: number;
  total?: number;
  streak?: number;
  dailyQuest?: DailyQuestState | null;
};

function unlockLabel(value?: string | null) {
  if (!value) return '明朝5:00';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function DailyComplete({ data }: { data: PwaBootstrap }) {
  const unlock = unlockLabel(data.daily_quest?.next_unlock_at);
  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">QUEST / FLOW DAY COMPLETE</p>
        <section className="mt-5 rounded-[28px] border border-[#789581]/25 bg-[#789581]/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c0af]">TODAY COMPLETE</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">今日のQuestは完了</h1>
          <p className="mt-4 text-sm leading-7 text-[#aeb5ad]">今日はここで区切り。実行と振り返りはHuman Graphへ保存されています。</p>
          <div className="mt-5 rounded-[22px] border border-[#d9c18d]/20 bg-black/15 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">NEXT FLOW DAY</p>
            <p className="mt-2 font-serif text-xl font-semibold">次のQuestは {unlock} に更新</p>
            <p className="mt-2 text-xs leading-6 text-[#8fa795]">FLOW Dayは毎朝5:00に切り替わります。Questを連続消化するより、1日を使って変化を観察します。</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/today" className="inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">Todayへ</Link>
            <Link href="/learn" className="inline-flex rounded-full border border-[#d9c18d]/30 px-5 py-3 text-sm font-semibold text-[#d9c18d]">Learnを見る</Link>
          </div>
        </section>
      </div>
      <PwaNav />
    </main>
  );
}

export default function QuestClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [prediction, setPrediction] = useState('');
  const [actual, setActual] = useState('');
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setData(loadBootstrap()), []);
  const rec = useMemo(() => recommendationOf(data, 'quest'), [data]);

  if (!data?.ok || !sessionIsUsable(data)) {
    return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">QUEST</p><h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続してQuestを始める</h1><p className="mt-4 text-sm leading-7 text-[#939a92]">本人データと接続すると、今の状態に合う実験が出ます。</p><Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link></div><PwaNav /></main>;
  }

  if (!result && data.daily_quest?.status === 'completed') return <DailyComplete data={data} />;
  if (!result && !rec) return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><h1 className="font-serif text-3xl font-semibold">Questを準備中</h1><p className="mt-4 text-sm text-[#939a92]">LINEからもう一度FLOW OSを開くと最新のQuestを取得します。</p></div><PwaNav /></main>;

  const alt = (rec?.alternative ?? {}) as Record<string, unknown>;
  const duration = typeof alt.duration === 'string' ? alt.duration : '3分Quest';
  const experiment = ((alt.experiment ?? {}) as Experiment);
  const action = experiment.action ?? (typeof alt.action === 'string' ? alt.action : '小さな実験を1つやる');
  const title = (rec?.metadata?.node_title as string | undefined) ?? duration;

  const complete = async () => {
    if (!rec) return;
    setBusy(true); setError(null);
    try {
      const out = await growthAction(data, 'quest_complete', rec.id, { prediction, actual, reflection });
      const latest = loadBootstrap();
      if (latest) setData(latest);
      setResult({
        xp: out?.xp?.xp_amount ?? 0,
        total: out?.progress?.xp_total ?? data.progress?.xp_total ?? 0,
        streak: out?.progress?.streak_current ?? data.progress?.streak_current ?? 0,
        dailyQuest: out?.daily_quest ?? latest?.daily_quest ?? null,
      });
    } catch (e) { setError(e instanceof Error ? e.message : 'complete_failed'); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">QUEST / PREDICT → DO → SEE</p>
        <div className="mt-2 flex items-end justify-between gap-4"><h1 className="font-serif text-3xl font-semibold">{title}</h1><span className="shrink-0 rounded-full border border-[#c8ab72]/20 px-3 py-1.5 text-[10px] text-[#d6c293]">{duration}</span></div>
        <p className="mt-4 text-sm leading-7 text-[#9da29b]">{rec?.reason}</p>

        {result ? (
          <section className="mt-7 rounded-[28px] border border-[#789581]/25 bg-[#789581]/10 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c0af]">Quest Complete</p>
            <p className="mt-3 font-serif text-3xl font-semibold">+{result.xp ?? 0} XP</p>
            <p className="mt-2 text-sm text-[#aeb5ad]">累計 {result.total ?? 0} XP｜🔥 {result.streak ?? 0}日連続</p>
            <p className="mt-3 text-sm leading-7 text-[#929992]">予想・実測・振り返りをHuman Graphへ記録しました。今日のQuestはここで終了です。</p>
            <div className="mt-5 rounded-[22px] border border-[#d9c18d]/20 bg-black/15 p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">NEXT FLOW DAY</p>
              <p className="mt-2 font-serif text-xl font-semibold">次のQuestは {unlockLabel(result.dailyQuest?.next_unlock_at)} に更新</p>
              <p className="mt-2 text-xs leading-6 text-[#8fa795]">今日は実行結果を寝かせて、日常の中で変化を観察する時間にします。</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/today" className="inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">Todayへ</Link>
              <Link href="/learn" className="inline-flex rounded-full border border-[#d9c18d]/30 px-5 py-3 text-sm font-semibold text-[#d9c18d]">Learnを見る</Link>
            </div>
          </section>
        ) : (
          <div className="mt-7 space-y-4">
            {experiment.intro && <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">SETUP</p><p className="mt-3 text-sm leading-7 text-[#aeb2ac]">{experiment.intro}</p></section>}
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">01 PREDICT</label><p className="mt-2 text-sm leading-7 text-[#9da29b]">{experiment.prediction ?? 'やる前に、どうなりそうか予想する。'}</p><textarea value={prediction} onChange={(e) => setPrediction(e.target.value)} rows={2} placeholder="予想を書く" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" /></section>
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">02 DO</p><p className="mt-4 font-serif text-xl leading-9 text-[#eee8dc]">{action}</p></section>
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">03 ACTUAL</label><p className="mt-2 text-sm leading-7 text-[#9da29b]">{experiment.actual ?? '実際の結果をそのまま記録する。'}</p><textarea value={actual} onChange={(e) => setActual(e.target.value)} rows={2} placeholder="実際の結果を書く" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" /></section>
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">04 REFLECT</label><p className="mt-2 text-sm leading-7 text-[#9da29b]">{experiment.reflection ?? '予想と実際の差から何が見えた？'}</p><textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="気づきを書く" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" /></section>
            <button type="button" disabled={busy || (!actual && !reflection)} onClick={() => void complete()} className="w-full rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-semibold text-[#171813] disabled:opacity-40">Quest完了・記録する</button>
          </div>
        )}
        {error && <p className="mt-4 text-xs text-[#c98f83]">{error === 'session_expired' ? '接続期限が切れました。LINEからもう一度開いてください。' : `error: ${error}`}</p>}
      </div>
      <PwaNav />
    </main>
  );
}
