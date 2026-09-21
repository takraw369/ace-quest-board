'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { compileToQuestPlan } from '@/lib/questCompiler';
import { AXIS_LABELS, buildMonthlyGrowthReport } from '@/lib/monthlyReport';
import { useQuestEngineStore } from '@/stores/questEngineStore';
import { useQuestStore } from '@/stores/questStore';
import type { CompiledQuestPlan } from '@/types/questCompiler';

const SAMPLE = `一流の成長は、知識を増やすことだけでは起きない。知ったことを小さく試し、身体と現実からフィードバックを受け、条件を変えてもう一度試す。その反復によって、自分に合う勝ち方が見えてくる。成功だけでなく、予測と違った結果も次の判断材料になる。`;

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[24px] border border-[#c8ab72]/12 bg-white/[0.025] p-5 md:p-6 ${className}`}>
      {children}
    </section>
  );
}

export default function QuestCompilerPage() {
  const [title, setTitle] = useState('実験型成長の記事');
  const [text, setText] = useState(SAMPLE);
  const [error, setError] = useState('');
  const [boardMessage, setBoardMessage] = useState('');
  const { plans, activePlanId, logs, addPlan, setActivePlan, completeQuest, undoQuest } = useQuestEngineStore();

  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? plans[0] ?? null;
  const completedIds = useMemo(() => new Set(logs.map((log) => log.questId)), [logs]);
  const report = useMemo(() => buildMonthlyGrowthReport(logs), [logs]);

  const compile = () => {
    try {
      const plan = compileToQuestPlan({ title, text });
      addPlan(plan);
      setError('');
      setBoardMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Quest化に失敗しました。');
    }
  };

  const sendToBoard = (plan: CompiledQuestPlan) => {
    const store = useQuestStore.getState();
    const existingMilestone = store.milestones.find(
      (milestone) => milestone.title === plan.mainQuest.title && milestone.description.includes(plan.id),
    );
    if (existingMilestone) {
      setBoardMessage('このQuest PlanはすでにBoardへ追加されています。');
      return;
    }

    let vision = store.visions.find((item) => item.title === 'ACE Quest Compiler');
    if (!vision) {
      vision = store.addVision({
        title: 'ACE Quest Compiler',
        description: '知識・記事・体験を、現実で試すQuestへ変換する実験レイヤー',
        color: '#c8ab72',
        icon: '🧪',
        order: store.visions.length,
      });
    }

    const milestone = store.addMilestone({
      visionId: vision.id,
      title: plan.mainQuest.title,
      description: `${plan.mainQuest.description}\ncompiler-plan:${plan.id}`,
      status: 'active',
      order: store.milestones.filter((item) => item.visionId === vision?.id).length,
    });

    const boardQuests = plan.subQuests.map((subQuest, index) =>
      store.addQuest({
        milestoneId: milestone.id,
        title: subQuest.title,
        description: `${subQuest.description}\nClear: ${subQuest.clearCondition}`,
        estimatedHours: 0.5,
        difficulty: (index + 1) as 1 | 2 | 3,
        xpReward: subQuest.xp,
        status: index === 0 ? 'available' : 'locked',
        tags: ['compiler', 'experiment', ...subQuest.growthAxes],
      }),
    );

    plan.dailyQuests.forEach((dailyQuest, index) => {
      const questIndex = index < 2 ? 0 : index < 5 ? 1 : 2;
      store.addTask({
        questId: boardQuests[questIndex].id,
        title: `${dailyQuest.title}｜${dailyQuest.clearCondition}`,
        estimatedMinutes: 10,
        status: 'todo',
        order: index,
      });
    });

    setBoardMessage('Boardへ追加しました。Main → Milestone / Sub → Quest / Daily → Task として接続済みです。');
  };

  return (
    <div className="min-h-screen bg-[#090a08] text-[#e9e1d1] selection:bg-[#c8ab72]/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-44 -top-52 h-[540px] w-[540px] rounded-full bg-[#789581]/10 blur-[130px]" />
        <div className="absolute -right-44 top-44 h-[500px] w-[500px] rounded-full bg-[#c8ab72]/[0.06] blur-[130px]" />
      </div>

      <main className="relative z-10 mx-auto max-w-[1240px] px-5 pb-28 pt-8 md:px-8 md:pt-10">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#788078]">Knowledge → Action → Data → Next Quest</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.03em] text-[#eee8dc] md:text-6xl">Quest Compiler v0</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#8d938b]">記事・研究・本・体験を、Main Quest → Sub Quest → 7日Daily Questへ変換。実践ログから月次Growth Reportまで同じループで回します。</p>
          </div>
          <Link href="/" className="rounded-full border border-[#c8ab72]/20 px-4 py-2 text-xs text-[#cbb98e] transition hover:bg-[#c8ab72]/10">Quest Boardへ</Link>
        </header>

        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <Panel>
            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#646c65]">01 / Source</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">素材を入れる</h2>
            </div>
            <label className="block text-xs text-[#8b9189]">タイトル</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[#c8ab72]/45" />
            <label className="mt-4 block text-xs text-[#8b9189]">本文 / メモ / 研究要約</label>
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={12} className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#c8ab72]/45" />
            {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
            <button onClick={compile} className="mt-5 w-full rounded-xl bg-[#d7c08d] px-5 py-3 text-sm font-bold text-[#15160f] transition hover:brightness-110">Questへ変換する</button>

            {plans.length > 1 ? (
              <div className="mt-6 border-t border-white/8 pt-4">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#646c65]">Recent Plans</p>
                <div className="space-y-2">
                  {plans.slice(0, 5).map((plan) => (
                    <button key={plan.id} onClick={() => setActivePlan(plan.id)} className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${activePlan?.id === plan.id ? 'border-[#c8ab72]/35 bg-[#c8ab72]/8 text-[#e4d4ad]' : 'border-white/8 text-[#878e86] hover:bg-white/[0.035]'}`}>{plan.sourceTitle}</button>
                  ))}
                </div>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#646c65]">02 / Compiled Quest</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold">行動へ変換</h2>
              </div>
              {activePlan ? <span className="rounded-full border border-[#789581]/25 bg-[#789581]/8 px-3 py-1 text-[10px] text-[#9db4a3]">7 DAYS</span> : null}
            </div>

            {!activePlan ? <p className="py-20 text-center text-sm text-[#656c66]">左の素材をQuestへ変換すると、ここに実践設計が出ます。</p> : (
              <div>
                <div className="rounded-2xl border border-[#c8ab72]/20 bg-[#c8ab72]/[0.045] p-4">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#9f8b61]">Main Quest · +{activePlan.mainQuest.xp} XP</p>
                  <h3 className="mt-2 font-serif text-xl font-semibold text-[#eee8dc]">{activePlan.mainQuest.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-[#959b93]">{activePlan.mainQuest.description}</p>
                  <p className="mt-3 text-[11px] text-[#c9b987]">Clear｜{activePlan.mainQuest.clearCondition}</p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {activePlan.subQuests.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                      <p className="text-[9px] uppercase tracking-[0.16em] text-[#697169]">Sub Quest · +{item.xp}</p>
                      <h4 className="mt-2 text-sm font-semibold text-[#ddd7ca]">{item.title}</h4>
                      <p className="mt-2 text-[11px] leading-5 text-[#7e857e]">{item.clearCondition}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  {activePlan.dailyQuests.map((item) => {
                    const done = completedIds.has(item.id);
                    return (
                      <div key={item.id} className={`flex items-center gap-3 rounded-xl border p-3 ${done ? 'border-[#789581]/25 bg-[#789581]/[0.06]' : 'border-white/8 bg-black/10'}`}>
                        <button onClick={() => done ? undoQuest(item.id) : completeQuest(activePlan.id, item)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs transition ${done ? 'border-[#789581]/60 bg-[#789581]/25 text-[#cce0d0]' : 'border-white/15 text-[#676e68] hover:border-[#c8ab72]/40'}`}>{done ? '✓' : item.day}</button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${done ? 'text-[#aab9ac]' : 'text-[#d8d2c7]'}`}>{item.title}</p>
                          <p className="mt-1 text-[10px] text-[#6f766f]">{item.clearCondition}</p>
                        </div>
                        <span className="text-[10px] text-[#9b895f]">+{item.xp} XP</span>
                      </div>
                    );
                  })}
                </div>

                <button onClick={() => sendToBoard(activePlan)} className="mt-5 w-full rounded-xl border border-[#789581]/30 bg-[#789581]/10 px-4 py-3 text-sm font-semibold text-[#b9ccb9] transition hover:bg-[#789581]/15">Quest Boardへ接続</button>
                {boardMessage ? <p className="mt-2 text-[11px] leading-5 text-[#849187]">{boardMessage}</p> : null}
              </div>
            )}
          </Panel>
        </div>

        <Panel className="mt-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#646c65]">03 / Quest Log → Monthly Report</p>
              <h2 className="mt-1 font-serif text-2xl font-semibold">{report.periodLabel} Growth Report</h2>
            </div>
            <div className="flex gap-5 text-right">
              <div><p className="text-[9px] uppercase tracking-[0.15em] text-[#606760]">Completed</p><p className="mt-1 font-serif text-2xl">{report.completedCount}</p></div>
              <div><p className="text-[9px] uppercase tracking-[0.15em] text-[#606760]">XP</p><p className="mt-1 font-serif text-2xl">{report.totalXp}</p></div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
              <p className="text-xs leading-6 text-[#9ba098]">{report.pattern}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {Object.entries(report.growthAxisXp).map(([axis, xp]) => (
                  <div key={axis} className="rounded-xl border border-white/7 p-3">
                    <p className="text-[9px] text-[#686f69]">{AXIS_LABELS[axis as keyof typeof AXIS_LABELS]}</p>
                    <p className="mt-1 font-serif text-lg text-[#d9d2c4]">{xp}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/12 p-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#697069]">Next Quest</p>
              <div className="mt-3 space-y-2">
                {report.nextQuests.map((nextQuest) => <div key={nextQuest} className="rounded-xl bg-white/[0.025] px-3 py-2 text-xs text-[#aaa99f]">→ {nextQuest}</div>)}
              </div>
              {report.highlights.length ? <div className="mt-5"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#697069]">Recent Wins</p><div className="mt-2 space-y-1">{report.highlights.map((item) => <p key={item} className="text-[11px] text-[#7f877f]">{item}</p>)}</div></div> : null}
            </div>
          </div>
        </Panel>
      </main>
    </div>
  );
}
