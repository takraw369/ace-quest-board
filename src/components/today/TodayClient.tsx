'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Bootstrap = {
  ok: boolean;
  profile?: {
    display_name?: string | null;
    lifecycle_stage?: string;
  };
  flow?: {
    level?: string;
    bottleneck?: string;
    scores?: Record<string, number>;
  } | null;
  progress?: {
    xp_total?: number;
    growth_level?: number;
    growth_rank?: string;
    streak_current?: number;
    streak_best?: number;
    actions_completed?: number;
    quests_completed?: number;
  };
  curriculum?: {
    current_spine_stage?: string | null;
    active_branch?: string | null;
    recommended_node_id?: string | null;
    reason?: string | null;
  } | null;
  recommendations?: Array<{
    id: string;
    recommendation_type: string;
    recommendation_ref?: string | null;
    reason?: string;
    confidence?: number | string | null;
    alternative?: Record<string, unknown> | null;
  }>;
  cached_at?: string;
};

const STORAGE_KEY = 'flow:pwa:bootstrap:v1';
const domainLabel: Record<string, string> = {
  body: '身体',
  mind: '心・認知',
  environment: '環境',
  action: '行動',
};

function RecommendationCard({
  eyebrow,
  title,
  body,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  action: string;
}) {
  return (
    <article className="rounded-[26px] border border-[#c8ab72]/15 bg-white/[0.025] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-xl font-semibold text-[#eee8dc]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[#9ca097]">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-full border border-[#c8ab72]/25 bg-[#c8ab72]/10 px-4 py-2.5 text-xs font-semibold text-[#e5d3aa]"
      >
        {action}
      </Link>
    </article>
  );
}

export default function TodayClient() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData(JSON.parse(raw));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoaded(true);
    }
  }, []);

  const recommendations = useMemo(() => data?.recommendations ?? [], [data]);
  const education = recommendations.find((r) => r.recommendation_type === 'education');
  const quest = recommendations.find((r) => r.recommendation_type === 'quest');
  const connection = recommendations.find((r) => r.recommendation_type === 'connection');

  if (!loaded) {
    return <main className="min-h-screen bg-[#090a08] p-6 text-[#e9e1d1]">読み込み中…</main>;
  }

  if (!data?.ok) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-12 text-[#e9e1d1]">
        <section className="mx-auto max-w-md pt-20">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">FLOW OS</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">あなたのFLOWを接続する</h1>
          <p className="mt-5 text-sm leading-7 text-[#9ca097]">
            まずLINEからFLOW OSを開いて、本人データと接続してください。
          </p>
          <Link
            href="/connect/line"
            className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]"
          >
            LINEと接続する
          </Link>
        </section>
      </main>
    );
  }

  const progress = data.progress ?? {};
  const flow = data.flow ?? null;
  const rank = String(progress.growth_rank ?? 'seed').toUpperCase();
  const bottleneck = flow?.bottleneck ? domainLabel[flow.bottleneck] ?? flow.bottleneck : '未判定';
  const name = data.profile?.display_name || 'あなた';

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-24 pt-7 text-[#e9e1d1] sm:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-48 h-[460px] w-[460px] rounded-full bg-[#789581]/10 blur-[125px]" />
        <div className="absolute -right-40 top-64 h-[420px] w-[420px] rounded-full bg-[#c8ab72]/[0.05] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        <header className="mb-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">Today / FLOW OS</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{name}の、今日の流れ。</h1>
            </div>
            <div className="rounded-full border border-[#c8ab72]/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#858c84]">
              {data.profile?.lifecycle_stage ?? 'registered'}
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.03] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#6e756e]">Growth</p>
              <p className="mt-1 font-serif text-2xl font-semibold">{rank} Lv.{progress.growth_level ?? 1}</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-2xl font-semibold text-[#d9c18d]">{progress.xp_total ?? 0} XP</p>
              <p className="mt-1 text-xs text-[#7d847d]">🔥 {progress.streak_current ?? 0}日連続</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#c8ab72]/10 pt-4 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#626963]">Flow focus</p>
              <p className="mt-1 text-sm font-semibold">{bottleneck}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#626963]">Actions</p>
              <p className="mt-1 text-sm font-semibold">{progress.actions_completed ?? 0}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.16em] text-[#626963]">Quests</p>
              <p className="mt-1 text-sm font-semibold">{progress.quests_completed ?? 0}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 space-y-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#5e665f]">Recommended for you</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold">今、深める3つ。</h2>
          </div>

          <RecommendationCard
            eyebrow="Education"
            title={education?.recommendation_ref ? `Learn ${education.recommendation_ref}` : '今の自分を知る'}
            body={education?.reason ?? data.curriculum?.reason ?? '体験と問いから、今の自分に必要な学びを選びます。'}
            href="/knowledge"
            action="学びを開く"
          />

          <RecommendationCard
            eyebrow="Quest"
            title={(quest?.alternative?.duration as string | undefined) ?? '今日のQuest'}
            body={quest?.reason ?? '今の実行履歴に合うサイズで、次の一手を現実にします。'}
            href="/"
            action="Questを開く"
          />

          <RecommendationCard
            eyebrow="People / Place"
            title="反応が増える出逢い"
            body={connection?.reason ?? '今のテーマに、違う視点や環境を1つ足します。'}
            href="/want-to"
            action="出逢いの方向を見る"
          />
        </section>

        {data.cached_at && (
          <p className="mt-8 text-center text-[10px] text-[#505650]">
            最終同期 {new Date(data.cached_at).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
    </main>
  );
}
