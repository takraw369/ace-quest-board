"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentIdentity } from "@/lib/auth/supabaseAuth";

export default function VoiceInboxLink() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getCurrentIdentity()
      .then((identity) => {
        if (!cancelled) setIsAdmin(identity?.role === "admin");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <section className="ace-theme-active bg-ace-bg px-4 pt-3 text-ace-text sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/my-ace/voice"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-ace-accent/25 bg-ace-surface px-4 py-3 transition hover:border-ace-accent/45 hover:bg-ace-raised"
        >
          <span>
            <strong className="text-sm text-ace-accent-soft">VOICE INBOX</strong>
            <span className="ml-2 text-xs text-ace-text-muted">顧客の声 → 改善 / Case / Content / 商品</span>
          </span>
          <span className="font-black text-ace-accent transition group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </section>
  );
}
