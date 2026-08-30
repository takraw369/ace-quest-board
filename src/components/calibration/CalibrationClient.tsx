'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import { loadBootstrap, saveBootstrap, sessionIsUsable, SUPABASE_URL, type AceAxis } from '@/lib/pwa';

type Answers = Record<string, number>;
type Scores = Record<AceAxis, number>;

type Question = {
  key: string;
  axis: AceAxis;
  label: string;
  help: string;
};

const AXES: AceAxis[] = ['BODY', 'COGNITION', 'EMOTION', 'ACTION'];

const bodyQuestions: Question[] = [
  { key: 'body_sleep', axis: 'BODY', label: '睡眠・回復', help: '起きたとき、活動に使える回復感がある' },
  { key: 'body_breath', axis: 'BODY', label: '呼吸', help: '急いだり力みすぎたりせず、呼吸を戻しやすい' },
  { key: 'body_jaw', axis: 'BODY', label: '顎・顔の力み', help: '必要以上に噛みしめたり顔へ力が入り続けたりしていない' },
  { key: 'body_shoulders', axis: 'BODY', label: '肩・上半身', help: '肩や上半身の余計な力を抜きやすい' },
  { key: 'body_soles', axis: 'BODY', label: '足裏・接地感', help: '立ったときに足裏の接地を感じやすい' },
  { key: 'body_hunger', axis: 'BODY', label: '空腹・エネルギー', help: '空腹や食後の状態に大きく振り回されず活動できる' },
  { key: 'body_fatigue', axis: 'BODY', label: '疲労', help: '疲れが強く残りすぎず、必要な出力を出せる' },
  { key: 'body_openness', axis: 'BODY', label: '身体の開き・温かさ', help: '縮こまりすぎず、身体が動きやすい・温まりやすい感覚がある' },
];

const mindQuestions: Question[] = [
  { key: 'cognition_focus', axis: 'COGNITION', label: '注意を戻す', help: '気が散ったあと、必要な対象へ注意を戻しやすい' },
  { key: 'cognition_fact', axis: 'COGNITION', label: '事実と解釈を分ける', help: '起きた事実と、自分がつけた意味を分けて見られる' },
  { key: 'cognition_next', axis: 'COGNITION', label: '次に見る1点', help: '情報が多いときでも、次に確認する1点を決められる' },
  { key: 'emotion_notice', axis: 'EMOTION', label: '反応に気づく', help: '乱れたとき、身体・思考・行動の反応に気づける' },
  { key: 'emotion_reset', axis: 'EMOTION', label: 'Resetを持つ', help: '呼吸・姿勢・言葉など、自分が戻りやすい手段を持っている' },
  { key: 'emotion_reselect', axis: 'EMOTION', label: '選び直す', help: '反応したあとでも、次の行動を選び直せる' },
  { key: 'action_kpi', axis: 'ACTION', label: '勝利条件を絞る', help: '今の自分が何を伸ばせば前進なのか、1つに絞れる' },
  { key: 'action_experiment', axis: 'ACTION', label: '小さく試す', help: '正解を待つより、小さく試して結果を観察できる' },
  { key: 'action_repeat', axis: 'ACTION', label: '修正して再実行', help: 'うまくいかなかったとき、1点を修正してもう一度試せる' },
];

