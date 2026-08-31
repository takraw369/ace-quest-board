"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Vitality8Panel from "@/components/my-ace/Vitality8Panel";
import {
  getCurrentIdentity,
  getMyAceSnapshot,
  signOut,
  type AceIdentity,
  type MyAceSnapshot,
} from "@/lib/auth/supabaseAuth";

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

  useEffect(() => {
    if (!identity) return;
    let cancelled = false;

    const refreshProgress = () => {
      void getMyAceSnapshot(identity)
        .then((next) => {
          if (cancelled) return;
          setSnapshot(next);
          setError(null);
        })
        .catch((reason) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "my_ace_refresh_failed");
        });
    };

    window.addEventListener("ace:progress-updated", refreshProgress);
    return () => {
      cancelled = true;
      window.removeEventListener("ace:progress-updated", refreshProgress);
    };
  }, [identity]);

  const learningTotal = useMemo(
    () => Object.values(snapshot?.learningCounts ?? {}).reduce((sum, count) => sum + count, 0),
    [snapshot],
  );

  if (loading) {
    return (
      <main className="ace-theme-active grid min-h-screen place-items-center bg-ace-bg px-6 text-ace-text">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-ace-accent" />
          <p className="mt-5 text-xs font-bold tracking-[0.2em] text-ace-text-muted">MY ACE LOADING</p>
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
    <main className="ace-theme-active min-h-screen bg-ace-bg px-4 pb-20 pt-6 text-ace-text sm:px-6 sm:pt-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-ace-accent/8 blur-[120px]" />
        <div className="absolute -left-40 top-[32rem] h-96 w-96 rounded-full bg-ace-raised/35 blur-[135px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="flex items-start justify-between gap-5 px-1 pb-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[10px] font-black tracking-[0.28em] text-ace-accent">MY ACE</span>
              <span className="rounded-full border border-ace-accent/25 bg-ace-accent/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-ace-accent-soft">
                {identity.role}
              </span>
              {snapshot?.serialCode && <span className="text-[9px] tracking-[0.12em] text-ace-text-muted">{snapshot.serialCode}</span>}
            </div>
            <h1 className="mt-3 truncate text-2xl font-black tracking-tight sm:text-3xl">{name}</h1>
            <p className="mt-2 text-sm text-ace-text-secondary">今日は、何をひとつ動かす？</p>
          </div>

          <div className="flex shrink-0 gap-2">
            <Link href="/me" className="rounded-xl border border-ace-border px-3 py-2 text-xs font-semibold text-ace-text-secondary transition hover:bg-ace-raised">
              Profile
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                window.location.replace("/login");
              }}
              className="rounded-xl border border-ace-border px-3 py-2 text-xs font-semibold text-ace-text-secondary transition hover:bg-ace-raised"
            >
              Logout
            </button>
          </div>
        </header>

        {isAdmin && (
          <a
            href="https://masahiro-yamada.com/dashboard"
            className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-ace-accent/20 bg-ace-deep px-4 py-3 text-sm transition hover:bg-ace-surface"
          >
            <span><strong className="text-ace-accent-soft">ADMIN</strong><span className="ml-2 text-ace-text-muted">運営・戦略は管理Dashboardへ</span></span>
            <span className="font-black text-ace-accent">→</span>
          </a>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-ace-warning/25 bg-ace-deep px-4 py-3 text-sm text-ace-text-secondary">
            一部データをまだ読み込めません。ログインは有効です。
          </div>
        )}

        <section
          className="overflow-hidden rounded-[30px] border border-ace-accent/20 p-6 shadow-2xl shadow-black/25 sm:p-8"
          style={{ background: "linear-gradient(135deg, var(--ace-raised) 0%, var(--ace-surface) 58%, var(--ace-deep) 100%)" }}
        >
          <div className="max-w-2xl">
            <div className="text-[10px] font-black tracking-[0.28em] text-ace-accent">TODAY / 今日の一歩</div>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
              {recommendation ? "今おすすめの体験から始める" : "まず、5分だけ動いてみる"}
            </h2>
            <p className="mt-4 text-sm leading-7 text-ace-text-secondary sm:text-base">
              {recommendation?.reason ?? "考え続けなくてOK。今できる小さな一歩を1つ選ぶと、その記録から次のQuestやLearnが育ちます。"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={nextHref(snapshot)}
                className="inline-flex items-center rounded-2xl bg-ace-accent px-5 py-3.5 text-sm font-black text-[#050d18] transition hover:brightness-110"
              >
                今日の一歩を選ぶ →
              </Link>
              <a href="#now" className="inline-flex items-center rounded-2xl border border-ace-border px-5 py-3.5 text-sm font-bold text-ace-text-secondary transition hover:bg-ace-raised">
                今の自分を見る
              </a>
            </div>
          </div>
        </section>

        <section id="now" className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[26px] border border-ace-border bg-ace-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[9px] font-black tracking-[0.24em] text-ace-text-muted">NOW / 現在地</div>
                <h2 className="mt-2 text-2xl font-black">今の自分</h2>
              </div>
              <span className="rounded-full bg-ace-raised px-3 py-1.5 text-xs font-bold text-ace-text-secondary">
                {rankLabel(progress.growthRank)} Lv.{progress.growthLevel}
              </span>
            </div>

            {curriculumLabels.length ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {curriculumLabels.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-ace-border bg-ace-deep px-3 py-2">
                    <span className="mr-2 text-[9px] uppercase tracking-[0.14em] text-ace-text-muted">{key}</span>
                    <span className="text-sm font-bold text-ace-text">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-ace-border bg-ace-deep p-4">
                <p className="font-bold text-ace-text">まだ観察中</p>
                <p className="mt-2 text-sm leading-6 text-ace-text-muted">Action・Quest・Learnが増えるほど、現在地を決めつけずに少しずつ解像度を上げます。</p>
              </div>
            )}

            {curriculum?.reason && <p className="mt-5 text-sm leading-7 text-ace-text-muted">{curriculum.reason}</p>}
          </article>

          <article className="rounded-[26px] border border-ace-border bg-ace-deep p-6">
            <div className="text-[9px] font-black tracking-[0.24em] text-ace-accent">NEXT ROUTES</div>
            <h2 className="mt-2 text-xl font-black">次に使う2つ</h2>
            <div className="mt-5 space-y-3">
              <MiniRoute href="/quest" icon="🗺️" title="Quest" body="体験して確かめる" value={`${progress.questsCompleted} completed`} />
              <MiniRoute href="/learn" icon="📚" title="Learn" body="体験を理解に変える" value={`${learningTotal} nodes`} />
            </div>
          </article>
        </section>

        <Vitality8Panel userId={identity.user.id} />

        <section className="mt-5 rounded-[26px] border border-ace-border bg-ace-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[9px] font-black tracking-[0.24em] text-ace-text-muted">GROWTH</div>
              <h2 className="mt-1 text-lg font-black">積み上がり</h2>
            </div>
            <span className="text-xs text-ace-text-muted">結果ではなく、動いた記録</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="XP" value={progress.xpTotal.toLocaleString("ja-JP")} />
            <Metric label="STREAK" value={`${progress.streakCurrent}日`} />
            <Metric label="ACTION" value={`${progress.actionsCompleted}`} />
            <Metric label="LEARN" value={`${learningTotal}`} />
          </div>
        </section>

        {snapshot?.recentEvents.length ? (
          <section className="mt-5 rounded-[26px] border border-ace-border bg-ace-deep p-6">
            <div className="text-[9px] font-black tracking-[0.24em] text-ace-text-muted">RECENT</div>
            <h2 className="mt-2 text-lg font-black">最近の変化</h2>
            <div className="mt-4 space-y-3">
              {snapshot.recentEvents.map((event, index) => (
                <div key={`${event.occurredAt}-${index}`} className="flex gap-3 rounded-2xl border border-ace-border bg-ace-surface p-4">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ace-accent" />
                  <div>
                    <div className="text-xs font-bold text-ace-accent-soft">{label(event.eventType) ?? "更新"}</div>
                    {event.capturedSignal && <p className="mt-1 text-sm leading-6 text-ace-text-muted">{event.capturedSignal}</p>}
                    <p className="mt-1 text-[10px] text-ace-text-muted">{new Date(event.occurredAt).toLocaleString("ja-JP")}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-8 text-center text-[10px] tracking-[0.12em] text-ace-text-muted">ACTION → QUEST → LEARN → UPDATE</p>
      </div>
    </main>
  );
}

function Metric({ label: metricLabel, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ace-border bg-ace-deep px-4 py-4">
      <div className="text-[9px] font-black tracking-[0.18em] text-ace-text-muted">{metricLabel}</div>
      <div className="mt-2 text-xl font-black text-ace-text">{value}</div>
    </div>
  );
}

function MiniRoute({ href, icon, title, body, value }: { href: string; icon: string; title: string; body: string; value: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-2xl border border-ace-border bg-ace-surface p-4 transition hover:border-ace-accent/30 hover:bg-ace-raised">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ace-raised text-xl">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="font-black text-ace-text">{title}</div>
        <div className="mt-0.5 text-xs text-ace-text-muted">{body}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] text-ace-text-muted">{value}</div>
        <div className="mt-1 font-black text-ace-accent transition group-hover:translate-x-0.5">→</div>
      </div>
    </Link>
  );
}
