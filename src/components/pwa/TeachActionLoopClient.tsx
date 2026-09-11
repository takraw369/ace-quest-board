'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { loadBootstrap, PwaBootstrap, sessionIsUsable, SUPABASE_URL } from '@/lib/pwa';

type CompletionResult = {
  ok?: boolean;
  duplicate?: boolean;
  event?: string;
  completion_rule?: string;
  completed_at?: string;
  xp?: {
    xp_amount?: number;
    reason?: string;
  } | null;
  progress?: {
    xp_total?: number;
    growth_level?: number;
    growth_rank?: string;
    education_completed?: number;
  } | null;
  error?: string;
};

const TALK_OPTIONS = [
  'パートナー',
  '家族',
  '友人',
  '仕事仲間',
  'SNS',
  '聞かれて話した',
  'その他',
] as const;

function makeLearningKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `learn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function TeachActionLoopClient() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [learningKey, setLearningKey] = useState('');
  const [learningTitle, setLearningTitle] = useState('');
  const [teachTo, setTeachTo] = useState('');
  const [teachNote, setTeachNote] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(loadBootstrap());
    setLearningKey(makeLearningKey());
  }, []);

  const talkReady = teachTo.trim().length > 0;
  const actionReady = actionTaken.trim().length > 0;
  const titleReady = learningTitle.trim().length > 0;
  const canSubmit = titleReady && talkReady && actionReady && !submitting;

  const statusText = useMemo(() => {
    if (result?.ok) return '完了';
    if (canSubmit) return '記録できる';
    if (talkReady || actionReady || titleReady) return 'あと少し';
    return '気軽にどうぞ';
  }, [actionReady, canSubmit, result?.ok, talkReady, titleReady]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !sessionIsUsable(data) || !canSubmit) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/pwa-teach-action-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: data.session_token,
          learning_key: learningKey,
          learning_title: learningTitle,
          teach_to: teachTo,
          teach_note: teachNote,
          action_taken: actionTaken,
          reflection,
        }),
      });
      const payload = await response.json().catch(() => ({})) as CompletionResult;
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? `http_${response.status}`);
      setResult(payload);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'teach_action_completion_failed';
      setError(message === 'invalid_or_expired_session'
        ? 'セッションの有効期限が切れています。LINEからFLOW OSを開き直してください。'
        : '記録に失敗しました。通信を確認して、もう一度試してください。');
    } finally {
      setSubmitting(false);
    }
  }

  if (!data?.ok || !sessionIsUsable(data)) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]">
        <div className="mx-auto max-w-md">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">48H LEARNING LOOP</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">LINEと接続して記録する</h1>
          <p className="mt-4 text-sm leading-7 text-[#939a92]">誰かに話したことと、1つ試したことを本人データにつないで、ACEの学習完了として残します。</p>
          <Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続</Link>
        </div>
        <PwaNav />
      </main>
    );
  }

  if (result?.ok) {
    const xpAmount = result.xp?.xp_amount ?? 12;
    return (
      <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-10 text-[#e9e1d1] sm:px-6">
        <div className="mx-auto max-w-xl">
          <section className="rounded-[32px] border border-[#d9c18d]/30 bg-[#d9c18d]/[0.07] p-7 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d9c18d]">ACE COMPLETE</p>
            <h1 className="mt-4 font-serif text-4xl font-semibold">学びが、現実につながった。</h1>
            <p className="mt-4 text-sm leading-7 text-[#aeb5ad]">誰かに話したことと、実際に1つ試したことを学習完了として記録しました。</p>
            <div className="mx-auto mt-7 flex max-w-xs items-center justify-center gap-3">
              <span className="rounded-full border border-[#d9c18d]/30 px-4 py-2 text-xs font-bold text-[#d9c18d]">+{xpAmount} XP</span>
              {result.progress?.education_completed != null && (
                <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-[#aeb5ad]">Education {result.progress.education_completed}</span>
              )}
            </div>
          </section>

          <section className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.025] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">IF YOU WANT</p>
            <h2 className="mt-3 font-serif text-2xl font-semibold">もう一度、誰かに話せたら。</h2>
            <p className="mt-3 text-sm leading-7 text-[#9da29b]">試して分かったことまで混ぜて話すと、学びはさらに自分の言葉になります。これは今は必須ではありません。</p>
          </section>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/learn" className="flex items-center justify-center rounded-full border border-white/10 px-5 py-4 text-sm font-semibold text-[#b8bdb7]">学びに戻る</Link>
            <Link href="/today" className="flex items-center justify-center rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-semibold text-[#171813]">今日のFLOWへ</Link>
          </div>
        </div>
        <PwaNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">48H LEARNING LOOP</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">誰かに話す。1つ試す。</h1>
          </div>
          <span className="shrink-0 rounded-full border border-[#789581]/25 bg-[#789581]/[0.07] px-3 py-2 text-[9px] font-bold tracking-[0.08em] text-[#9ab0a0]">{statusText}</span>
        </div>

        <p className="mt-3 text-sm leading-6 text-[#9da29b]">学びを現実へ流したら、短く残す。それだけでOKです。</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <section className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5">
            <label className="block">
              <span className="text-xs font-semibold text-[#e2dccf]">今回の学びを一言 *</span>
              <textarea
                value={learningTitle}
                onChange={(event) => setLearningTitle(event.target.value)}
                maxLength={240}
                rows={2}
                placeholder="例：守りたい時間を先に置く"
                className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-[#eee8dc] outline-none placeholder:text-[#626862] focus:border-[#d9c18d]/40"
              />
            </label>
          </section>

          <section className="rounded-[24px] border border-[#789581]/20 bg-[#789581]/[0.05] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#d8ded7]">誰かに話した？ *</h2>
              {talkReady && <span className="text-[10px] font-bold text-[#9ab0a0]">✓</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {TALK_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={teachTo === option}
                  onClick={() => setTeachTo(option)}
                  className={`rounded-full border px-3 py-2 text-xs transition ${
                    teachTo === option
                      ? 'border-[#789581]/60 bg-[#789581]/20 text-[#dce6df]'
                      : 'border-white/10 bg-black/10 text-[#9da29b] hover:border-white/20'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#c8ab72]/15 bg-[#c8ab72]/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[#e2dccf]">何か1つ試した？ *</h2>
              {actionReady && <span className="text-[10px] font-bold text-[#d2b97f]">✓</span>}
            </div>
            <textarea
              value={actionTaken}
              onChange={(event) => setActionTaken(event.target.value)}
              maxLength={500}
              rows={2}
              placeholder="例：家族時間を先に固定して予定を組み直した"
              className="mt-3 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-[#eee8dc] outline-none placeholder:text-[#626862] focus:border-[#d9c18d]/40"
            />
          </section>

          <details className="rounded-[20px] border border-white/8 bg-white/[0.015] px-4 py-3 text-[#8d948d]">
            <summary className="cursor-pointer text-xs font-semibold">気づきも残す（任意）</summary>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs">話して気づいたこと</span>
                <textarea
                  value={teachNote}
                  onChange={(event) => setTeachNote(event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="話してみて初めて気づいたことがあれば"
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-[#eee8dc] outline-none placeholder:text-[#626862] focus:border-[#789581]/50"
                />
              </label>
              <label className="block">
                <span className="text-xs">試して気づいたこと</span>
                <textarea
                  value={reflection}
                  onChange={(event) => setReflection(event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="やる前と後で変わったことがあれば"
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-[#eee8dc] outline-none placeholder:text-[#626862] focus:border-[#d9c18d]/40"
                />
              </label>
            </div>
          </details>

          {error && <p className="rounded-2xl border border-[#c98f83]/25 bg-[#c98f83]/[0.06] px-4 py-3 text-sm leading-6 text-[#d6aaa1]">{error}</p>}

          <button type="submit" disabled={!canSubmit} className="flex w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-bold text-[#171813] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35">
            {submitting ? '記録中…' : '話した＋試したを記録'}
          </button>
          <p className="text-center text-[11px] leading-5 text-[#747a74]">裏側ではこれまで通り、話した記録と行動した記録の両方を学習完了の条件として扱います。</p>
        </form>
      </div>
      <PwaNav />
    </main>
  );
}
