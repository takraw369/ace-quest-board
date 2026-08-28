'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { growthAction, loadBootstrap, PwaBootstrap, recommendationOf, sessionIsUsable } from '@/lib/pwa';

type Experiment = { intro?: string; prediction?: string; action?: string; actual?: string; reflection?: string };

export default function QuestClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [prediction, setPrediction] = useState('');
  const [actual, setActual] = useState('');
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ xp?: number; total?: number; streak?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setData(loadBootstrap()), []);
  const rec = useMemo(() => recommendationOf(data, 'quest'), [data]);

  if (!data?.ok || !sessionIsUsable(data)) {
    return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">QUEST</p><h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続してQuestを始める</h1><p className="mt-4 text-sm leading-7 text-[#939a92]">本人データと接続すると、今の状態に合う実験が出ます。</p><Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link></div><PwaNav /></main>;
  }
  if (!rec) return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><h1 className="font-serif text-3xl font-semibold">Questを準備中</h1><p className="mt-4 text-sm text-[#939a92]">LINEからもう一度FLOW OSを開くと最新のQuestを取得します。</p></div><PwaNav /></main>;

  const alt = (rec.alternative ?? {}) as Record<string, unknown>;
  const duration = typeof alt.duration === 'string' ? alt.duration : '3分Quest';
  const experiment = ((alt.experiment ?? {}) as Experiment);
  const action = experiment.action ?? (typeof alt.action === 'string' ? alt.action : '小さな実験を1つやる');
  const title = (rec.metadata?.node_title as string | undefined) ?? duration;

  const complete = async () => {
    setBusy(true); setError(null);
    try {
      const out = await growthAction(data, 'quest_complete', rec.id, { prediction, actual, reflection });
      setResult({ xp: out?.xp?.xp_amount ?? 0, total: out?.progress?.xp_total ?? data.progress?.xp_total ?? 0, streak: out?.progress?.streak_current ?? data.progress?.streak_current ?? 0 });
      setData(loadBootstrap());
    } catch (e) { setError(e instanceof Error ? e.message : 'complete_failed'); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">QUEST / PREDICT → DO → SEE</p>
        <div className="mt-2 flex items-end justify-between gap-4"><h1 className="font-serif text-3xl font-semibold">{title}</h1><span className="shrink-0 rounded-full border border-[#c8ab72]/20 px-3 py-1.5 text-[10px] text-[#d6c293]">{duration}</span></div>
        <p className="mt-4 text-sm leading-7 text-[#9da29b]">{rec.reason}</p>

        {result ? (
          <section className="mt-7 rounded-[28px] border border-[#789581]/25 bg-[#789581]/10 p-6"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c0af]">Quest Complete</p><p className="mt-3 font-serif text-3xl font-semibold">+{result.xp ?? 0} XP</p><p className="mt-2 text-sm text-[#aeb5ad]">累計 {result.total ?? 0} XP｜🔥 {result.streak ?? 0}日連続</p><p className="mt-3 text-sm leading-7 text-[#929992]">予想・実測・振り返りをHuman Graphへ記録した。次の推薦はこの結果を使って変わる。</p><Link href="/today" className="mt-5 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">今日へ戻る</Link></section>
        ) : (
          <div className="mt-7 space-y-4">
            {experiment.intro && <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">SETUP</p><p className="mt-3 text-sm leading-7 text-[#aeb2ac]">{experiment.intro}</p></section>}
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">01 PREDICT</label><p className="mt-2 text-sm leading-7 text-[#9da29b]">{experiment.prediction ?? 'やる前に、どうなりそうか予想する。'}</p><textarea value={prediction} onChange={(e) => setPrediction(e.target.value)} rows={2} placeholder="例：1分いけそう" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" /></section>
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">02 DO</p><p className="mt-4 font-serif text-xl leading-9 text-[#eee8dc]">{action}</p></section>
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">03 ACTUAL</label><p className="mt-2 text-sm leading-7 text-[#9da29b]">{experiment.actual ?? '実際の結果をそのまま記録する。'}</p><textarea value={actual} onChange={(e) => setActual(e.target.value)} rows={2} placeholder="例：18秒" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" /></section>
            <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">04 REFLECT</label><p className="mt-2 text-sm leading-7 text-[#9da29b]">{experiment.reflection ?? '予想と実際の差から何が見えた？'}</p><textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="例：疲労が強いかも" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" /></section>
            <button type="button" disabled={busy || (!actual && !reflection)} onClick={() => void complete()} className="w-full rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-semibold text-[#171813] disabled:opacity-40">Quest完了・記録する</button>
          </div>
        )}
        {error && <p className="mt-4 text-xs text-[#c98f83]">{error === 'session_expired' ? '接続期限が切れました。LINEからもう一度開いてください。' : `error: ${error}`}</p>}
      </div>
      <PwaNav />
    </main>
  );
}