const axisCopy: Record<AceAxis, { title: string; description: string; action: string }> = {
  BODY: {
    title: 'BODY｜身体の条件',
    description: '今は考え方を変えるより先に、身体の条件を1つ調える余地がありそうです。',
    action: '長く吐く／水を飲む／立つ／足裏を感じる／光を浴びる、から1つだけ試す。',
  },
  COGNITION: {
    title: 'COGNITION｜認知の焦点',
    description: '情報や解釈が重なり、次に見る1点がぼやけている可能性があります。',
    action: '今日の出来事を「事実」と「自分の解釈」の2行に分ける。',
  },
  EMOTION: {
    title: 'EMOTION｜戻る手順',
    description: '感情を消すより、乱れた後に戻る手順を持つことが先になりそうです。',
    action: 'Trigger → Reaction → Reset → Reselect を1回だけ記録する。',
  },
  ACTION: {
    title: 'ACTION｜実行条件',
    description: '次の具体的な実行単位が大きい、または曖昧な可能性があります。',
    action: '今週のKPIを1つ決め、それを支える実行行動を3つだけ書く。',
  },
};

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function ScaleQuestion({ question, value, onChange }: { question: Question; value?: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="rounded-[24px] border border-[#c8ab72]/15 bg-white/[0.025] p-4">
      <legend className="px-1 text-sm font-semibold text-[#e9e1d1]">{question.axis !== 'BODY' ? `${question.axis}｜` : ''}{question.label}</legend>
      <p className="mt-2 text-xs leading-6 text-[#8f958e]">{question.help}</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {[0, 1, 2, 3, 4].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`rounded-2xl border py-3 text-sm font-semibold ${value === score ? 'border-[#d9c18d] bg-[#d9c18d] text-[#151611]' : 'border-[#c8ab72]/15 bg-black/10 text-[#a8ada6]'}`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[#5f665f]"><span>今は難しい</span><span>かなりできる</span></div>
    </fieldset>
  );
}

export default function CalibrationClient() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [balanceSkipped, setBalanceSkipped] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(30);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerRemaining <= 0) {
      setTimerRunning(false);
      return;
    }
    const id = window.setTimeout(() => setTimerRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [timerRunning, timerRemaining]);

  const setAnswer = (key: string, value: number) => setAnswers((current) => ({ ...current, [key]: value }));
  const allBodyAnswered = bodyQuestions.every((q) => Number.isInteger(answers[q.key]));
  const allMindAnswered = mindQuestions.every((q) => Number.isInteger(answers[q.key]));
  const bodyTestReady = Number.isInteger(answers.body_arm_symmetry) && (balanceSkipped || Number.isInteger(answers.body_balance));

  const scores = useMemo<Scores | null>(() => {
    if (!allBodyAnswered || !allMindAnswered || !bodyTestReady) return null;
    const bodyKeys = [...bodyQuestions.map((q) => q.key), 'body_arm_symmetry', ...(balanceSkipped ? [] : ['body_balance'])];
    const byAxis = (axis: AceAxis) => mindQuestions.filter((q) => q.axis === axis).map((q) => answers[q.key]);
    return {
      BODY: round2(average(bodyKeys.map((key) => answers[key]))),
      COGNITION: round2(average(byAxis('COGNITION'))),
      EMOTION: round2(average(byAxis('EMOTION'))),
      ACTION: round2(average(byAxis('ACTION'))),
    };
  }, [answers, allBodyAnswered, allMindAnswered, balanceSkipped, bodyTestReady]);

  const resultAxis = useMemo<AceAxis | null>(() => {
    if (!scores) return null;
    return AXES.reduce((lowest, axis) => scores[axis] < scores[lowest] ? axis : lowest, AXES[0]);
  }, [scores]);

  const saveResult = async () => {
    const bootstrap = loadBootstrap();
    if (!bootstrap || !sessionIsUsable(bootstrap)) {
      setStatus('FLOW OSの接続期限が切れています。LINEから接続し直してください。');
      return;
    }
    if (!scores || !resultAxis) return;

    const result = {
      contract_version: 'ace-result-v1',
      assessment_key: 'ace_calibration_v1',
      source: 'ace-assessment',
      assessed_at: new Date().toISOString(),
      scores,
      result_axis: resultAxis,
      answers,
      context: { balance_skipped: balanceSkipped },
    };

    setSaving(true);
    setStatus('FLOW OSへ保存しています…');
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ace-assessment-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_token: bootstrap.session_token, result }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.ok === false) throw new Error(payload?.error ?? `http_${response.status}`);
      saveBootstrap({
        ...bootstrap,
        ace: payload.current_ace ?? { ...result, assessment_id: payload.assessment_id },
        recommendations: Array.isArray(payload.recommendations) ? payload.recommendations : bootstrap.recommendations,
        current_recommendations: payload.current_recommendations ?? bootstrap.current_recommendations,
      });
      setSaved(true);
      setStatus('保存しました。Today / Learn / Questのおすすめも更新しました。');
    } catch (error) {
      setStatus(`保存に失敗しました: ${error instanceof Error ? error.message : 'unknown_error'}`);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    setStatus('');
    if (step === 1 && !allBodyAnswered) return setStatus('BODYの8項目をすべて選んでください。');
    if (step === 2 && !bodyTestReady) return setStatus('片足立ちを評価またはスキップし、腕の左右差も選んでください。');
    if (step === 3 && !allMindAnswered) return setStatus('認知・感情・行動の9項目をすべて選んでください。');
    setStep((value) => Math.min(4, value + 1));
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setBalanceSkipped(false);
    setTimerRunning(false);
    setTimerRemaining(30);
    setStatus('');
    setSaved(false);
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-7 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <header className="mb-6">
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">ACE METHOD · CALIBRATION</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">今の自分を、1度観察する。</h1>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-[#d9c18d] transition-all" style={{ width: `${(step / 4) * 100}%` }} /></div>
        </header>

        {step === 0 && (
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.03] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">ACE Calibration Check</p>
              <h2 className="mt-3 font-serif text-2xl font-semibold">タイプを決める診断ではありません。</h2>
              <p className="mt-4 text-sm leading-7 text-[#9ca097]">今の出力を止めている場所を、身体・認知・感情・行動の4方向から観察します。所要2〜4分。点数は他人との比較ではなく、今日の自分の個人内比較にだけ使います。</p>
            </div>
            <div className="rounded-[24px] border border-[#789581]/20 bg-[#789581]/[0.06] p-4 text-xs leading-6 text-[#aeb5ae]">片足立ちで痛み・めまい・強い不安定さを感じる場合は実施せずスキップしてください。本チェックは医療診断・心理検査ではありません。</div>
            <button type="button" onClick={next} className="w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813]">はじめる</button>
          </section>
        )}

        {step === 1 && (
          <section className="space-y-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">01 · BODY</p><h2 className="mt-2 font-serif text-2xl font-semibold">身体の状態を見る</h2></div>
            {bodyQuestions.map((question) => <ScaleQuestion key={question.key} question={question} value={answers[question.key]} onChange={(value) => setAnswer(question.key, value)} />)}
            <button type="button" onClick={next} className="w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813]">次へ</button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">02 · BODY TEST</p><h2 className="mt-2 font-serif text-2xl font-semibold">片足バランス 30秒</h2></div>
            <div className="rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.03] p-5 text-center">
              <div className="font-serif text-6xl font-semibold text-[#d9c18d]">{timerRemaining}</div>
              <p className="mt-3 text-xs leading-6 text-[#8f958e]">安全な場所で、壁や椅子の近くに立ちます。無理ならすぐ両足をついてください。</p>
              <button type="button" disabled={timerRunning} onClick={() => { setBalanceSkipped(false); setTimerRemaining(30); setTimerRunning(true); }} className="mt-4 rounded-full border border-[#c8ab72]/20 px-4 py-2 text-xs font-semibold disabled:opacity-50">{timerRunning ? '計測中…' : '30秒スタート'}</button>
              <button type="button" onClick={() => { setBalanceSkipped(true); setTimerRunning(false); setAnswers((current) => { const copy = { ...current }; delete copy.body_balance; return copy; }); }} className="ml-3 mt-4 text-xs text-[#789581]">安全のためスキップ</button>
            </div>
            {!balanceSkipped && <ScaleQuestion question={{ key: 'body_balance', axis: 'BODY', label: '今の片足立ちの安定感', help: '他人と比べず、今日の自分の感覚だけで答えてください。' }} value={answers.body_balance} onChange={(value) => setAnswer('body_balance', value)} />}
            {balanceSkipped && <div className="rounded-2xl border border-[#789581]/20 bg-[#789581]/[0.06] p-4 text-xs text-[#9da69f]">片足立ちは評価から除外しました。安全優先でOKです。</div>}
            <ScaleQuestion question={{ key: 'body_arm_symmetry', axis: 'BODY', label: '腕の平行伸ばし', help: '左右差が少なく、無理なく腕を伸ばせる感覚。0=差や力みを強く感じる / 4=自然に伸ばせる' }} value={answers.body_arm_symmetry} onChange={(value) => setAnswer('body_arm_symmetry', value)} />
            <button type="button" onClick={next} className="w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813]">次へ</button>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">03 · MIND × ACTION</p><h2 className="mt-2 font-serif text-2xl font-semibold">認知・感情・行動を観察する</h2></div>
            {mindQuestions.map((question) => <ScaleQuestion key={question.key} question={question} value={answers[question.key]} onChange={(value) => setAnswer(question.key, value)} />)}
            <button type="button" onClick={next} className="w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813]">結果を見る</button>
          </section>
        )}

        {step === 4 && scores && resultAxis && (
          <section className="space-y-5">
            <div className="rounded-[28px] border border-[#d9c18d]/20 bg-white/[0.03] p-5">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">FIRST CALIBRATION · {resultAxis}</p>
              <h2 className="mt-3 font-serif text-2xl font-semibold">{axisCopy[resultAxis].title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#9ca097]">{axisCopy[resultAxis].description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AXES.map((axis) => <div key={axis} className={`rounded-2xl border p-4 ${axis === resultAxis ? 'border-[#d9c18d]/40 bg-[#d9c18d]/10' : 'border-[#c8ab72]/15 bg-white/[0.02]'}`}><p className="text-[9px] text-[#6f766f]">{axis}</p><p className="mt-1 font-serif text-2xl font-semibold">{scores[axis].toFixed(2)}</p></div>)}
            </div>
            <div className="rounded-[24px] border border-[#789581]/20 bg-[#789581]/[0.06] p-5"><p className="text-[10px] uppercase tracking-[0.2em] text-[#789581]">今日の1アクション</p><p className="mt-2 text-sm font-semibold leading-7">{axisCopy[resultAxis].action}</p></div>
            <button type="button" disabled={saving || saved} onClick={() => void saveResult()} className="w-full rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813] disabled:opacity-50">{saved ? 'FLOW OSへ保存済み' : saving ? '保存中…' : 'FLOW OSへ保存する'}</button>
            {saved && <div className="grid grid-cols-2 gap-3"><Link href="/today" className="rounded-full border border-[#c8ab72]/20 px-4 py-3 text-center text-xs font-semibold">Todayへ</Link><Link href="/quest" className="rounded-full border border-[#c8ab72]/20 px-4 py-3 text-center text-xs font-semibold">Questへ</Link></div>}
            <button type="button" onClick={restart} className="w-full py-2 text-xs text-[#6f766f]">もう一度チェックする</button>
          </section>
        )}

        {status && <p className="mt-5 rounded-2xl border border-[#c8ab72]/10 bg-white/[0.02] p-4 text-xs leading-6 text-[#9ca097]">{status}</p>}
        {!sessionIsUsable(loadBootstrap()) && step > 0 && <Link href="/connect/line?next=/calibration" className="mt-4 block text-center text-xs text-[#d9c18d]">LINEと再接続する</Link>}
      </div>
      <PwaNav />
    </main>
  );
}