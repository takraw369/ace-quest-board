'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { growthAction, loadBootstrap, PwaBootstrap, recommendationOf, sessionIsUsable } from '@/lib/pwa';

type Experience = {
  intro?: string;
  prediction?: string;
  action?: string;
  reflection?: string;
};

export default function LearnClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [prediction, setPrediction] = useState('');
  const [actual, setActual] = useState('');
  const [reflection, setReflection] = useState('');
  const [started, setStarted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ xp?: number; total?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setData(loadBootstrap()), []);
  const rec = useMemo(() => recommendationOf(data, 'education'), [data]);
  const alt = (rec?.alternative ?? {}) as Record<string, unknown>;
  const experience = (alt.experience ?? {}) as Experience;
  const question = typeof alt.question_text === 'string' ? alt.question_text : null;
  const nodeTitle = (rec?.metadata?.node_title as string | undefined) ?? rec?.recommendation_ref ?? '今のEducation';

  if (!data?.ok || !sessionIsUsable(data)) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]">
        <div className="mx-auto max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">LEARN</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続して学びを始める</h1>
          <p className="mt-4 text-sm leading-7 text-[#939a92]">本人データと接続すると、今の状態に合わせたEducationが出ます。</p>
          <Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link>
        </div>
        <PwaNav />
      </main>
    );
  }

  if (!rec) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]">
        <div className="mx-auto max-w-md"><h1 className="font-serif text-3xl font-semibold">おすすめを準備中</h1><p className="mt-4 text-sm text-[#939a92]">LINEからもう一度FLOW OSを開くと、最新の推薦を取得します。</p></div><PwaNav />
      </main>
    );
  }

  const begin = async () => {
    setBusy(true); setError(null);
    try { await growthAction(data, 'education_start', rec.id); setStarted(true); }
    catch (e) { setError(e instanceof Error ? e.message : 'start_failed'); }
    finally { setBusy(false); }
  };

  const complete = async () => {
    setBusy(true); setError(null);
    try {
      const out = await growthAction(data, 'education_complete', rec.id, { prediction, actual, reflection });
      setResult({ xp: out?.xp?.xp_amount ?? 0, total: out?.progress?.xp_total ?? data.progress?.xp_total ?? 0 });
      setData(loadBootstrap());
    } catch (e) { setError(e instanceof Error ? e.message : 'complete_failed'); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">LEARN / EXPERIENCE FIRST</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold">{nodeTitle}</h1>
        <p className="mt-4 text-sm leading-7 text-[#9da29b]">{rec.reason}</p>

        {result ? (
          <section className="mt-7 rounded-[28px] border border-[#789581]/25 bg-[#789581]/10 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c0af]">Education Complete</p>
            <p className="mt-3 font-serif text-3xl font-semibold">+{result.xp ?? 0} XP</p>
            <p className="mt-2 text-sm text-[#aeb5ad]">累計 {result.total ?? 0} XP。予想と実際の差もHuman Graphに残った。</p>
            <Link href="/today" className="mt-5 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">今日へ戻る</Link>
          </section>
        ) : (
          <>
            <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">01 EXPERIENCE</p>
              {experience.intro && <p className="mt-3 text-sm leading-7 text-[#aeb2ac]">{experience.intro}</p>}
              {experience.action && <p className="mt-3 font-serif text-lg leading-8 text-[#eee8dc]">{experience.action}</p>}
              {!started && <button type="button" disabled={busy} onClick={() => void begin()} className="mt-5 rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813] disabled:opacity-50">体験を始める</button>}
            </section>

            {started && (
              <section className="mt-4 space-y-4 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">02 PREDICTION</label>
                  <p className="mt-2 text-sm leading-7 text-[#9da29b]">{experience.prediction ?? 'やる前に、どうなりそうか予想する。'}</p>
                  <textarea value={prediction} onChange={(e) => setPrediction(e.target.value)} rows={2} placeholder="やる前の予想" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">03 ACTUAL</label>
                  <p className="mt-2 text-sm leading-7 text-[#9da29b]">実際にやってみて、起きたことをそのまま。</p>
                  <textarea value={actual} onChange={(e) => setActual(e.target.value)} rows={2} placeholder="実際はどうだった？" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">04 REFLECT</label>
                  <p className="mt-2 text-sm leading-7 text-[#9da29b]">{experience.reflection ?? question ?? '予想と実際のズレから何が分かった？'}</p>
                  {question && <p className="mt-2 rounded-2xl bg-white/[0.035] p-3 text-sm leading-6 text-[#c2c5bf]">問い：{question}</p>}
                  <textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} placeholder="気づいたことを一言でも" className="mt-3 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none focus:border-[#789581]/60" />
                </div>
                <button type="button" disabled={busy || (!actual && !reflection)} onClick={() => void complete()} className="w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813] disabled:opacity-40">体験を完了して記録</button>
              </section>
            )}
          </>
        )}
        {error && <p className="mt-4 text-xs text-[#c98f83]">{error === 'session_expired' ? '接続期限が切れました。LINEからもう一度開いてください。' : `error: ${error}`}</p>}
      </div>
      <PwaNav />
    </main>
  );
}
