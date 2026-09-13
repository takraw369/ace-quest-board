'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { loadBootstrap, sessionIsUsable, type PwaBootstrap } from '@/lib/pwa';
import {
  AGE_BANDS,
  DEFAULT_ONBOARDING_PROFILE,
  loadOnboardingProfile,
  saveOnboardingProfile,
  TIME_OPTIONS,
  type AceOnboardingProfile,
} from '@/lib/onboarding';

function Gate({
  index,
  eyebrow,
  title,
  body,
  done,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  done?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className={`rounded-[28px] border p-5 ${done ? 'border-[#789581]/30 bg-[#789581]/[0.07]' : 'border-white/10 bg-white/[0.025]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">{index} · {eyebrow}</p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-[#eee8dc]">{title}</h2>
        </div>
        {done && <span className="rounded-full border border-[#789581]/30 bg-[#789581]/10 px-3 py-1 text-[10px] font-bold text-[#a9c0af]">READY</span>}
      </div>
      <p className="mt-3 text-sm leading-7 text-[#969d96]">{body}</p>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}

export default function OnboardingClient() {
  const [bootstrap, setBootstrap] = useState<PwaBootstrap | null>(null);
  const [profile, setProfile] = useState<AceOnboardingProfile>(DEFAULT_ONBOARDING_PROFILE);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setBootstrap(loadBootstrap());
    const stored = loadOnboardingProfile();
    setProfile(stored);
    setSaved(Boolean(stored.updatedAt && stored.ageBand && stored.dataUseAccepted));
    setLoaded(true);
  }, []);

  const connected = sessionIsUsable(bootstrap);
  const calibrated = Boolean(bootstrap?.ace?.scores && bootstrap?.ace?.result_axis);
  const canSave = Boolean(profile.ageBand && profile.dataUseAccepted);

  const questHref = useMemo(() => {
    const params = new URLSearchParams({
      source: 'onboarding',
      age: profile.ageBand,
      minutes: String(profile.timeBudgetMinutes),
      attention: profile.attentionLevel,
    });
    if (profile.direction.trim()) params.set('direction', profile.direction.trim());
    return `/quest-router?${params.toString()}`;
  }, [profile]);

  const update = <K extends keyof AceOnboardingProfile>(key: K, value: AceOnboardingProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setMessage('');
  };

  const saveCharacter = () => {
    if (!profile.ageBand) {
      setMessage('今の年代・段階を1つ選んでください。');
      return;
    }
    if (!profile.dataUseAccepted) {
      setMessage('入力データの使い方を確認してください。');
      return;
    }
    const next = { ...profile, updatedAt: new Date().toISOString() };
    saveOnboardingProfile(next);
    setProfile(next);
    setSaved(true);
    setMessage('現在地を保存しました。次は本人接続か、最初のQuestへ進めます。');
  };

  if (!loaded) {
    return <main className="min-h-screen bg-[#090a08] p-6 text-[#e9e1d1]">読み込み中…</main>;
  }

  return (
    <main className="min-h-screen bg-[#090a08] px-4 py-8 text-[#e9e1d1] sm:px-6 sm:py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-56 h-[520px] w-[520px] rounded-full bg-[#789581]/10 blur-[135px]" />
        <div className="absolute -right-48 top-64 h-[460px] w-[460px] rounded-full bg-[#c8ab72]/[0.06] blur-[135px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        <header>
          <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-[#789581]">ACE QUEST · CHARACTER CREATE</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight">強さを決めるのではなく、<br />今いる場所をつくる。</h1>
          <p className="mt-5 text-sm leading-7 text-[#9ba19a]">
            ACE QUESTは人生を採点するゲームではありません。今の状態、行きたい方向、今日使える時間を重ねて、次の小さな実験を選びます。
          </p>
        </header>

        <section className="mt-8 rounded-[30px] border border-[#c8ab72]/20 bg-[#0d100d]/90 p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#d2b97f]">01 · CURRENT CHAPTER</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">今の章を選ぶ</h2>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-[#7d847d]">能力値ではない</span>
          </div>

          <label className="mt-6 block text-xs font-semibold text-[#b5bbb4]">今の年代・段階</label>
          <select
            value={profile.ageBand}
            onChange={(event) => update('ageBand', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#11130f] p-3.5 text-sm text-[#eee8dc] outline-none focus:border-[#789581]/60"
          >
            <option value="">選ぶ</option>
            {AGE_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
          </select>
          <p className="mt-2 text-[11px] leading-5 text-[#697069]">転職・引退・再起など、大きな切替期なら年齢に関係なく「転換・再起期」を選べます。</p>

          <label className="mt-6 block text-xs font-semibold text-[#b5bbb4]">今、どんな方向へ進みたい？</label>
          <textarea
            value={profile.direction}
            onChange={(event) => update('direction', event.target.value)}
            rows={3}
            placeholder="例：心と身体を整えながら、止まっている仕事を少し進めたい"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 outline-none focus:border-[#789581]/60"
          />
          <p className="mt-2 text-[11px] leading-5 text-[#697069]">まだ分からなければ空欄でもOK。分からないことも現在地です。</p>

          <div className="mt-6">
            <p className="text-xs font-semibold text-[#b5bbb4]">今日、使える時間</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {TIME_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => update('timeBudgetMinutes', minutes)}
                  className={`rounded-2xl border py-3 text-xs font-semibold ${profile.timeBudgetMinutes === minutes ? 'border-[#d9c18d] bg-[#d9c18d] text-[#171813]' : 'border-white/10 bg-black/15 text-[#9da29b]'}`}
                >
                  {minutes}分
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#b5bbb4]">今の集中度</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update('attentionLevel', 'light')}
                className={`rounded-2xl border p-4 text-left ${profile.attentionLevel === 'light' ? 'border-[#789581]/60 bg-[#789581]/10' : 'border-white/10 bg-black/15'}`}
              >
                <span className="block text-sm font-semibold">軽く始めたい</span>
                <span className="mt-1 block text-[11px] text-[#7f867f]">Baby Stepから</span>
              </button>
              <button
                type="button"
                onClick={() => update('attentionLevel', 'focused')}
                className={`rounded-2xl border p-4 text-left ${profile.attentionLevel === 'focused' ? 'border-[#789581]/60 bg-[#789581]/10' : 'border-white/10 bg-black/15'}`}
              >
                <span className="block text-sm font-semibold">少し向き合える</span>
                <span className="mt-1 block text-[11px] text-[#7f867f]">Flow / Challengeへ</span>
              </button>
            </div>
          </div>

          <label className="mt-6 flex cursor-pointer gap-3 rounded-2xl border border-white/8 bg-black/15 p-4">
            <input
              type="checkbox"
              checked={profile.dataUseAccepted}
              onChange={(event) => update('dataUseAccepted', event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#789581]"
            />
            <span className="text-xs leading-6 text-[#8f968f]">
              入力した現在地やQuestの記録を、本人向けの推薦・振り返り・FLOWの変化表示に使うことを確認しました。これは医療診断や他人との能力比較には使いません。
            </span>
          </label>

          <button
            type="button"
            onClick={saveCharacter}
            disabled={!canSave}
            className="mt-5 w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saved ? '現在地を保存済み' : 'この現在地から始める'}
          </button>
          {message && <p role="status" className="mt-3 text-center text-xs leading-6 text-[#91a696]">{message}</p>}
        </section>

        <div className="mt-6 space-y-4">
          <Gate
            index="02"
            eyebrow="CONNECT"
            title={connected ? '本人データとつながった' : '本人データとつなぐ'}
            body={connected ? 'LINEの入口とFLOW OSが接続されています。ここからCalibrationとQuestのEvidenceが同じ人の旅として残ります。' : 'LINEは入口と再来訪、FLOW OSはQuest・振り返り・Evidenceの場所として使います。'}
            done={connected}
          >
            {!connected && (
              <Link href="/connect/line?next=/onboarding" className="flex w-full items-center justify-center rounded-full border border-[#d9c18d]/30 bg-[#d9c18d]/10 px-5 py-3 text-sm font-semibold text-[#e2ca94]">
                LINEと接続する
              </Link>
            )}
          </Gate>

          <Gate
            index="03"
            eyebrow="CALIBRATION"
            title={calibrated ? '今の身体・認知・感情・行動を観察済み' : '今の出力を止めている場所を観察する'}
            body={calibrated ? `現在の入口は ${bootstrap?.ace?.result_axis ?? 'ACE'}。固定タイプではなく、今の天気としてQuest選択に使います。` : '約2〜4分。BODY / COGNITION / EMOTION / ACTIONを、他人との比較ではなく今日の個人内比較として観察します。'}
            done={calibrated}
          >
            {!calibrated && (
              <Link href={connected ? '/calibration?next=/onboarding' : '/connect/line?next=/onboarding'} className="flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-[#b7bdb6]">
                {connected ? 'Calibrationをする' : 'LINE接続後にCalibrationへ'}
              </Link>
            )}
          </Gate>

          <Gate
            index="04"
            eyebrow="FIRST QUEST"
            title="正解ではなく、次の実験を選ぶ"
            body="望み・年代/段階・今日使える時間・集中度を重ね、Quest Catalogから最大3つまで候補を絞ります。最終的に選ぶのは自分です。"
            done={false}
          >
            {connected && saved ? (
              <Link href={questHref} className="flex w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813]">
                最初のQuestを選ぶ →
              </Link>
            ) : (
              <p className="rounded-2xl border border-white/8 bg-black/15 p-4 text-center text-xs leading-6 text-[#717871]">
                「現在地を保存」＋「LINE接続」で解放されます。
              </p>
            )}
          </Gate>
        </div>

        <section className="mt-7 rounded-[28px] border border-[#789581]/20 bg-[#789581]/[0.055] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">ACE QUEST RULE</p>
          <p className="mt-3 font-serif text-xl leading-8 text-[#e5ded1]">途切れないことより、戻れること。</p>
          <p className="mt-2 text-xs leading-6 text-[#889089]">Questを休んでも失格にはなりません。Evidenceは「続けた日」だけでなく、止まった理由や戻れた方法を、自分の取扱説明書へ変えていきます。</p>
        </section>

        <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-5 text-xs">
          <Link href="/today" className="text-[#727972]">すでに使っている → Today</Link>
          <span className="text-[#555c56]">ACE / FLOW OS</span>
        </div>
      </div>
    </main>
  );
}
