'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ALL_C_OPTIONS,
  DEFAULT_C_CHOICE_STATE,
  MORE_C_OPTIONS,
  PRIMARY_C_OPTIONS,
  REASON_CLUSTERS,
  findCOption,
  isCKey,
  loadCChoiceState,
  saveCChoiceState,
  sendCChoiceAction,
  type CChoiceState,
  type CKey,
  type ReasonCluster,
} from '@/lib/cChoice';
import { loadBootstrap, sessionIsUsable, type PwaBootstrap } from '@/lib/pwa';

type Step = 0 | 1 | 2 | 3 | 4 | 5;

function Progress({ step }: { step: Step }) {
  const progress = Math.max(0, Math.min(100, (step / 5) * 100));
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#687169]">
        <span>C-Choice</span>
        <span>{step === 0 ? 'START' : String(step) + '/5'}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#789581] via-[#b0b99c] to-[#d9c18d] transition-[width] duration-500"
          style={{ width: String(progress) + '%' }}
        />
      </div>
    </div>
  );
}

function OptionCard({
  option,
  selected,
  onClick,
  compact = false,
}: {
  option: (typeof ALL_C_OPTIONS)[number];
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={'min-w-0 rounded-[22px] border text-left transition-all duration-200 ' +
        (compact ? 'p-3.5 ' : 'p-4 ') +
        (selected
          ? 'border-[#d9c18d]/65 bg-[#d9c18d]/[0.11] shadow-[0_12px_30px_rgba(217,193,141,0.08)]'
          : 'border-white/9 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.04]')}
      aria-pressed={selected}
    >
      <span className={'block break-words font-serif font-semibold text-[#eee8dc] ' + (compact ? 'text-base' : 'text-lg')}>
        {option.label}
      </span>
      <span className="mt-1 block break-words text-[11px] leading-5 text-[#8d968e]">{option.jp}</span>
    </button>
  );
}

function remoteStateIntoLocal(current: CChoiceState, remote: Record<string, unknown> | null | undefined): CChoiceState {
  if (!remote || !isCKey(remote.current_c)) return current;
  const selectedAt = typeof remote.selected_at === 'string' ? remote.selected_at : null;
  const localTime = current.selectedAt ? new Date(current.selectedAt).getTime() : 0;
  const remoteTime = selectedAt ? new Date(selectedAt).getTime() : 0;
  if (localTime > remoteTime) return current;

  const candidates = Array.isArray(remote.candidates)
    ? remote.candidates.filter(isCKey).slice(0, 3)
    : [remote.current_c];

  const reasonCluster = typeof remote.reason_cluster === 'string'
    && REASON_CLUSTERS.some((cluster) => cluster.key === remote.reason_cluster)
    ? remote.reason_cluster as ReasonCluster
    : null;

  return {
    ...current,
    candidates: candidates.length > 0 ? candidates : [remote.current_c],
    currentC: remote.current_c,
    reasonText: typeof remote.reason_text === 'string' ? remote.reason_text : current.reasonText,
    reasonCluster,
    desiredChangeText: typeof remote.desired_change_text === 'string'
      ? remote.desired_change_text
      : current.desiredChangeText,
    reflectionText: typeof remote.reflection_text === 'string' ? remote.reflection_text : current.reflectionText,
    selectedAt,
    firstQuestStartedAt: typeof remote.first_quest_started_at === 'string'
      ? remote.first_quest_started_at
      : current.firstQuestStartedAt,
    firstQuestCompletedAt: typeof remote.first_quest_completed_at === 'string'
      ? remote.first_quest_completed_at
      : current.firstQuestCompletedAt,
    updatedAt: selectedAt ?? current.updatedAt,
  };
}

