'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { loadBootstrap, sessionIsUsable, SUPABASE_URL, type PwaBootstrap } from '@/lib/pwa';

type Evidence = {
  id: string;
  recommendation_ref: string | null;
  reason: string | null;
  acted_at: string | null;
  outcome: { prediction?: string; actual?: string; reflection?: string } | null;
  metadata: Record<string, unknown> | null;
  alternative: Record<string, unknown> | null;
};

type EvidencePayload = {
  ok: boolean;
  error?: string;
  profile?: { display_name?: string | null; lifecycle_stage?: string | null } | null;
  progress?: { xp_total?: number; growth_level?: number; growth_rank?: string; streak_current?: number; quests_completed?: number } | null;
  evidence?: Evidence[];
};

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function titleOf(item: Evidence) {
  const title = item.metadata?.node_title;
  if (typeof title === 'string' && title.trim()) return title;
  const questKey = item.metadata?.quest_key;
  if (typeof questKey === 'string' && questKey.trim()) return questKey;
  return item.recommendation_ref ?? 'Completed Quest';
}

export default function MyAceEvidencePage() {
  const [bootstrap, setBootstrap] = useState<PwaBootstrap | null>(null);
  const [payload, setPayload] = useState<EvidencePayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const data = loadBootstrap();
    setBootstrap(data);
    if (!data || !sessionIsUsable(data)) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void fetch(`${SUPABASE_URL}/functions/v1/pwa-my-ace-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: data.session_token, limit: 30 }),
    })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as EvidencePayload;
        if (!cancelled) setPayload(result);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (!loaded) return <main className="min-h-screen bg-[#090a08] p-6 text-[#e9e1d1]">Evidenceを読み込み中…</main>;

  if (!bootstrap || !sessionIsUsable(bootstrap)) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]">
        <section className="mx-auto max-w-md pt-16">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#789581]">MY ACE / EVIDENCE</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">まず本人データと接続する。</h1>
          <p className="mt-5 text-sm leading-7 text-[#939a92]">Questで作ったPrediction・Actual・Reflectionを同じ本人のEvidenceとして読むため、LINEからFLOW OSへ接続してください。</p>
          <Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続する</Link>
        </section>
        <PwaNav />
      </main>
    );
  }

  const items = payload?.evidence ?? [];
  const progress = payload?.progress ?? null;
  const name = payload?.profile?.display_name || bootstrap.profile?.display_name || 'あなた';

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-40 -top-48 h-[460px] w-[460px] rounded-full bg-[#789581]/10 blur-[125px]" /><div className="absolute -right-40 top-64 h-[420px] w-[420px] rounded-full bg-[#c8ab72]/[0.05] blur-[120px]" /></div>
      <div className="relative z-10 mx-auto max-w-2xl">
        <header>
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#789581]">MY ACE / EVIDENCE</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">{name}の、体験からできた証拠。</h1>
          <p className="mt-4 text-sm leading-7 text-[#939a92]">Questをやった事実だけでなく、やる前の予測・実際・振り返りを残す。これが次のQuestを賢くする本人データです。</p>
        </header>

        <section className="mt-6 grid grid-cols-3 gap-3">
          <Metric label="QUEST" value={String(progress?.quests_completed ?? items.length)} />
          <Metric label="XP" value={String(progress?.xp_total ?? 0)} />
          <Metric label="STREAK" value={`${progress?.streak_current ?? 0}日`} />
        </section>

        {payload?.ok === false && <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200/90">Evidenceを読み込めませんでした。LINEからFLOW OSを開き直してください。</div>}

        {items.length === 0 ? (
          <section className="mt-8 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.03] p-6">
            <h2 className="font-serif text-2xl font-semibold">最初のEvidenceを作ろう。</h2>
            <p className="mt-3 text-sm leading-7 text-[#939a92]">Questを1つ完了すると、Prediction → Actual → Reflection がここに積み上がります。</p>
            <Link href="/quest-router?source=evidence" className="mt-5 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">今のQuestを選ぶ →</Link>
          </section>
        ) : (
          <section className="mt-8 space-y-4">
            <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#5f665f]">HISTORY</p><h2 className="mt-1 font-serif text-2xl font-semibold">やったことではなく、学んだこと。</h2></div>
            {items.map((item) => {
              const prediction = text(item.outcome?.prediction);
              const actual = text(item.outcome?.actual);
              const reflection = text(item.outcome?.reflection);
              const duration = text(item.alternative?.duration);
              const routerContext = item.metadata?.router_context as Record<string, unknown> | undefined;
              const wantContext = routerContext?.want_context as Record<string, unknown> | undefined;
              const wantTitle = text(wantContext?.title);
              return (
                <article key={item.id} className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.025] p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#789581]">QUEST EVIDENCE</p><h3 className="mt-2 font-serif text-xl font-semibold text-[#eee8dc]">{titleOf(item)}</h3></div>
                    <div className="shrink-0 text-right text-[10px] text-[#747b74]">{duration && <div>{duration}</div>}{item.acted_at && <div className="mt-1">{new Date(item.acted_at).toLocaleDateString('ja-JP')}</div>}</div>
                  </div>
                  {wantTitle && <div className="mt-4 rounded-2xl border border-[#789581]/15 bg-[#789581]/5 p-3 text-xs leading-6 text-[#9db0a1]">望：{wantTitle}</div>}
                  <div className="mt-4 grid gap-3">
                    {prediction && <EvidenceRow label="PREDICT / どうなると思った？" value={prediction} />}
                    {actual && <EvidenceRow label="ACTUAL / 実際どうだった？" value={actual} />}
                    {reflection && <EvidenceRow label="REFLECT / 何が分かった？" value={reflection} strong />}
                  </div>
                  {!prediction && !actual && !reflection && <p className="mt-4 text-sm text-[#7f867f]">完了記録あり。詳細Evidenceは次回以降のQuestから蓄積されます。</p>}
                </article>
              );
            })}
          </section>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3"><Link href="/today" className="rounded-full border border-white/10 px-4 py-3 text-center text-xs font-semibold text-[#aeb5ad]">Todayへ</Link><Link href="/quest-router?source=evidence" className="rounded-full border border-[#c8ab72]/20 px-4 py-3 text-center text-xs font-semibold text-[#d9c18d]">次のQuestへ →</Link></div>
      </div>
      <PwaNav />
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#c8ab72]/10 bg-white/[0.025] p-4 text-center"><p className="text-[9px] font-black tracking-[0.18em] text-[#646b65]">{label}</p><p className="mt-2 font-serif text-xl font-semibold text-[#e9e1d1]">{value}</p></div>;
}

function EvidenceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${strong ? 'border-[#789581]/20 bg-[#789581]/5' : 'border-white/10 bg-black/15'}`}><p className="text-[9px] font-black tracking-[0.16em] text-[#6f776f]">{label}</p><p className="mt-2 text-sm leading-7 text-[#aeb5ad]">{value}</p></div>;
}
