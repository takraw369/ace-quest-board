"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentIdentity, signOut, type AceIdentity } from "@/lib/auth/supabaseAuth";

export default function MyAcePage() {
  const [identity, setIdentity] = useState<AceIdentity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentIdentity()
      .then((current) => {
        if (!current) {
          window.location.replace("/login");
          return;
        }
        setIdentity(current);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <main className="min-h-screen bg-[#07152e] text-white grid place-items-center">ACEを読み込み中…</main>;
  }

  if (!identity) return null;

  const isAdmin = identity.role === "admin";
  const name = identity.displayName || identity.user.email || "Flower";

  return (
    <main className="min-h-screen bg-[#07152e] text-white px-5 py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.28em] text-[#ff9a2f]">MY ACE</div>
            <h1 className="mt-3 text-3xl font-black">{name}</h1>
            <p className="mt-2 text-sm text-blue-100/60">Role: {identity.role}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              window.location.replace("/login");
            }}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-blue-100/70 hover:bg-white/5"
          >
            ログアウト
          </button>
        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-3">
          <Link href="/today" className="rounded-2xl border border-white/10 bg-[#0d2146] p-5 hover:border-[#ff9a2f]/60">
            <div className="text-[#ff9a2f]">⚡ Action</div>
            <div className="mt-2 font-bold">今日の一歩</div>
          </Link>
          <Link href="/quest" className="rounded-2xl border border-white/10 bg-[#0d2146] p-5 hover:border-[#ff9a2f]/60">
            <div className="text-[#ff9a2f]">🗺️ Quest</div>
            <div className="mt-2 font-bold">目的に向かう</div>
          </Link>
          <Link href="/learn" className="rounded-2xl border border-white/10 bg-[#0d2146] p-5 hover:border-[#ff9a2f]/60">
            <div className="text-[#ff9a2f]">📚 Learn</div>
            <div className="mt-2 font-bold">理解を深める</div>
          </Link>
        </section>

        {isAdmin && (
          <section className="rounded-2xl border border-[#ff9a2f]/30 bg-[#0d2146] p-6">
            <div className="text-xs font-semibold tracking-[0.2em] text-[#ff9a2f]">ADMIN</div>
            <h2 className="mt-2 text-xl font-bold">管理者モード</h2>
            <p className="mt-2 text-sm leading-6 text-blue-100/60">
              このアカウントはACE管理者として認識されています。管理コックピットは従来のDashboard側を使います。
            </p>
            <a
              href="https://masahiro-yamada.com/dashboard"
              className="mt-5 inline-flex rounded-xl bg-[#ff8a1f] px-4 py-3 font-bold text-[#07152e]"
            >
              Admin Dashboardへ
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
