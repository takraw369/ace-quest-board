"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getCurrentIdentity,
  getMyAceSnapshot,
  signOut,
  type AceIdentity,
  type MyAceSnapshot,
} from "@/lib/auth/supabaseAuth";

function label(value: string | null | undefined) {
  if (!value) return "観察中";
  return value.replaceAll("_", " ").replaceAll("-", " ");
}

function rankLabel(rank: string) {
  const map: Record<string, string> = {
    seed: "Seed",
    sprout: "Sprout",
    leaf: "Leaf",
    bloom: "Bloom",
    flower: "Flower",
  };
  return map[rank] ?? rank;
}

export default function MyAcePage() {
  const [identity, setIdentity] = useState<AceIdentity | null>(null);
  const [snapshot, setSnapshot] = useState<MyAceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getCurrentIdentity()
      .then(async (current) => {
        if (!current) {
          window.location.replace("/login");
          return;
        }
        if (cancelled) return;
        setIdentity(current);
        try {
          const next = await getMyAceSnapshot(current);
          if (!cancelled) setSnapshot(next);
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "my_ace_load_failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const learningTotal = useMemo(
    () => Object.values(snapshot?.learningCounts ?? {}).reduce((sum, count) => sum + count, 0),
    [snapshot],
  );

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#06162f] px-6 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#ff8126]" />
          <p className="mt-5 text-sm tracking-[0.18em] text-blue-100/60">MY ACE LOADING</p>
        </div>
      </main>
    );
  }

  if (!identity) return null;

  const isAdmin = identity.role === "admin";
  const name = identity.displayName || identity.user.email || "Flower";
  const progress = snapshot?.progress ?? {
    xpTotal: 0,
    growthLevel: 1,
    growthRank: "seed",
    streakCurrent: 0,
    actionsCompleted: 0,
    questsCompleted: 0,
    educationCompleted: 0,
  };
  const curriculum = snapshot?.curriculum ?? null;
  const recommendation = snapshot?.recommendation ?? null;

  return (
    <main className="min-h-screen bg-[#06162f] px-4 pb-16 pt-8 text-white sm:px-6 sm:pt-12">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] border border-white/10 bg-[#0a2148] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-black tracking-[0.28em] text-[#ff8a2b]">MY ACE</span>
                <span className="rounded-full border border-[#ff8a2b]/35 bg-[#ff8a2b]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffad66]">
                  {identity.role}
                </span>
                {snapshot?.serialCode && (
                  <span className="text-[10px] tracking-[0.12em] text-blue-100/45">{snapshot.serialCode}</span>
                )}
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{name}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/65">
                今の状態を見て、今日の一歩を選び、体験からまた自分を更新していく場所。
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/me"
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-blue-100/70 transition hover:bg-white/5"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  window.location.replace("/login");
                }}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-blue-100/70 transition hover:bg-white/5"
              >
                ログアウト
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <Metric label="GROWTH" value={rankLabel(progress.growthRank)} note={`Lv.${progress.growthLevel}`} />
            <Metric label="XP" value={progress.xpTotal.toLocaleString("ja-JP")} note="TOTAL" />
            <Metric label="STREAK" value={`${progress.streakCurrent}日`} note="CURRENT" />
            <Metric label="LEARN" value={`${learningTotal}`} note="NODES" />
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-sm text-amber-100">
            一部の成長データをまだ読み込めませんでした。ログイン自体は有効です。
          </div>
        )}

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#0a2148] p-6 sm:p-7">
            <div className="text-[10px] font-black tracking-[0.25em] text-[#ff8a2b]">NOW / 今の自分</div>
            <h2 className="mt-3 text-2xl font-black">現在地</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <State label="STAGE" value={label(curriculum?.stage)} />
              <State label="BRANCH" value={label(curriculum?.branch)} />
              <State label="LOOP" value={label(curriculum?.loopPosition)} />
            </div>
            <p className="mt-5 text-sm leading-7 text-blue-100/60">
              {curriculum?.reason ?? "まだ決めつけない。Action・Quest・Learnの記録が増えるほど、今の自分に合うルートが見えてきます。"}
            </p>
          </div>

          <div className="rounded-[28px] border border-[#ff8a2b]/25 bg-gradient-to-br from-[#122b58] to-[#0a2148] p-6 sm:p-7">
            <div className="text-[10px] font-black tracking-[0.25em] text-[#ff9a43]">NEXT / 次の一手</div>
            <h2 className="mt-3 text-2xl font-black">{recommendation ? "今おすすめの体験" : "まず1つ動いてみる"}</h2>
            <p className="mt-4 text-sm leading-7 text-blue-50/75">
              {recommendation?.reason ?? "今日の一歩・Quest・Learnのどれか1つでOK。行動の記録が、次のおすすめを育てます。"}
            </p>
            {recommendation?.destination?.startsWith("/") ? (
              <Link
                href={recommendation.destination}
                className="mt-6 inline-flex rounded-2xl bg-[#ff8126] px-5 py-3 font-black text-[#06162f] transition hover:bg-[#ff9b4f]"
              >
                おすすめへ →
              </Link>
            ) : (
              <Link
                href="/today"
                className="mt-6 inline-flex rounded-2xl bg-[#ff8126] px-5 py-3 font-black text-[#06162f] transition hover:bg-[#ff9b4f]"
              >
                今日の一歩へ →
              </Link>
            )}
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <JourneyCard
            href="/today"
            eyebrow="ACTION"
            icon="⚡"
            title="今日の一歩"
            description="考え続けるより、今できる小さな一歩を選ぶ。"
            count={`${progress.actionsCompleted} actions`}
          />
          <JourneyCard
            href="/quest"
            eyebrow="QUEST"
            icon="🗺️"
            title="体験して確かめる"
            description="予想して、やってみて、実際どうだったかを見る。"
            count={`${progress.questsCompleted} quests`}
          />
          <JourneyCard
            href="/learn"
            eyebrow="LEARN"
            icon="📚"
            title="理解を深める"
            description="体験から生まれた疑問を、自分の言葉に変える。"
            count={`${progress.educationCompleted} learned`}
          />
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[28px] border border-white/10 bg-[#0a2148] p-6">
            <div className="text-[10px] font-black tracking-[0.25em] text-[#ff8a2b]">RECENT</div>
            <h2 className="mt-2 text-xl font-black">最近の変化</h2>
            {snapshot?.recentEvents.length ? (
              <div className="mt-5 space-y-3">
                {snapshot.recentEvents.map((event, index) => (
                  <div key={`${event.occurredAt}-${index}`} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                    <div className="text-xs font-bold text-[#ff9a43]">{label(event.eventType)}</div>
                    {event.capturedSignal && <p className="mt-2 text-sm leading-6 text-blue-100/70">{event.capturedSignal}</p>}
                    <p className="mt-2 text-[10px] text-blue-100/35">{new Date(event.occurredAt).toLocaleString("ja-JP")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-7 text-blue-100/55">まだ記録はありません。最初のActionやQuestから、ここに変化が積み上がります。</p>
            )}
          </div>

          {isAdmin ? (
            <div className="rounded-[28px] border border-[#ff8a2b]/30 bg-[#101f3d] p-6">
              <div className="text-[10px] font-black tracking-[0.25em] text-[#ff8a2b]">ADMIN LAYER</div>
              <h2 className="mt-3 text-xl font-black">ACEを育てる側へ</h2>
              <p className="mt-3 text-sm leading-7 text-blue-100/60">
                FlowerとしてのMy ACEと、運営・戦略の管理Dashboardは分離しています。
              </p>
              <a
                href="https://masahiro-yamada.com/dashboard"
                className="mt-6 inline-flex rounded-2xl border border-[#ff8a2b]/35 px-5 py-3 font-bold text-[#ffad66] transition hover:bg-[#ff8a2b]/10"
              >
                Admin Dashboard →
              </a>
            </div>
          ) : (
            <div className="rounded-[28px] border border-white/10 bg-[#0a2148] p-6">
              <div className="text-[10px] font-black tracking-[0.25em] text-[#ff8a2b]">ACE LOOP</div>
              <h2 className="mt-3 text-xl font-black">Action → Quest → Learn</h2>
              <p className="mt-3 text-sm leading-7 text-blue-100/60">
                正解を当てる場所ではなく、自分で試して、自分の変化を見つけていく場所です。
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label: metricLabel, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#071a39] p-4">
      <div className="text-[9px] font-black tracking-[0.2em] text-blue-100/40">{metricLabel}</div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-[9px] tracking-[0.16em] text-[#ff8a2b]/70">{note}</div>
    </div>
  );
}

function State({ label: stateLabel, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#071a39] p-4">
      <div className="text-[9px] font-black tracking-[0.18em] text-blue-100/40">{stateLabel}</div>
      <div className="mt-2 text-sm font-bold text-blue-50">{value}</div>
    </div>
  );
}

function JourneyCard({
  href,
  eyebrow,
  icon,
  title,
  description,
  count,
}: {
  href: string;
  eyebrow: string;
  icon: string;
  title: string;
  description: string;
  count: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[26px] border border-white/10 bg-[#0a2148] p-6 transition hover:-translate-y-0.5 hover:border-[#ff8a2b]/45 hover:bg-[#0c2754]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black tracking-[0.22em] text-[#ff8a2b]">{eyebrow}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="mt-5 text-xl font-black">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-blue-100/55">{description}</p>
      <div className="mt-5 flex items-center justify-between text-xs">
        <span className="text-blue-100/35">{count}</span>
        <span className="font-bold text-[#ff9a43] transition group-hover:translate-x-1">OPEN →</span>
      </div>
    </Link>
  );
}
