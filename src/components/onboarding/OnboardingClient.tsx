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

const worldNodes = [
  { x: 120, y: 27 },
  { x: 192, y: 70 },
  { x: 175, y: 157 },
  { x: 65, y: 157 },
  { x: 48, y: 70 },
];

function StartWorld({ awakened }: { awakened: boolean }) {
  return (
    <div className="relative mx-auto h-[250px] w-[250px]" aria-hidden="true">
      <div className="ace-start-halo absolute inset-4 rounded-full bg-[#d9c18d]/[0.045] blur-2xl" />
      <svg viewBox="0 0 240 200" className="relative h-full w-full overflow-visible">
        <circle cx="120" cy="100" r="88" fill="none" stroke="rgba(217,193,141,0.10)" strokeDasharray="2 7" />
        <circle cx="120" cy="100" r="64" fill="none" stroke="rgba(120,149,129,0.16)" />
        <circle cx="120" cy="100" r="42" fill="rgba(120,149,129,0.035)" stroke="rgba(120,149,129,0.18)" />
        {worldNodes.map((node, index) => (
          <g key={`${node.x}-${node.y}`}>
            <line
              x1="120"
              y1="100"
              x2={node.x}
              y2={node.y}
              stroke={awakened ? 'rgba(217,193,141,0.25)' : 'rgba(255,255,255,0.055)'}
              strokeWidth="1"
            />
            <circle
              cx={node.x}
              cy={node.y}
              r={awakened ? 7 : 5}
              fill={awakened ? 'rgba(217,193,141,0.7)' : 'rgba(120,149,129,0.24)'}
              stroke={awakened ? 'rgba(239,222,184,0.8)' : 'rgba(120,149,129,0.32)'}
              className={awakened ? 'ace-world-node' : undefined}
              style={{ animationDelay: `${index * 160}ms` }}
            />
          </g>
        ))}
        <circle
          cx="120"
          cy="100"
          r={awakened ? 29 : 23}
          fill={awakened ? 'rgba(217,193,141,0.15)' : 'rgba(120,149,129,0.08)'}
          stroke={awakened ? 'rgba(217,193,141,0.75)' : 'rgba(120,149,129,0.38)'}
          strokeWidth="1.4"
          className="ace-world-core"
        />
        <circle cx="120" cy="100" r="7" fill={awakened ? '#d9c18d' : '#789581'} opacity="0.94" />
        <text x="120" y="139" textAnchor="middle" fontSize="7" letterSpacing="2.6" fill="rgba(233,225,209,0.55)">
          FLOW CORE
        </text>
      </svg>
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/8 bg-[#090a08]/80 px-3 py-1.5 text-[9px] font-bold tracking-[0.18em] text-[#727972] backdrop-blur-xl">
        {awakened ? 'WORLD SEED · AWAKENED' : 'WORLD 00 · DORMANT'}
      </div>
    </div>
  );
}

function JourneyRail({ saved, connected, calibrated }: { saved: boolean; connected: boolean; calibrated: boolean }) {
  const stages = [
    { key: '01', label: 'CHAPTER', done: saved },
    { key: '02', label: 'CONNECT', done: connected },
    { key: '03', label: 'CALIBRATE', done: calibrated },
    { key: '04', label: 'QUEST', done: false },
  ];

  return (
    <div className="relative mt-7 grid grid-cols-4 gap-1" aria-label="ACE QUEST開始までの道のり">
      <div className="absolute left-[10%] right-[10%] top-3 h-px bg-white/8" />
      {stages.map((stage, index) => {
        const active = stage.done || (index === 0 && !saved) || (index === 1 && saved && !connected) || (index === 2 && connected && !calibrated) || (index === 3 && connected && calibrated);
        return (
          <div key={stage.key} className="relative z-10 text-center">
            <div className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full border text-[8px] font-bold transition-all duration-500 ${stage.done ? 'border-[#d9c18d]/70 bg-[#d9c18d] text-[#171813] shadow-[0_0_22px_rgba(217,193,141,0.22)]' : active ? 'border-[#789581]/70 bg-[#789581]/15 text-[#b6c9ba]' : 'border-white/10 bg-[#090a08] text-[#555c56]'}`}>
              {stage.done ? '✓' : stage.key}
            </div>
            <p className={`mt-2 text-[8px] font-bold tracking-[0.14em] ${active || stage.done ? 'text-[#9fa69f]' : 'text-[#4f554f]'}`}>{stage.label}</p>
          </div>
        );
      })}
    </div>
  );
}

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
    <section className={`relative overflow-hidden rounded-[28px] border p-5 transition-all duration-500 ${done ? 'border-[#789581]/35 bg-[#789581]/[0.075] shadow-[inset_0_0_30px_rgba(120,149,129,0.035)]' : 'border-white/10 bg-white/[0.025]'}`}>
      {done && <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#789581]/10 blur-3xl" />}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">{index} · {eyebrow}</p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-[#eee8dc]">{title}</h2>
        </div>
        {done && <span className="rounded-full border border-[#789581]/30 bg-[#789581]/10 px-3 py-1 text-[9px] font-bold tracking-[0.12em] text-[#a9c0af]">UNLOCKED</span>}
      </div>
      <p className="relative mt-3 text-sm leading-7 text-[#969d96]">{body}</p>
      {children && <div className="relative mt-5">{children}</div>}
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
    setMessage('WORLD SEEDが起動しました。最初の道がひとつ、光りました。');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(18);
  };

  if (!loaded) {
    return <main className="min-h-screen bg-[#090a08] p-6 text-[#e9e1d1]">読み込み中…</main>;
  }

  const nextAction = !connected ? 'CONNECT' : !calibrated ? 'CALIBRATION' : 'FIRST QUEST';

  return (
    <main className="min-h-screen overflow-hidden bg-[#090a08] px-4 py-8 text-[#e9e1d1] sm:px-6 sm:py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ace-start-drift absolute -left-44 -top-56 h-[540px] w-[540px] rounded-full bg-[#789581]/10 blur-[135px]" />
        <div className="ace-start-drift-slow absolute -right-52 top-48 h-[500px] w-[500px] rounded-full bg-[#c8ab72]/[0.07] blur-[145px]" />
        <div className="absolute left-1/2 top-[420px] h-px w-[760px] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#d9c18d]/10 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d9c18d]/15 bg-[#d9c18d]/[0.045] px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d9c18d] shadow-[0_0_12px_rgba(217,193,141,0.7)]" />
            <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-[#cbb98d]">ACE QUEST · START GATE</p>
          </div>

          <StartWorld awakened={saved} />

          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#626a63]">YOUR STORY BEGINS HERE</p>
          <h1 className="mt-3 font-serif text-[38px] font-semibold leading-[1.18] tracking-tight sm:text-5xl">
            まだ何も決まっていない。<br />だから、ここから始められる。
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-[#9ba19a]">
            人生を採点するゲームではない。今いる場所から、最初の1mmを選ぶ。動くたびに地図が生まれ、あなた自身のFLOW WORLDが育っていく。
          </p>

          <JourneyRail saved={saved} connected={connected} calibrated={calibrated} />
        </header>

        {saved && (
          <section className="ace-unlock-rise relative mt-8 overflow-hidden rounded-[30px] border border-[#d9c18d]/30 bg-gradient-to-br from-[#d9c18d]/[0.11] via-[#11120f] to-[#789581]/[0.08] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#d9c18d]/10 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d9c18d]/35 bg-[#d9c18d]/10 text-lg shadow-[0_0_24px_rgba(217,193,141,0.12)]">✦</div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#d9c18d]">WORLD SEED UNLOCKED</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold">最初の道が、光った。</h2>
                <p className="mt-2 text-xs leading-6 text-[#9ca29b]">
                  {profile.ageBand} · {profile.timeBudgetMinutes}分 · {profile.attentionLevel === 'focused' ? 'FLOW / CHALLENGE' : 'BABY STEP'}
                </p>
                <p className="mt-1 text-xs leading-6 text-[#777f78]">次のGate：{nextAction}</p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-[30px] border border-[#c8ab72]/20 bg-[#0d100d]/90 p-5 shadow-2xl shadow-black/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#d2b97f]">01 · SET YOUR COORDINATES</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">最初の座標を決める</h2>
              <p className="mt-2 text-xs leading-6 text-[#727972]">能力を決めるのではなく、「今」を地図に置く。</p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1.5 text-[9px] tracking-[0.08em] text-[#7d847d]">CHAPTER 00</span>
          </div>

          <label className="mt-6 block text-xs font-semibold text-[#b5bbb4]">今の年代・段階</label>
          <select
            value={profile.ageBand}
            onChange={(event) => update('ageBand', event.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#11130f] p-3.5 text-sm text-[#eee8dc] outline-none transition-colors focus:border-[#d9c18d]/50"
          >
            <option value="">今いる章を選ぶ</option>
            {AGE_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
          </select>
          <p className="mt-2 text-[11px] leading-5 text-[#697069]">転職・引退・再起など、大きな切替期なら年齢に関係なく「転換・再起期」を選べます。</p>

          <label className="mt-6 block text-xs font-semibold text-[#b5bbb4]">この先、どんな景色を見たい？</label>
          <textarea
            value={profile.direction}
            onChange={(event) => update('direction', event.target.value)}
            rows={3}
            placeholder="例：心と身体を整えながら、止まっている仕事を少し進めたい"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-7 outline-none transition-colors focus:border-[#d9c18d]/50"
          />
          <p className="mt-2 text-[11px] leading-5 text-[#697069]">まだ分からなくてもOK。「分からない」も、立派な現在地です。</p>

          <div className="mt-6">
            <p className="text-xs font-semibold text-[#b5bbb4]">今日、この冒険に使える時間</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {TIME_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => update('timeBudgetMinutes', minutes)}
                  className={`rounded-2xl border py-3 text-xs font-semibold transition-all duration-300 ${profile.timeBudgetMinutes === minutes ? 'border-[#d9c18d] bg-[#d9c18d] text-[#171813] shadow-[0_0_22px_rgba(217,193,141,0.12)]' : 'border-white/10 bg-black/15 text-[#9da29b] hover:border-white/20'}`}
                >
                  {minutes}分
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#b5bbb4]">今日の進み方</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => update('attentionLevel', 'light')}
                className={`rounded-2xl border p-4 text-left transition-all duration-300 ${profile.attentionLevel === 'light' ? 'border-[#789581]/60 bg-[#789581]/10 shadow-[inset_0_0_22px_rgba(120,149,129,0.04)]' : 'border-white/10 bg-black/15'}`}
              >
                <span className="block text-[9px] font-bold tracking-[0.14em] text-[#789581]">BABY STEP</span>
                <span className="mt-1 block text-sm font-semibold">まず1mm動く</span>
                <span className="mt-1 block text-[11px] text-[#7f867f]">軽く、確実に始める</span>
              </button>
              <button
                type="button"
                onClick={() => update('attentionLevel', 'focused')}
                className={`rounded-2xl border p-4 text-left transition-all duration-300 ${profile.attentionLevel === 'focused' ? 'border-[#d9c18d]/55 bg-[#d9c18d]/[0.08] shadow-[inset_0_0_22px_rgba(217,193,141,0.035)]' : 'border-white/10 bg-black/15'}`}
              >
                <span className="block text-[9px] font-bold tracking-[0.14em] text-[#b9a36f]">FLOW / CHALLENGE</span>
                <span className="mt-1 block text-sm font-semibold">少し先へ進む</span>
                <span className="mt-1 block text-[11px] text-[#7f867f]">今なら少し向き合える</span>
              </button>
            </div>
          </div>

          {profile.ageBand && (
            <div className="mt-5 rounded-2xl border border-[#789581]/15 bg-[#789581]/[0.045] p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#789581]">CURRENT COORDINATES</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                <span className="rounded-full border border-white/8 px-3 py-1.5 text-[#b4bab3]">{profile.ageBand}</span>
                <span className="rounded-full border border-white/8 px-3 py-1.5 text-[#b4bab3]">{profile.timeBudgetMinutes} MIN</span>
                <span className="rounded-full border border-white/8 px-3 py-1.5 text-[#b4bab3]">{profile.attentionLevel === 'focused' ? 'FLOW / CHALLENGE' : 'BABY STEP'}</span>
              </div>
              {profile.direction.trim() && <p className="mt-3 line-clamp-2 text-xs leading-6 text-[#858c85]">→ {profile.direction.trim()}</p>}
            </div>
          )}

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
            className="ace-start-button mt-5 w-full rounded-full border border-[#f0dca9]/30 bg-gradient-to-r from-[#cdb16f] via-[#e0c88e] to-[#cdb16f] px-5 py-4 text-sm font-bold tracking-[0.04em] text-[#171813] shadow-[0_12px_36px_rgba(217,193,141,0.12)] transition-all disabled:cursor-not-allowed disabled:opacity-35"
          >
            {saved ? '✦ WORLD SEED 起動済み' : '✦ WORLD SEEDを起動する'}
          </button>
          {message && <p role="status" className="mt-3 text-center text-xs font-medium leading-6 text-[#a9b8ac]">{message}</p>}
        </section>

        <div className="mt-6 space-y-4">
          <Gate
            index="02"
            eyebrow="CONNECT"
            title={connected ? '旅の記録が、あなたにつながった' : '旅の記録を、あなたにつなぐ'}
            body={connected ? 'LINEの入口とFLOW OSが接続済み。ここからのQuest・振り返り・Evidenceが、同じ旅として積み上がります。' : 'ここから先の冒険を「自分の物語」として残すため、LINEとFLOW OSをつなぎます。'}
            done={connected}
          >
            {!connected && (
              <Link href="/connect/line?next=/onboarding" className="flex w-full items-center justify-center rounded-full border border-[#d9c18d]/30 bg-[#d9c18d]/10 px-5 py-3 text-sm font-semibold text-[#e2ca94] transition hover:bg-[#d9c18d]/15">
                Gate 02を開く · LINE接続 →
              </Link>
            )}
          </Gate>

          <Gate
            index="03"
            eyebrow="CALIBRATION"
            title={calibrated ? '今日の天気が見えた' : '今日の自分の天気を観る'}
            body={calibrated ? `現在の入口は ${bootstrap?.ace?.result_axis ?? 'ACE'}。これは固定タイプではなく、今日どこから始めるとFLOWしやすいかを見るための天気です。` : '約2〜4分。BODY / COGNITION / EMOTION / ACTIONを、他人との比較ではなく今日の個人内比較として観察します。'}
            done={calibrated}
          >
            {!calibrated && (
              <Link href={connected ? '/calibration?next=/onboarding' : '/connect/line?next=/onboarding'} className="flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-[#b7bdb6] transition hover:border-[#789581]/30">
                {connected ? 'Gate 03を開く · Calibration →' : 'まずGate 02を開く'}
              </Link>
            )}
          </Gate>

          <Gate
            index="04"
            eyebrow="FIRST QUEST"
            title="最初のQuestが、待っている"
            body="今の章・行きたい方向・今日使える時間・Calibrationを重ね、Quest Catalogから今のあなたに合う入口を最大3つまで絞ります。選ぶのは、あなたです。"
            done={false}
          >
            {connected && saved ? (
              <Link href={questHref} className="ace-start-button flex w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-bold text-[#171813] shadow-[0_12px_36px_rgba(217,193,141,0.10)]">
                最初のQuestへ →
              </Link>
            ) : (
              <p className="rounded-2xl border border-white/8 bg-black/15 p-4 text-center text-xs leading-6 text-[#717871]">
                WORLD SEED起動＋LINE接続で、このGateが開きます。
              </p>
            )}
          </Gate>
        </div>

        <section className="mt-7 rounded-[28px] border border-[#789581]/20 bg-[#789581]/[0.055] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">WORLD RULE · 01</p>
          <p className="mt-3 font-serif text-xl leading-8 text-[#e5ded1]">途切れないことより、戻れること。</p>
          <p className="mt-2 text-xs leading-6 text-[#889089]">ここでは、休んでも失格になりません。止まった理由も、戻れた方法も、次の自分を助けるEvidenceになります。</p>
        </section>

        <div className="mt-8 flex items-center justify-between border-t border-white/8 pt-5 text-xs">
          <Link href="/today" className="text-[#727972]">すでに旅の途中 → Today</Link>
          <span className="text-[#555c56]">ACE QUEST / FLOW OS</span>
        </div>
      </div>
    </main>
  );
}
