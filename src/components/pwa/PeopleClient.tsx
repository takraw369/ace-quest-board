'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { growthAction, loadBootstrap, PwaBootstrap, recommendationOf, sessionIsUsable } from '@/lib/pwa';

export default function PeopleClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setData(loadBootstrap()), []);
  const rec = useMemo(() => recommendationOf(data, 'connection'), [data]);

  if (!data?.ok || !sessionIsUsable(data)) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]">
        <div className="mx-auto max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">PEOPLE</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続して出逢いを育てる</h1>
          <p className="mt-4 text-sm leading-7 text-[#939a92]">今のテーマに合う人・場所・イベントの方向性を、本人データと一緒に育てます。</p>
          <div className="mt-7 grid gap-2">
            <Link href="/connect/line" className="inline-flex justify-center rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link>
            <Link href="/scout" className="inline-flex justify-center rounded-full border border-[#789581]/30 bg-[#789581]/10 px-5 py-3 text-sm font-semibold text-[#b8c5bb]">アスリートをスカウトする</Link>
          </div>
        </div>
        <PwaNav />
      </main>
    );
  }

  const alt = (rec?.alternative ?? {}) as Record<string, unknown>;
  const suggestion = typeof alt.suggestion === 'string' ? alt.suggestion : '今のテーマに違う反応をくれる人や場所';

  const choose = async (type: string) => {
    setBusy(true); setError(null);
    try { await growthAction(data, 'connection_interest', rec?.id ?? null, { type }); setChosen(type); }
    catch (e) { setError(e instanceof Error ? e.message : 'save_failed'); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">PEOPLE / PLACE</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">今、出逢うなら。</h1>
        <p className="mt-4 text-sm leading-7 text-[#9da29b]">{rec?.reason ?? '今のテーマを一人で完結させず、反応を増やす接点を1つ足す。'}</p>

        <Link href="/scout" className="mt-6 flex items-center justify-between rounded-[28px] border border-[#789581]/20 bg-[#789581]/[0.06] p-5 transition hover:border-[#789581]/40">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#789581]">ATHLETE SCOUT</p>
            <p className="mt-2 font-serif text-xl font-semibold text-[#e6e8e4]">未来のACEを見つける</p>
            <p className="mt-1 text-xs leading-6 text-[#858e86]">候補登録 → 評価 → 接触 → TRIAL → ACEまでを一つの流れで残す。</p>
          </div>
          <span className="ml-4 text-2xl text-[#9caf9f]">→</span>
        </Link>

        <section className="mt-4 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">CURRENT DIRECTION</p>
          <p className="mt-4 font-serif text-xl leading-9 text-[#eee8dc]">{suggestion}</p>
        </section>

        <section className="mt-4 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">WHAT KIND?</p>
          <p className="mt-2 text-sm leading-7 text-[#9da29b]">今はどの形の出逢いが欲しい？ 選択を次の推薦材料にします。</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {['人','場所','イベント'].map((type) => <button key={type} type="button" disabled={busy} onClick={() => void choose(type)} className={`rounded-2xl border px-3 py-4 text-sm font-semibold ${chosen===type ? 'border-[#789581]/60 bg-[#789581]/15 text-[#c3d1c6]' : 'border-white/10 bg-white/[0.02] text-[#b5b9b3]'} disabled:opacity-40`}>{type}</button>)}
          </div>
          {chosen && <p className="mt-4 rounded-2xl bg-[#789581]/10 p-4 text-sm leading-7 text-[#b8c5bb]">「{chosen}」を希望として保存した。次回の推薦はこの選択も使う。</p>}
        </section>
        {error && <p className="mt-4 text-xs text-[#c98f83]">{error === 'session_expired' ? '接続期限が切れました。LINEからもう一度開いてください。' : `error: ${error}`}</p>}
      </div>
      <PwaNav />
    </main>
  );
}
