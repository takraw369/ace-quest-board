'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';
import {
  loadBootstrap,
  PwaBootstrap,
  Recommendation,
  saveBootstrap,
  sessionIsUsable,
  SUPABASE_URL,
} from '@/lib/pwa';

type Candidate = {
  id: string;
  quest_key: string;
  recommendation_ref: string;
  capability: string;
  phase_code: string;
  age_band: string;
  title: string;
  instruction: string;
  actor_mode: string;
  estimated_minutes: number;
  difficulty: number;
  xp_reward: number;
  observation_axes: string[];
  tags: string[];
  experience: {
    intro?: string;
    prediction?: string;
    action?: string;
    actual?: string;
    reflection?: string;
  };
  score: number;
  reasons: string[];
};

type RouterResponse = {
  ok: boolean;
  error?: string;
  engine?: string;
  context?: {
    age_band: string;
    capability: string;
    time_budget_minutes: number;
    attention_level: 'light' | 'focused';
    focus_axes?: string[];
  };
  candidates?: Candidate[];
  selected?: Candidate;
  recommendation?: Recommendation;
};

const AGE_BANDS = [
  '0〜18か月',
  '18〜36か月',
  '3〜6歳',
  '6〜9歳',
  '9〜12歳',
  '12〜15歳',
  '15〜18歳',
  '18〜25歳前後',
  '成人期',
  '転換・再起期',
] as const;

const TIME_OPTIONS = [3, 5, 10, 15, 30] as const;

function updateQuestRecommendation(data: PwaBootstrap, recommendation: Recommendation) {
  const current = data.recommendations ?? [];
  const questIndex = current.findIndex((item) => item.recommendation_type === 'quest');
  const recommendations = [...current];
  if (questIndex >= 0) recommendations[questIndex] = recommendation;
  else recommendations.unshift(recommendation);
  const next = { ...data, recommendations };
  saveBootstrap(next);
  return next;
}

