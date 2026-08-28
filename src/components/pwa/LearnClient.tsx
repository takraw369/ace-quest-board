'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { loadBootstrap, PwaBootstrap, recommendationOf, sessionIsUsable } from '@/lib/pwa';

export default function LearnClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  useEffect(() => setData(loadBootstrap()), []);
  const rec = useMemo(() => recommendationOf(data, 'education'), [data]);

  if (!data?.ok || !sessionIsUsable(data)) {
    return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">LEARN</p><h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続して学びを始める</h1><p className="mt-4 text-sm leading-7 text-[#939a92]">本人データと接続すると、今の状態に合わせたEducationが出ます。</p><Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link></div><PwaNav /></main>;
  }
  if (!rec) return <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]"><div className="mx-auto max-w-md"><h1 className="font-serif text-3xl font-semibold">おすすめを準備中</h1><p className="mt-4 text-sm text-[#939a92]">LINEからもう一度FLOW OSを開くと、最新の推薦を取得します。</p></div><PwaNav /></main>;

  const alt = (rec.alternative ?? {}) as Record<string, unknown>;
  const question = typeof alt.question_text === 'string' ? alt.question_text : null;
  const focus = typeof alt.focus === 'string' ? alt.focus : null;
  const nodeTitle = (rec.metadata?.node_title as string | undefined) ?? rec.recommendation_ref ?? '今のEducation';

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">LEARN / SEE THE POINT</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">{nodeTitle}</h1>
        <p className="mt-4 text-sm leading-7 text-[#9da29b]">{rec.reason}</p>

        <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">WHAT TO NOTICE</p>
          <p className="mt-4 font-serif text-xl leading-9 text-[#eee8dc]">{focus ?? '結果そのものより、予想と実際の差を見る。'}</p>
          <p className="mt-4 text-sm leading-7 text-[#929992]">ここでは答えを覚えない。次のQuestで、自分の反応を実際に取りにいく。</p>
        </section>

        {question && <section className="mt-4 rounded-[28px] border border-[#789581]/20 bg-[#789581]/[0.06] p-6"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9ab0a0]">QUESTION</p><p className="mt-3 font-serif text-xl leading-9 text-[#e6e2d9]">{question}</p></section>}

        <Link href="/quest" className="mt-6 flex w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-semibold text-[#171813]">Questで確かめる →</Link>
      </div>
      <PwaNav />
    </main>
  );
}
