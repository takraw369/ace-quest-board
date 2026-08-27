'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { growthAction, loadBootstrap, PwaBootstrap, recommendationOf, sessionIsUsable } from '@/lib/pwa';

export default function QuestClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ xp?: number; total?: number; streak?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setData(loadBootstrap()), []);
  const rec = useMemo(() => recommendationOf(data, 'quest'), [data]);

  if (!data?.ok || !sessionIsUsable(data)) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]">
        <div className="mx-auto max-w-md"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">QUEST</p><h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続してQuestを始める</h1><p className="mt-4 text-sm leading-7 text-[#939a92]">本人データと接続すると、今の実行履歴に合うサイズのQuestが出ます。</p><Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link></div><PwaNav />
      </main>
    );
  }

  if (!rec) {
    return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><h1 className="font-serif text-3xl font-semibold">Questを準備中</h1><p className="mt-4 text-sm text-[#939a92]">LINEからもう一度FLOW OSを開くと最新のQuestを取得します。</p></div><PwaNav /></main>;
  }

  const alt = (rec.alternative ?? {}) as Record<string, unknown>;
  const duration = typeof alt.duration === 'string' ? alt.duration : '3分Quest';
  const action = typeof alt.action === 'string' ? alt.action : '小さな実験を1つやる';

  const complete = async () => {
    setBusy(true); setError(null);
    try {
      const out = await growthAction(data, 'quest_complete', rec.id, { reflection });
      setResult({ xp: out?.xp?.xp_amount ?? 0, total: out?.progress?.xp_total ?? data.progress?.xp_total ?? 0, streak: out?.progress?.streak_current ?? data.progress?.streak_current ?? 0 });
      setData(loadBootstrap());
    } catch (e) { setError(e instanceof Error ? e.message : 'complete_failed'); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">QUEST / DO</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">{duration}</h1>
        <p className="mt-4 text-sm leading-7 text-[#9da29b]">{rec.reason}</p>

        {result ? (
          <section className="mt-7 rounded-[28px] border border-[#789581]/25 bg-[#789581]/10 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c0af]">Quest Complete</p>
            <p className="mt-3 font-serif text-3xl font-semibold">+{result.xp ?? 0} XP</p>
            <p className="mt-2 text-sm text-[#aeb5ad]">累計 {result.total ?? 0} XP｜🔥 {result.streak ?? 0}日連続</p>
            <Link href="/today" className="mt-5 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">今日へ戻る</Link>
          </section>
        ) : (
          <>
            <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">TODAY'S MOVE</p>
              <p className="mt-4 font-serif text-xl leading-9 text-[#eee8dc]">{action}</p>
              <p className="mt-4 text-sm leading-7 text-[#929992]">完璧にやるより、1回やって反応を取る。終わったら下で記録する。</p>
            </section>
            <section className="mt-4 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">AFTER</label>
              <p className="mt-2 text-sm leading-7 text-[#9da29b]">やってみて何が変わった？ 一言でOK。</p>
              <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="例：思ったよりすぐ始められた" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" />
              <button type="button" disabled={busy} onClick={() => void complete()} className="mt-4 w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813] disabled:opacity-40">Quest完了</button>
            </section>
          </>
        )}
        {error && <p className="mt-4 text-xs text-[#c98f83]">{error === 'session_expired' ? '接続期限が切れました。LINEからもう一度開いてください。' : `error: ${error}`}</p>}
      </div>
      <PwaNav />
    </main>
  );
}
