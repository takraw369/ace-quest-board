"use client";

import { useEffect, useState } from "react";
import AccountMeClient from "@/components/me/AccountMeClient";
import PwaMeClient from "@/components/pwa/MeClient";
import { beginGoogleLogin, getCurrentIdentity } from "@/lib/auth/supabaseAuth";
import { loadBootstrap, sessionIsUsable } from "@/lib/pwa";

type Mode = "checking" | "account" | "pwa" | "entry";

export default function MeHubClient() {
  const [mode, setMode] = useState<Mode>("checking");

  useEffect(() => {
    let cancelled = false;

    void getCurrentIdentity()
      .then((identity) => {
        if (cancelled) return;
        if (identity) {
          setMode("account");
          return;
        }
        const bootstrap = loadBootstrap();
        setMode(sessionIsUsable(bootstrap) ? "pwa" : "entry");
      })
      .catch(() => {
        if (cancelled) return;
        const bootstrap = loadBootstrap();
        setMode(sessionIsUsable(bootstrap) ? "pwa" : "entry");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "checking") {
    return (
      <main className="ace-theme-active grid min-h-screen place-items-center bg-ace-bg px-6 text-ace-text">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-ace-accent" />
          <p className="mt-5 text-xs font-black tracking-[0.2em] text-ace-text-muted">ME LOADING</p>
        </div>
      </main>
    );
  }

  if (mode === "account") return <AccountMeClient />;
  if (mode === "pwa") return <PwaMeClient />;

  return (
    <main className="ace-theme-active min-h-screen bg-ace-bg px-5 py-16 text-ace-text">
      <section className="mx-auto max-w-md rounded-[28px] border border-ace-border bg-ace-surface p-7 shadow-2xl shadow-black/30">
        <div className="text-[10px] font-black tracking-[0.28em] text-ace-accent">ACE / ME</div>
        <h1 className="mt-3 text-3xl font-black tracking-tight">自分のACEにつなぐ</h1>
        <p className="mt-3 text-sm leading-7 text-ace-text-muted">
          個人の現在地・Quest・Learn・Evidenceは、これからすべて /me に集約します。
        </p>
        <button
          type="button"
          onClick={() => beginGoogleLogin("/me")}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-ace-accent px-5 py-4 font-black text-[#050d18]"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-[#4285F4]">G</span>
          Googleでつなぐ
        </button>
        <a
          href="/connect/line"
          className="mt-3 flex w-full items-center justify-center rounded-2xl border border-ace-border px-5 py-4 font-bold text-ace-text-secondary transition hover:bg-ace-raised"
        >
          LINEとつなぐ
        </a>
        <p className="mt-5 text-xs leading-6 text-ace-text-muted">
          管理・戦略・運営はここには置きません。MASAの管理面は masahiroyamada.com/dashboard のみです。
        </p>
      </section>
    </main>
  );
}