export default function QuestRouterPage() {
  const [data, setData] = useState<PwaBootstrap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [ageBand, setAgeBand] = useState('');
  const [timeBudget, setTimeBudget] = useState<number>(10);
  const [attention, setAttention] = useState<'light' | 'focused'>('light');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [contextAxes, setContextAxes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(loadBootstrap());
    setLoaded(true);
  }, []);

  const request = async (payload: Record<string, unknown>) => {
    if (!data?.session_token) throw new Error('session_required');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/quest-router`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: data.session_token,
        capability: 'self_regulation',
        age_band: ageBand,
        time_budget_minutes: timeBudget,
        attention_level: attention,
        ...payload,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as RouterResponse;
    if (!response.ok || !result.ok) throw new Error(result.error ?? `http_${response.status}`);
    return result;
  };

  const routeQuest = async () => {
    if (!ageBand) {
      setError('まず、今の年代・段階を選んでください。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await request({ action: 'recommend', limit: 3 });
      setCandidates(result.candidates ?? []);
      setContextAxes(result.context?.focus_axes ?? []);
      if ((result.candidates ?? []).length === 0) setError('この条件では未完了Questが見つかりませんでした。時間を少し広げてみてください。');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'quest_router_failed');
    } finally {
      setBusy(false);
    }
  };

  const selectQuest = async (candidate: Candidate) => {
    setSelecting(candidate.recommendation_ref);
    setError(null);
    try {
      const result = await request({ action: 'select', recommendation_ref: candidate.recommendation_ref, limit: 3 });
      if (!result.recommendation || !data) throw new Error('recommendation_update_failed');
      const next = updateQuestRecommendation(data, result.recommendation);
      setData(next);
      window.location.href = '/quest';
    } catch (e) {
      const message = e instanceof Error ? e.message : 'quest_select_failed';
      setError(message === 'base_quest_recommendation_missing' ? 'Quest推薦の土台がまだありません。LINEからFLOW OSを開き直して推薦を更新してください。' : message);
    } finally {
      setSelecting(null);
    }
  };

  if (!loaded) return <main className="min-h-screen bg-[#090a08] p-6 text-[#e9e1d1]">読み込み中…</main>;

  if (!data?.ok || !sessionIsUsable(data)) {
    return (
      <main className="min-h-screen bg-[#090a08] px-5 py-16 text-[#e9e1d1]">
        <div className="mx-auto max-w-md pt-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">QUEST ROUTER</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold">今の自分と接続してから選ぶ。</h1>
          <p className="mt-5 text-sm leading-7 text-[#9ca097]">ACE / FLOWの現在地を使ってQuestを選ぶため、まず本人データと接続してください。</p>
          <Link href="/connect/line" className="mt-7 inline-flex rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]">LINEと接続する</Link>
        </div>
        <PwaNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-48 h-[460px] w-[460px] rounded-full bg-[#789581]/10 blur-[125px]" />
        <div className="absolute -right-40 top-64 h-[420px] w-[420px] rounded-full bg-[#c8ab72]/[0.05] blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        <header>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">QUEST ROUTER / CATALOG → YOU</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">今の自分から、次のQuestへ。</h1>
          <p className="mt-4 text-sm leading-7 text-[#939a92]">45個から探す必要はありません。年代・使える時間・今の集中度とACE / FLOWを重ねて、候補を3つまで絞ります。</p>
        </header>

        <section className="mt-7 rounded-[28px] border border-[#c8ab72]/15 bg-white/[0.03] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d2b97f]">01 CONTEXT</p>
          <label className="mt-5 block text-xs font-semibold text-[#aeb5ad]">今の年代・段階</label>
          <select value={ageBand} onChange={(e) => setAgeBand(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#11120f] p-3.5 text-sm text-[#e9e1d1] outline-none focus:border-[#789581]/60">
            <option value="">選ぶ</option>
            {AGE_BANDS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <p className="mt-2 text-[11px] leading-5 text-[#676e68]">転職・引退・再起など大きな切替期なら、年齢に関係なく「転換・再起期」を選べます。</p>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#aeb5ad]">今、使える時間</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {TIME_OPTIONS.map((minutes) => (
                <button key={minutes} type="button" onClick={() => setTimeBudget(minutes)} className={`rounded-2xl border py-3 text-xs font-semibold ${timeBudget === minutes ? 'border-[#d9c18d] bg-[#d9c18d] text-[#171813]' : 'border-white/10 bg-black/15 text-[#9da29b]'}`}>{minutes}分</button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold text-[#aeb5ad]">今の集中度</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAttention('light')} className={`rounded-2xl border p-4 text-left ${attention === 'light' ? 'border-[#789581]/60 bg-[#789581]/10' : 'border-white/10 bg-black/15'}`}><span className="block text-sm font-semibold">軽くできる</span><span className="mt-1 block text-[11px] text-[#7f867f]">短く、始めやすいQuest</span></button>
              <button type="button" onClick={() => setAttention('focused')} className={`rounded-2xl border p-4 text-left ${attention === 'focused' ? 'border-[#789581]/60 bg-[#789581]/10' : 'border-white/10 bg-black/15'}`}><span className="block text-sm font-semibold">向き合える</span><span className="mt-1 block text-[11px] text-[#7f867f]">少し深く試すQuest</span></button>
            </div>
          </div>

          <button type="button" onClick={routeQuest} disabled={busy} className="mt-6 flex w-full items-center justify-center rounded-full bg-[#d9c18d] px-5 py-3.5 text-sm font-semibold text-[#171813] disabled:opacity-50">{busy ? '今の条件を重ねています…' : '今できるQuestを出す'}</button>
        </section>

        {contextAxes.length > 0 && (
          <p className="mt-4 text-center text-[11px] leading-5 text-[#6f776f]">ACE / FLOW lens: {contextAxes.join(' · ')}</p>
        )}

        {error && <div className="mt-5 rounded-[22px] border border-red-400/20 bg-red-400/5 p-4 text-sm leading-6 text-red-200/90">{error}</div>}

        {candidates.length > 0 && (
          <section className="mt-8">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#5e665f]">02 ROUTED QUESTS</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold">今の候補は、この3つ。</h2>
            <div className="mt-4 space-y-4">
              {candidates.map((candidate, index) => (
                <article key={candidate.id} className={`rounded-[28px] border p-5 ${index === 0 ? 'border-[#d9c18d]/30 bg-[#d9c18d]/[0.055]' : 'border-white/10 bg-white/[0.025]'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#789581]">{index === 0 ? 'PRIMARY' : `OPTION ${index + 1}`}</p><h3 className="mt-2 font-serif text-xl font-semibold text-[#eee8dc]">{candidate.title}</h3></div>
                    <span className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-[10px] text-[#a6aca5]">{candidate.estimated_minutes}分</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#a0a69f]">{candidate.instruction}</p>
                  {candidate.reasons.length > 0 && <p className="mt-3 text-xs leading-6 text-[#86a08d]">なぜ今：{candidate.reasons.join(' / ')}</p>}
                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] text-[#727972]"><span className="rounded-full border border-white/10 px-2.5 py-1">難易度 {candidate.difficulty}/5</span><span className="rounded-full border border-white/10 px-2.5 py-1">+{candidate.xp_reward} XP</span><span className="rounded-full border border-white/10 px-2.5 py-1">{candidate.age_band}</span></div>
                  <button type="button" disabled={Boolean(selecting)} onClick={() => selectQuest(candidate)} className={`mt-5 flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-50 ${index === 0 ? 'bg-[#d9c18d] text-[#171813]' : 'border border-[#c8ab72]/20 text-[#d9c18d]'}`}>{selecting === candidate.recommendation_ref ? 'Questへ接続中…' : 'このQuestで進む'}</button>
                </article>
              ))}
            </div>
          </section>
        )}

        <p className="mt-7 text-center text-[11px] leading-6 text-[#626963]">Routerは「正解」を決めるものではありません。今の条件から、試す価値が高い小さな実験を絞る役目です。</p>
      </div>
      <PwaNav />
    </main>
  );
}
