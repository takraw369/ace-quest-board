'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AceCalibrationSummary from '@/components/calibration/AceCalibrationSummary';
import PwaNav from '@/components/navigation/PwaNav';
import { loadBootstrap, PwaBootstrap } from '@/lib/pwa';

const domainLabel: Record<string, string> = { body: '身体', mind: '心・認知', environment: '環境', action: '行動' };

export default function MeClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  useEffect(() => setData(loadBootstrap()), []);

  if (!data?.ok) {
    return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">SELF</p><h1 className="mt-3 font-serif text-3xl font-semibold">自分の現在地をつなぐ</h1><p className="mt-4 text-sm leading-7 text-[#939a92]">LINEから接続すると、FlowとGrowthがここにまとまります。</p><Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link></div><PwaNav /></main>;
  }

  const progress = data.progress ?? {};
  const scores = data.flow?.scores ?? {};
  const bottleneck = data.flow?.bottleneck ? domainLabel[data.flow.bottleneck] ?? data.flow.bottleneck : '未判定';
  const rank = String(progress.growth_rank ?? 'seed').toUpperCase();

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">SELF / FLOW MAP</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">今の自分。</h1>

        <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-[#6f766f]">Growth Rank</p><p className="mt-2 font-serif text-3xl font-semibold">{rank} Lv.{progress.growth_level ?? 1}</p></div><div className="text-right"><p className="font-serif text-2xl font-semibold text-[#d9c18d]">{progress.xp_total ?? 0} XP</p><p className="mt-1 text-xs text-[#7c837c]">🔥 {progress.streak_current ?? 0}日連続</p></div></div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center"><div><p className="text-[9px] text-[#656c65]">ACTION</p><p className="mt-1 font-semibold">{progress.actions_completed ?? 0}</p></div><div><p className="text-[9px] text-[#656c65]">QUEST</p><p className="mt-1 font-semibold">{progress.quests_completed ?? 0}</p></div><div><p className="text-[9px] text-[#656c65]">LEARN</p><p className="mt-1 font-semibold">{progress.education_completed ?? 0}</p></div></div>
        </section>

        <section className="mt-4 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">FLOW CHECK</p>
          <div className="mt-4 flex items-center justify-between"><div><p className="text-xs text-[#6f766f]">今の調整ポイント</p><p className="mt-1 font-serif text-2xl font-semibold">{bottleneck}</p></div><p className="text-sm text-[#959b95]">{data.flow?.level ?? '未判定'}</p></div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {['body','mind','environment','action'].map((key) => <div key={key} className="rounded-2xl bg-white/[0.025] p-4"><p className="text-[10px] text-[#6f766f]">{domainLabel[key]}</p><p className="mt-1 font-serif text-xl font-semibold">{scores[key] ?? 0}<span className="ml-1 text-xs font-normal text-[#656c65]">/12</span></p></div>)}
          </div>
        </section>

        <AceCalibrationSummary data={data} />

        <section className="mt-4 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">CURRENT CURRICULUM</p>
          <p className="mt-3 font-serif text-lg font-semibold">{data.curriculum?.active_branch ?? '準備中'}</p>
          <p className="mt-2 text-sm leading-7 text-[#959b95]">{data.curriculum?.reason ?? '行動データが増えるほど、今の学び位置を更新します。'}</p>
        </section>
      </div>
      <PwaNav />
    </main>
  );
}
