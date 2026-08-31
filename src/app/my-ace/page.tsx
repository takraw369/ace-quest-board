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

const NAVY = "#07182f";
const SURFACE = "#0b274a";
const SURFACE_DEEP = "#081f3d";
const ORANGE = "#f47a20";

function label(value: string | null | undefined) {
  if (!value) return null;
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

function nextHref(snapshot: MyAceSnapshot | null) {
  const destination = snapshot?.recommendation?.destination;
  return destination?.startsWith("/") ? destination : "/today";
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
      <main className="grid min-h-screen place-items-center px-6 text-white" style={{ background: NAVY }}>
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full" style={{ background: ORANGE }} />
          <p className="mt-5 text-xs font-bold tracking-[0.2em] text-blue-100/55">MY ACE LOADING</p>
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
  const curriculumLabels = [
    ["Stage", label(curriculum?.stage)],
    ["Branch", label(curriculum?.branch)],
    ["Loop", label(curriculum?.loopPosition)],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <main className="min-h-screen px-4 pb-20 pt-6 text-white sm:px-6 sm:pt-10" style={{ background: NAVY }}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute -left-40 top-[32rem] h-96 w-96 rounded-full bg-blue-400/[0.06] blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-5 px-1 pb-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-black tracking-[0.28em]" style={{ color: ORANGE }}>MY ACE</span>
              <span className="rounded-full border border-orange-400/30 bg-orange-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-orange-200">
                {identity.role}
              </span>
              {snapshot?.serialCode && <span className="text-[9px] tracking-[0.12em] text-blue-100/35">{snapshot.serialCode}</span>}
            </div>
            <h1 className="mt-3 truncate text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
            <p className="mt-2 text-sm text-blue-100/55">今日は、何をひとつ動かす？</p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link href="/me" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-blue-100/65 hover:bg-white/5">
              Profile
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                window.location.replace("/login");
              }}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-blue-100/65 hover:bg-white/5"
            >
              Logout
            </button>
          </div>
        </header>

        {isAdmin && (
          <a
            href="https://masahiro-yamada.com/dashboard"
            className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-orange-400/25 bg-orange-400/[0.07] px-4 py-3 text-sm transition hover:bg-orange-400/[0.12]"
          >
            <span><strong className="text-orange-200">ADMIN</strong><span className="ml-2 text-blue-100/55">運営・戦略は管理Dashboardへ</span></span>
            <span className="font-black text-orange-300">→</span>
          </a>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            一部データをまだ読み込めません。ログインは有効です。
          </div>
        )}

        <section
          className="overflow-hidden rounded-[30px] border border-orange-400/25 p-6 shadow-2xl shadow-black/20 sm:p-8"
          style={{ background: `linear-gradient(135deg, #12315b 0%, ${SURFACE} 58%, ${SURFACE_DEEP} 100%)` }}
        >
          <div className="max-w-2xl">
            <div className="text-[10px] font-black tracking-[0.28em]" style={{ color: ORANGE }}>TODAY / 今日の一歩</div>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              {recommendation ? "今おすすめの体験から始める" : "まず、5分だけ動いてみる"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-blue-50/70 sm:text-base">
              {recommendation?.reason ?? "考え続けなくてOK。今できる小さな一歩を1つ選ぶと、その記録から次のQuestやLearnが育ちます。"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={nextHref(snapshot)}
                className="inline-flex items-center rounded-2xl px-5 py-3.5 text-sm font-black text-[#07182f] transition hover:brightness-110"
                style={{ background: ORANGE }}
              >
                今日の一歩を選ぶ →
              </Link>
              <a href="#now" className="inline-flex items-center rounded-2xl border border-white/12 px-5 py-3.5 text-sm font-bold text-blue-50/75 hover:bg-white/5">
                今の自分を見る
              </a>
            </div>
          </div>
        </section>

        <section id="now" className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[26px] border border-white/10 p-6" style={{ background: SURFACE }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[9px] font-black tracking-[0.24em] text-blue-100/40">NOW / 現在地</div>
                <h2 className="mt-2 text-2xl font-black">今の自分</h2>
              </div>
              <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-bold text-blue-100/55">
                {rankLabel(progress.growthRank)} Lv.{progress.growthLevel}
              </span>
            </div>

            {curriculumLabels.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {curriculumLabels.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-white/8 bg-[#071c36] px-3 py-2">
                    <span className="mr-2 text-[9px] uppercase tracking-[0.14em] text-blue-100/35">{key}</span>
                    <span className="text-sm font-bold text-blue-50">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-[#071c36]/70 p-4">
                <p className="font-bold text-blue-50">まだ観察中</p>
                <p className="mt-2 text-sm leading-6 text-blue-100/50">Action・Quest・Learnが増えるほど、現在地を決めつけずに少しずつ解像度を上げます。</p>
              </div>
            )}

            {curriculum?.reason && <p className="mt-5 text-sm leading-7 text-blue-100/55">{curriculum.reason}</p>}
          </article>

          <article className="rounded-[26px] border border-white/10 p-6" style={{ background: SURFACE_DEEP }}>
            <div className="text-[9px] font-black tracking-[0.24em]" style={{ color: ORANGE }}>NEXT ROUTES</div>
            <h2 className="mt-2 text-xl font-black">次に使う2つ</h2>
            <div className="mt-5 space-y-3">
              <MiniRoute href="/quest" icon="🗺️" title="Quest" body="体験して確かめる" value={`${progress.questsCompleted} completed`} />
              <MiniRoute href="/learn" icon="📚" title="Learn" body="体験を理解に変える" value={`${learningTotal} nodes`} />
            </div>
          </article>
        </section>

        <section className="mt-5 rounded-[26px] border border-white/10 p-5 sm:p-6" style={{ background: SURFACE }}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] font-black tracking-[0.24em] text-blue-100/40">GROWTH</div>
              <h2 className="mt-1 text-lg font-black">積み上がり</h2>
            </div>
            <span className="text-xs text-blue-100/35">結果ではなく、動いた記録</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="XP" value={progress.xpTotal.toLocaleString("ja-JP")} />
            <Metric label="STREAK" value={`${progress.streakCurrent}日`} />
            <Metric label="ACTION" value={`${progress.actionsCompleted}`} />
            <Metric label="LEARN" value={`${learningTotal}`} />
          </div>
        </section>

        {snapshot?.recentEvents.length ? (
          <section className="mt-5 rounded-[26px] border border-white/10 p-6" style={{ background: SURFACE_DEEP }}>
            <div className="text-[9px] font-black tracking-[0.24em] text-blue-100/40">RECENT</div>
            <h2 className="mt-2 text-lg font-black">最近の変化</h2>
            <div className="mt-4 space-y-3">
              {snapshot.recentEvents.map((event, index) => (
                <div key={`${event.occurredAt}-${index}`} className="flex gap-3 rounded-2xl border border-white/7 bg-white/[0.025] p-4">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: ORANGE }} />
                  <div>
                    <div className="text-xs font-bold text-orange-200">{label(event.eventType) ?? "更新"}</div>
                    {event.capturedSignal && <p className="mt-1 text-sm leading-6 text-blue-100/55">{event.capturedSignal}</p>}
                    <p className="mt-1 text-[10px] text-blue-100/30">{new Date(event.occurredAt).toLocaleString("ja-JP")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-8 text-center text-[10px] tracking-[0.12em] text-blue-100/25">ACTION → QUEST → LEARN → UPDATE</p>
      </div>
    </main>
  );
}

function Metric({ label: metricLabel, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#071c36] px-4 py-4">
      <div className="text-[9px] font-black tracking-[0.18em] text-blue-100/35">{metricLabel}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}

function MiniRoute({ href, icon, title, body, value }: { href: string; icon: string; title: string; body: string; value: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-white/8 bg-[#071c36] p-4 transition hover:border-orange-400/30 hover:bg-[#092342]">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-xl">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-black text-white">{title}</div>
        <div className="mt-0.5 text-xs text-blue-100/50">{body}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] text-blue-100/30">{value}</div>
        <div className="mt-1 font-black text-orange-300 transition group-hover:translate-x-0.5">→</div>
      </div>
    </Link>
  );
}
