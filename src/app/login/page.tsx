"use client";

import { useEffect, useState } from "react";
import {
  beginGoogleLogin,
  consumeOAuthCallback,
  getCurrentIdentity,
  hasOAuthCallbackHash,
} from "@/lib/auth/supabaseAuth";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function boot() {
      try {
        if (hasOAuthCallbackHash()) {
          const returnTo = consumeOAuthCallback();
          window.location.replace(returnTo);
          return;
        }

        const identity = await getCurrentIdentity();
        if (identity) {
          window.location.replace(identity.role === "admin" ? "/my-ace?mode=admin" : "/my-ace");
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "ログイン処理に失敗しました");
      } finally {
        setChecking(false);
      }
    }

    void boot();
  }, []);

  return (
    <main className="min-h-screen bg-[#07152e] text-white flex items-center justify-center px-5 py-16">
      <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0d2146] p-7 shadow-2xl shadow-black/30">
        <div className="mb-8">
          <div className="text-xs font-semibold tracking-[0.28em] text-[#ff9a2f]">ACE / FLOW OS</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight">自分のACEに入る</h1>
          <p className="mt-3 text-sm leading-7 text-blue-100/70">
            Quest、Learn、今日の一歩、成長記録をひとつのアカウントに繋げます。
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={checking}
          onClick={() => beginGoogleLogin("/my-ace")}
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#ff8a1f] px-5 py-4 font-bold text-[#07152e] transition hover:bg-[#ffa247] disabled:cursor-wait disabled:opacity-60"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-sm font-black text-[#4285F4]">G</span>
          {checking ? "ログイン状態を確認中…" : "Googleでログイン"}
        </button>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4 text-xs leading-6 text-blue-100/60">
          初回ログイン時はFlowerとして登録されます。管理者・Coach権限はACE側で付与します。
        </div>
      </section>
    </main>
  );
}