export default function CChoiceClient() {
  const [state, setState] = useState<CChoiceState>(DEFAULT_C_CHOICE_STATE);
  const [bootstrap, setBootstrap] = useState<PwaBootstrap | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [showMore, setShowMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [source, setSource] = useState('ace');

  useEffect(() => {
    const local = loadCChoiceState();
    const data = loadBootstrap();
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('source')?.slice(0, 40) || 'ace';

    setState(local);
    setBootstrap(data);
    setSource(sourceParam);
    if (local.currentC && local.selectedAt) setStep(5);
    setLoaded(true);

    if (sessionIsUsable(data)) {
      void sendCChoiceAction('get_state', local, { bootstrap: data, source: sourceParam })
        .then((result) => {
          const merged = remoteStateIntoLocal(local, result?.choice ?? null);
          setState(merged);
          saveCChoiceState(merged);
          if (merged.currentC && merged.selectedAt) setStep(5);
        })
        .catch(() => {
          // Local state remains usable if remote sync is temporarily unavailable.
        });
    }
  }, []);

  const connected = sessionIsUsable(bootstrap);
  const currentOption = useMemo(() => findCOption(state.currentC), [state.currentC]);

  const updateState = (patch: Partial<CChoiceState>) => {
    setState((current) => {
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      saveCChoiceState(next);
      return next;
    });
    setNotice('');
  };

  const start = async () => {
    setStep(1);
    if (!connected) return;
    try {
      await sendCChoiceAction('choice_started', state, { bootstrap, source });
    } catch {
      // Starting the experience should never be blocked by analytics.
    }
  };

  const toggleCandidate = (key: CKey) => {
    const exists = state.candidates.includes(key);
    if (exists) {
      const next = state.candidates.filter((item) => item !== key);
      updateState({
        candidates: next,
        currentC: state.currentC === key ? null : state.currentC,
      });
      return;
    }
    if (state.candidates.length >= 3) {
      setNotice('気になるCは、まず3つまで。いま心が動くものを残してみて。');
      return;
    }
    updateState({ candidates: [...state.candidates, key] });
  };

  const chooseCurrent = (key: CKey) => {
    updateState({ currentC: key });
  };

  const completeChoice = async () => {
    if (!state.currentC || !state.reasonText.trim()) {
      setNotice('「なぜ今そのCなのか」を、短くてもいいので書いてみて。');
      return;
    }

    const next: CChoiceState = {
      ...state,
      reasonText: state.reasonText.trim(),
      desiredChangeText: state.desiredChangeText.trim(),
      selectedAt: new Date().toISOString(),
      firstQuestStartedAt: null,
      firstQuestCompletedAt: null,
      reflectionText: '',
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    saveCChoiceState(next);
    setSaving(true);
    setNotice('');

    if (connected) {
      try {
        await sendCChoiceAction('choice_completed', next, { bootstrap, source });
        setNotice('今のCを、ACEの旅に保存しました。');
      } catch {
        setNotice('端末には保存済み。通信が戻ったら、もう一度保存できます。');
      }
    } else {
      setNotice('端末には保存済み。LINEとつなぐと、ACEの旅にも残せます。');
    }

    setSaving(false);
    setStep(5);
  };

  const startQuest = async () => {
    const next = {
      ...state,
      firstQuestStartedAt: state.firstQuestStartedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    saveCChoiceState(next);

    if (connected) {
      try {
        await sendCChoiceAction('first_quest_started', next, { bootstrap, source });
      } catch {
        // The quest itself stays usable offline.
      }
    }
  };

  const completeQuest = async () => {
    const next = {
      ...state,
      firstQuestStartedAt: state.firstQuestStartedAt ?? new Date().toISOString(),
      firstQuestCompletedAt: new Date().toISOString(),
      reflectionText: state.reflectionText.trim(),
      updatedAt: new Date().toISOString(),
    };
    setState(next);
    saveCChoiceState(next);
    setSaving(true);

    if (connected) {
      try {
        await sendCChoiceAction('first_quest_completed', next, { bootstrap, source });
        setNotice('First Quest完了。Cが「選択」から「体験」に変わった。');
      } catch {
        setNotice('完了は端末に保存済み。ACEへの同期だけ後で再実行できます。');
      }
    } else {
      setNotice('First Quest完了。LINE接続後にACEの旅へ同期できます。');
    }
    setSaving(false);
  };

  const retrySync = async () => {
    if (!connected || !state.currentC || !state.selectedAt) return;
    setSaving(true);
    try {
      await sendCChoiceAction('choice_completed', state, { bootstrap, source });
      if (state.firstQuestStartedAt) {
        await sendCChoiceAction('first_quest_started', state, { bootstrap, source });
      }
      if (state.firstQuestCompletedAt) {
        await sendCChoiceAction('first_quest_completed', state, { bootstrap, source });
      }
      setNotice('ACEの旅へ同期しました。');
    } catch {
      setNotice('まだ同期できませんでした。接続状態を確認して、もう一度試してみて。');
    }
    setSaving(false);
  };

  const restart = () => {
    updateState({
      candidates: [],
      currentC: null,
      reasonText: '',
      reasonCluster: null,
      desiredChangeText: '',
      reflectionText: '',
      selectedAt: null,
      firstQuestStartedAt: null,
      firstQuestCompletedAt: null,
    });
    setShowMore(false);
    setStep(1);
  };

  if (!loaded) {
    return <main className="min-h-screen bg-[#090a08] p-6 text-[#e9e1d1]">読み込み中…</main>;
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#090a08] px-4 pb-16 pt-[max(24px,env(safe-area-inset-top))] text-[#e9e1d1] sm:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-56 h-[520px] w-[520px] rounded-full bg-[#789581]/10 blur-[135px]" />
        <div className="absolute -right-52 top-48 h-[520px] w-[520px] rounded-full bg-[#d9c18d]/[0.07] blur-[145px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-xl min-w-0">
        <Progress step={step} />

        {step === 0 && (
          <section className="flex min-h-[70vh] flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#789581]">ACE · C-CHOICE</p>
            <h1 className="mt-4 break-words font-serif text-[42px] font-semibold leading-[1.12] tracking-tight text-[#eee8dc] sm:text-6xl">
              人生に、<span className="text-[#d9c18d]">C</span>は足りてる？
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-8 text-[#9aa19a]">
              答えを探す前に、いまの自分の心がどこへ動いているかを見つける。
              ここでは、あなたをタイプ分けしません。今、選びたいCを選びます。
            </p>

            <div className="mt-8 grid grid-cols-2 gap-2 text-center text-[11px] text-[#7f877f] sm:grid-cols-4">
              {['Curiosity', 'Challenge', 'Creation', 'Connection'].map((label) => (
                <div key={label} className="min-w-0 rounded-full border border-white/8 px-3 py-2.5 break-words">{label}</div>
              ))}
            </div>

            <button
              type="button"
              onClick={start}
              className="mt-10 min-h-12 w-full rounded-full bg-[#d9c18d] px-5 py-4 text-[15px] font-bold text-[#171813] shadow-[0_16px_44px_rgba(217,193,141,0.13)]"
            >
              今のCを選ぶ
            </button>
            <p className="mt-3 text-center text-[11px] text-[#626a63]">約60秒 · Cはあとで何度でも選び直せます</p>
          </section>
        )}

        {step === 1 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">01 · FEEL</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight">いま、ちょっと気になるCは？</h1>
            <p className="mt-3 text-sm leading-7 text-[#929a92]">考えすぎず、最大3つ。意味より「なんか気になる」でOK。</p>

            <div className="mt-6 grid min-w-0 grid-cols-2 gap-2.5">
              {PRIMARY_C_OPTIONS.map((option) => (
                <OptionCard
                  key={option.key}
                  option={option}
                  selected={state.candidates.includes(option.key)}
                  onClick={() => toggleCandidate(option.key)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowMore((current) => !current)}
              className="mt-4 min-h-11 w-full rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-[#9ca39c]"
            >
              {showMore ? '追加のCを閉じる' : 'もっとCを見る'}
            </button>

            {showMore && (
              <div className="mt-3 grid min-w-0 grid-cols-2 gap-2">
                {MORE_C_OPTIONS.map((option) => (
                  <OptionCard
                    key={option.key}
                    option={option}
                    compact
                    selected={state.candidates.includes(option.key)}
                    onClick={() => toggleCandidate(option.key)}
                  />
                ))}
              </div>
            )}

            {notice && <p role="status" className="mt-4 text-center text-xs leading-6 text-[#d2ba84]">{notice}</p>}

            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={state.candidates.length === 0}
              className="mt-6 min-h-12 w-full rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-bold text-[#171813] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {state.candidates.length > 0 ? String(state.candidates.length) + 'つから、今の1つを選ぶ' : '気になるCを選んでください'}
            </button>
          </section>
        )}

        {step === 2 && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">02 · CHOOSE</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight">その中で、今いちばん選びたいCは？</h1>
            <p className="mt-3 text-sm leading-7 text-[#929a92]">正解はありません。明日変わってもOK。</p>

            <div className="mt-6 space-y-3">
              {state.candidates.map((key) => {
                const option = findCOption(key);
                if (!option) return null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => chooseCurrent(key)}
                    className={'flex min-h-16 w-full min-w-0 items-center justify-between gap-4 rounded-[22px] border p-4 text-left ' +
                      (state.currentC === key
                        ? 'border-[#d9c18d]/70 bg-[#d9c18d]/[0.1]'
                        : 'border-white/9 bg-white/[0.025]')}
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-serif text-xl font-semibold">{option.label}</span>
                      <span className="mt-1 block break-words text-xs text-[#8f968f]">{option.jp}</span>
                    </span>
                    <span className={'grid h-7 w-7 shrink-0 place-items-center rounded-full border ' +
                      (state.currentC === key ? 'border-[#d9c18d] bg-[#d9c18d] text-[#171813]' : 'border-white/15')}>
                      {state.currentC === key ? '✓' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!state.currentC}
              className="mt-7 min-h-12 w-full rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-bold text-[#171813] disabled:opacity-30"
            >
              このCで進む
            </button>
            <button type="button" onClick={() => setStep(1)} className="mt-2 min-h-11 w-full text-sm text-[#747c75]">← 選び直す</button>
          </section>
        )}

        {step === 3 && currentOption && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">03 · WHY NOW</p>
            <div className="mt-4 rounded-[24px] border border-[#d9c18d]/25 bg-[#d9c18d]/[0.06] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#b7a375]">CURRENT C</p>
              <p className="mt-1 font-serif text-3xl font-semibold text-[#e9ddbf]">{currentOption.label}</p>
              <p className="mt-1 text-xs text-[#8f968f]">{currentOption.jp}</p>
            </div>

            <label className="mt-7 block font-serif text-2xl font-semibold">なぜ、今そのCを選びましたか？</label>
            <p className="mt-2 text-sm leading-7 text-[#8d958e]">1行でもOK。きれいにまとめなくて大丈夫。</p>
            <textarea
              value={state.reasonText}
              onChange={(event) => updateState({ reasonText: event.target.value.slice(0, 1000) })}
              rows={5}
              placeholder="例：ずっと止まっていたことに、そろそろ挑みたいと思ったから"
              className="mt-4 w-full min-w-0 rounded-[22px] border border-white/10 bg-white/[0.025] p-4 text-base leading-7 text-[#eee8dc] outline-none placeholder:text-[#555d56] focus:border-[#d9c18d]/50"
            />

            <p className="mt-6 text-xs font-semibold text-[#a4aaa4]">近い気持ちがあれば1つ（任意）</p>
            <div className="mt-3 flex min-w-0 flex-wrap gap-2">
              {REASON_CLUSTERS.map((cluster) => (
                <button
                  key={cluster.key}
                  type="button"
                  onClick={() => updateState({ reasonCluster: state.reasonCluster === cluster.key ? null : cluster.key })}
                  className={'min-h-11 max-w-full rounded-full border px-3.5 py-2 text-xs leading-5 ' +
                    (state.reasonCluster === cluster.key
                      ? 'border-[#789581]/65 bg-[#789581]/15 text-[#bad0bf]'
                      : 'border-white/9 text-[#858d86]')}
                >
                  {cluster.label}
                </button>
              ))}
            </div>

            {notice && <p role="status" className="mt-4 text-center text-xs leading-6 text-[#d2ba84]">{notice}</p>}

            <button
              type="button"
              onClick={() => {
                if (!state.reasonText.trim()) {
                  setNotice('短くてもいいので、今の理由を書いてみて。');
                  return;
                }
                setNotice('');
                setStep(4);
              }}
              className="mt-7 min-h-12 w-full rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-bold text-[#171813]"
            >
              次へ
            </button>
          </section>
        )}

        {step === 4 && currentOption && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">04 · NEXT VIEW</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight">そのCが増えたら、何が変わりそう？</h1>
            <p className="mt-3 text-sm leading-7 text-[#929a92]">まだ分からなければ空欄でもOK。今見えている未来だけ残す。</p>
            <textarea
              value={state.desiredChangeText}
              onChange={(event) => updateState({ desiredChangeText: event.target.value.slice(0, 1000) })}
              rows={5}
              placeholder="例：仕事でもう一度、自分から動ける感じが戻りそう"
              className="mt-5 w-full min-w-0 rounded-[22px] border border-white/10 bg-white/[0.025] p-4 text-base leading-7 text-[#eee8dc] outline-none placeholder:text-[#555d56] focus:border-[#d9c18d]/50"
            />

            <button
              type="button"
              onClick={completeChoice}
              disabled={saving}
              className="mt-7 min-h-12 w-full rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-bold text-[#171813] disabled:opacity-40"
            >
              {saving ? '保存中…' : '今のCを決める'}
            </button>
          </section>
        )}

        {step === 5 && currentOption && (
          <section>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#789581]">05 · CURRENT C</p>
            <div className="mt-3 overflow-hidden rounded-[30px] border border-[#d9c18d]/30 bg-gradient-to-br from-[#d9c18d]/[0.12] via-[#10120f] to-[#789581]/[0.08] p-5 sm:p-6">
              <p className="text-xs text-[#8f978f]">今のあなたが選んだCは、</p>
              <h1 className="mt-2 break-words font-serif text-4xl font-semibold text-[#eee1bf] sm:text-5xl">{currentOption.label}</h1>
              <p className="mt-2 text-sm text-[#9ca39c]">{currentOption.jp}</p>
              <div className="mt-5 border-t border-white/8 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f786f]">WHY NOW</p>
                <p className="mt-2 break-words text-sm leading-7 text-[#bec4bd]">{state.reasonText}</p>
                {state.desiredChangeText && (
                  <>
                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6f786f]">IF IT GROWS</p>
                    <p className="mt-2 break-words text-sm leading-7 text-[#aab1aa]">{state.desiredChangeText}</p>
                  </>
                )}
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-[#8f978f]">
              これは「あなたは{currentOption.label}タイプ」という診断ではありません。
              今の自分が、そこに心を向けているという現在地です。Cは変わっていい。
            </p>

            <section className="mt-7 rounded-[28px] border border-[#789581]/30 bg-[#789581]/[0.07] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#89a18f]">FIRST MICRO QUEST · 3 MIN</p>
              <h2 className="mt-3 font-serif text-2xl font-semibold leading-snug text-[#e8ece6]">{currentOption.prompt}</h2>

              {!state.firstQuestStartedAt && (
                <button
                  type="button"
                  onClick={startQuest}
                  className="mt-5 min-h-12 w-full rounded-full bg-[#789581] px-5 py-4 text-sm font-bold text-[#101510]"
                >
                  3分だけ、やってみる
                </button>
              )}

              {state.firstQuestStartedAt && !state.firstQuestCompletedAt && (
                <div className="mt-5">
                  <p className="text-sm leading-7 text-[#a2aaa3]">やってみたら、何が起きた？ <span className="text-[#6f776f]">（任意）</span></p>
                  <textarea
                    value={state.reflectionText}
                    onChange={(event) => updateState({ reflectionText: event.target.value.slice(0, 800) })}
                    rows={3}
                    placeholder="気づいたこと・感じたことを一言"
                    className="mt-3 w-full min-w-0 rounded-[20px] border border-white/10 bg-black/15 p-4 text-base leading-7 outline-none placeholder:text-[#535b54] focus:border-[#789581]/60"
                  />
                  <button
                    type="button"
                    onClick={completeQuest}
                    disabled={saving}
                    className="mt-4 min-h-12 w-full rounded-full bg-[#d9c18d] px-5 py-4 text-sm font-bold text-[#171813] disabled:opacity-40"
                  >
                    {saving ? '記録中…' : 'Quest完了'}
                  </button>
                </div>
              )}

              {state.firstQuestCompletedAt && (
                <div className="mt-5 rounded-[20px] border border-[#d9c18d]/25 bg-[#d9c18d]/[0.07] p-4">
                  <p className="font-serif text-xl font-semibold text-[#e8dab7]">✓ Cが、体験になった。</p>
                  <p className="mt-2 text-xs leading-6 text-[#929990]">選ぶ → 動く → 感じる。ここからACEの次のQuestへ進めます。</p>
                </div>
              )}
            </section>

            {notice && <p role="status" className="mt-4 text-center text-xs leading-6 text-[#d2ba84]">{notice}</p>}

            {!connected && (
              <Link
                href="/connect/line?next=%2Fc-choice%3Fsource%3Dline"
                className="mt-5 flex min-h-12 w-full items-center justify-center rounded-full border border-[#789581]/40 bg-[#789581]/10 px-5 py-3 text-center text-sm font-semibold text-[#b9cebd]"
              >
                LINEとつないで、ACEの旅に保存する
              </Link>
            )}

            {connected && state.selectedAt && (
              <button
                type="button"
                onClick={retrySync}
                disabled={saving}
                className="mt-4 min-h-11 w-full rounded-full border border-white/10 px-4 py-3 text-xs font-semibold text-[#858d86] disabled:opacity-40"
              >
                ACEへの同期を確認する
              </button>
            )}

            {state.firstQuestCompletedAt && (
              <Link
                href={'/quest-router?source=c-choice&c=' + (state.currentC ?? '')}
                className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-4 text-center text-sm font-bold text-[#171813]"
              >
                次のQuestを見る →
              </Link>
            )}

            <button type="button" onClick={restart} className="mt-3 min-h-11 w-full text-sm text-[#6e766f]">
              今のCを選び直す
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
