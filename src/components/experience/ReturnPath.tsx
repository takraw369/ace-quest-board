'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { loadOnboardingProfile } from '@/lib/onboarding';
import { fetchReturnState, startReturn, type ReturnState } from '@/lib/returnTrace';
import { type PwaBootstrap } from '@/lib/pwa';

function durationLabel(seconds: number | null) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}秒`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}時間${rest}分` : `${hours}時間`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days}日${restHours}時間` : `${days}日`;
}

function elapsedSince(value: string) {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'いま';
  return durationLabel(Math.round(ms / 1000));
}

export default function ReturnPath({ data }: { data: PwaBootstrap }) {
  const [state, setState] = useState<ReturnState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const consented = useMemo(() => loadOnboardingProfile().dataUseAccepted, []);

  useEffect(() => {
    if (!consented) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    void fetchReturnState(data)
      .then((next) => { if (!cancelled) setState(next); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [consented, data.session_token]);

  const begin = async () => {
    setBusy(true);
    setError(false);
    try {
      setState(await startReturn(data));
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  if (!consented) {
    return (
      <section className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.02] p-4">
        <p className="text-[9px] font-bold uppercase tracking-[0.20em] text-[#6f776f]">RETURN PATH</p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#b1b7b0]">止まった時の「戻り方」も、育てられる。</p>
            <p className="mt-1 text-[11px] leading-5 text-[#676e68]">Start Gateで記録利用を確認すると、Return Traceを残せます。</p>
          </div>
          <Link href="/onboarding" className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold text-[#929992]">START GATE →</Link>
        </div>
      </section>
    );
  }

  if (!loaded) return null;

  if (state?.active) {
    return (
      <section data-testid="return-path-active" className="ace-unlock-rise mt-5 overflow-hidden rounded-[28px] border border-[#789581]/30 bg-[#789581]/[0.075] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#a9c0af]">RETURN PATH · OPEN</p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-[#eee8dc]">戻る1mmを、ひとつ。</h2>
          </div>
          <span className="rounded-full border border-[#789581]/30 bg-black/15 px-3 py-1.5 text-[10px] font-bold text-[#a9c0af]">{elapsedSince(state.active.started_at)}</span>
        </div>
        <p className="mt-3 text-sm leading-7 text-[#9da69e]">止まったと気づいて「戻る」と選んだ時点から、Returnは始まっています。大きく取り戻さなくていい。</p>
        <Link href="/quest-router?source=return&minutes=3&attention=light" className="mt-5 flex w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813]">
          3分の戻るQuestを選ぶ →
        </Link>
        <p className="mt-3 text-center text-[10px] leading-5 text-[#778078]">Questを1つ終えた瞬間をReturn Eventとして記録します。</p>
      </section>
    );
  }

  return (
    <section data-testid="return-path-idle" className="mt-5 rounded-[26px] border border-white/8 bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.20em] text-[#6f776f]">RETURN PATH</p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-[#ddd7ca]">ちょっと、流れ止まってる？</h2>
          <p className="mt-2 text-xs leading-6 text-[#7e857e]">連続記録を守るより、「戻れる」を増やす。</p>
        </div>
        {state && state.metrics.return_count > 0 && (
          <div className="shrink-0 text-right">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#626963]">RETURN TRACE</p>
            <p className="mt-1 font-serif text-xl text-[#d9c18d]">{state.metrics.return_count}</p>
            <p className="text-[9px] text-[#6f776f]">戻れた回数</p>
          </div>
        )}
      </div>

      {state && state.metrics.return_count > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/6 pt-4 text-xs">
          <div className="rounded-2xl bg-black/15 p-3"><p className="text-[9px] text-[#646b65]">前回戻るまで</p><p className="mt-1 font-semibold text-[#aeb5ad]">{durationLabel(state.metrics.last_latency_seconds)}</p></div>
          <div className="rounded-2xl bg-black/15 p-3"><p className="text-[9px] text-[#646b65]">これまでの中央</p><p className="mt-1 font-semibold text-[#aeb5ad]">{durationLabel(state.metrics.median_latency_seconds)}</p></div>
        </div>
      )}

      <button type="button" disabled={busy} onClick={() => void begin()} className="mt-4 w-full rounded-full border border-[#789581]/25 bg-[#789581]/10 px-5 py-3 text-xs font-semibold text-[#a9c0af] disabled:opacity-50">
        {busy ? 'RETURN PATHを開いています…' : '戻るモードを始める →'}
      </button>
      {error && <p className="mt-2 text-center text-[10px] text-[#a97f76]">Return Traceを同期できませんでした。Questや他の記録には影響しません。</p>}
    </section>
  );
}
