'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import PwaNav from '@/components/navigation/PwaNav';

type ScoutStage = 'watch' | 'contact' | 'trial' | 'ace';

type ScoutCandidate = {
  id: string;
  name: string;
  sport: string;
  age: string;
  area: string;
  source: string;
  note: string;
  potential: number;
  coachability: number;
  physicality: number;
  aceFit: number;
  stage: ScoutStage;
  createdAt: string;
};

type CandidateDraft = Omit<ScoutCandidate, 'id' | 'stage' | 'createdAt'>;

const STORAGE_KEY = 'ace:scout:candidates:v1';

const STAGES: Array<{ value: ScoutStage; label: string }> = [
  { value: 'watch', label: 'WATCH' },
  { value: 'contact', label: 'CONTACT' },
  { value: 'trial', label: 'TRIAL' },
  { value: 'ace', label: 'ACE' },
];

const initialDraft: CandidateDraft = {
  name: '',
  sport: '',
  age: '',
  area: '',
  source: '',
  note: '',
  potential: 3,
  coachability: 3,
  physicality: 3,
  aceFit: 3,
};

function scoutScore(candidate: Pick<ScoutCandidate, 'potential' | 'coachability' | 'physicality' | 'aceFit'>) {
  const weighted = candidate.potential * 0.3
    + candidate.coachability * 0.3
    + candidate.aceFit * 0.25
    + candidate.physicality * 0.15;
  return Math.round((weighted / 5) * 100);
}

function readCandidates(): ScoutCandidate[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistCandidates(candidates: ScoutCandidate[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
}

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-white/10 bg-white/[0.025] p-3">
      <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f877f]">{label}</span>
      <div className="mt-3 flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`h-8 w-8 rounded-full border text-xs font-bold transition ${value === score ? 'border-[#d2b97f] bg-[#d2b97f] text-[#171813]' : 'border-white/10 text-[#7f877f]'}`}
            aria-label={`${label} ${score}`}
          >
            {score}
          </button>
        ))}
      </div>
    </label>
  );
}

export default function ScoutClient() {
  const [candidates, setCandidates] = useState<ScoutCandidate[]>([]);
  const [draft, setDraft] = useState<CandidateDraft>(initialDraft);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<ScoutStage | 'all'>('all');

  useEffect(() => setCandidates(readCandidates()), []);

  const visibleCandidates = useMemo(() => {
    const filtered = filter === 'all' ? candidates : candidates.filter((candidate) => candidate.stage === filter);
    return [...filtered].sort((a, b) => scoutScore(b) - scoutScore(a));
  }, [candidates, filter]);

  const bestScore = useMemo(
    () => candidates.reduce((best, candidate) => Math.max(best, scoutScore(candidate)), 0),
    [candidates],
  );

  const saveCandidates = (next: ScoutCandidate[]) => {
    setCandidates(next);
    persistCandidates(next);
  };

  const addCandidate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.sport.trim()) return;

    const candidate: ScoutCandidate = {
      ...draft,
      id: globalThis.crypto?.randomUUID?.() ?? `scout-${Date.now()}`,
      name: draft.name.trim(),
      sport: draft.sport.trim(),
      age: draft.age.trim(),
      area: draft.area.trim(),
      source: draft.source.trim(),
      note: draft.note.trim(),
      stage: 'watch',
      createdAt: new Date().toISOString(),
    };

    saveCandidates([candidate, ...candidates]);
    setDraft(initialDraft);
    setShowForm(false);
  };

  const updateStage = (id: string, stage: ScoutStage) => {
    saveCandidates(candidates.map((candidate) => candidate.id === id ? { ...candidate, stage } : candidate));
  };

  const removeCandidate = (id: string) => {
    saveCandidates(candidates.filter((candidate) => candidate.id !== id));
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-28 pt-8 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#789581]">ATHLETE SCOUT</p>
            <h1 className="mt-2 font-serif text-3xl font-semibold">未来のACEを見つける。</h1>
          </div>
          <Link href="/people" className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-bold tracking-[0.14em] text-[#8b938c]">
            PEOPLE
          </Link>
        </div>

        <p className="mt-4 text-sm leading-7 text-[#9da29b]">
          結果だけでなく、伸びしろ・学習力・身体性・ACEとの相性を残す。候補者との接点を、育成資産へ変えるスカウトボードです。
        </p>

        <section className="mt-7 grid grid-cols-3 gap-2">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-4">
            <p className="text-[9px] font-bold tracking-[0.16em] text-[#6f776f]">CANDIDATES</p>
            <p className="mt-2 text-2xl font-semibold text-[#eee8dc]">{candidates.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-4">
            <p className="text-[9px] font-bold tracking-[0.16em] text-[#6f776f]">CONTACT+</p>
            <p className="mt-2 text-2xl font-semibold text-[#eee8dc]">{candidates.filter((candidate) => candidate.stage !== 'watch').length}</p>
          </div>
          <div className="rounded-[22px] border border-[#c8ab72]/20 bg-[#c8ab72]/[0.04] p-4">
            <p className="text-[9px] font-bold tracking-[0.16em] text-[#9f8b62]">TOP SCORE</p>
            <p className="mt-2 text-2xl font-semibold text-[#e7d4a7]">{bestScore || '—'}</p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="mt-4 flex w-full items-center justify-between rounded-[24px] border border-[#c8ab72]/25 bg-[#c8ab72]/10 px-5 py-4 text-left"
        >
          <span>
            <span className="block text-[9px] font-bold tracking-[0.18em] text-[#b59c68]">ADD PROSPECT</span>
            <span className="mt-1 block text-sm font-semibold text-[#eee8dc]">候補アスリートを登録</span>
          </span>
          <span className="text-xl text-[#d2b97f]">{showForm ? '−' : '+'}</span>
        </button>

        {showForm && (
          <form onSubmit={addCandidate} className="mt-3 rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f877f]">NAME *</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="選手名 / ニックネーム"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f110f] px-4 py-3 text-sm outline-none placeholder:text-[#4f554f] focus:border-[#789581]/60"
                />
              </label>
              <label>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f877f]">SPORT *</span>
                <input
                  value={draft.sport}
                  onChange={(event) => setDraft({ ...draft, sport: event.target.value })}
                  placeholder="競技"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f110f] px-4 py-3 text-sm outline-none placeholder:text-[#4f554f] focus:border-[#789581]/60"
                />
              </label>
              <label>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f877f]">AGE</span>
                <input
                  value={draft.age}
                  onChange={(event) => setDraft({ ...draft, age: event.target.value })}
                  placeholder="年齢 / 学年"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f110f] px-4 py-3 text-sm outline-none placeholder:text-[#4f554f] focus:border-[#789581]/60"
                />
              </label>
              <label>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f877f]">AREA</span>
                <input
                  value={draft.area}
                  onChange={(event) => setDraft({ ...draft, area: event.target.value })}
                  placeholder="地域 / 所属"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f110f] px-4 py-3 text-sm outline-none placeholder:text-[#4f554f] focus:border-[#789581]/60"
                />
              </label>
              <label>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f877f]">SOURCE</span>
                <input
                  value={draft.source}
                  onChange={(event) => setDraft({ ...draft, source: event.target.value })}
                  placeholder="大会 / SNS / 紹介"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f110f] px-4 py-3 text-sm outline-none placeholder:text-[#4f554f] focus:border-[#789581]/60"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-2">
              <ScoreInput label="POTENTIAL / 伸びしろ" value={draft.potential} onChange={(value) => setDraft({ ...draft, potential: value })} />
              <ScoreInput label="COACHABILITY / 学習力" value={draft.coachability} onChange={(value) => setDraft({ ...draft, coachability: value })} />
              <ScoreInput label="PHYSICALITY / 身体性" value={draft.physicality} onChange={(value) => setDraft({ ...draft, physicality: value })} />
              <ScoreInput label="ACE FIT / 思想・環境適合" value={draft.aceFit} onChange={(value) => setDraft({ ...draft, aceFit: value })} />
            </div>

            <label className="mt-4 block">
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#7f877f]">SCOUT NOTE</span>
              <textarea
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                placeholder="何が気になった？ 何を次に見たい？"
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0f110f] px-4 py-3 text-sm leading-6 outline-none placeholder:text-[#4f554f] focus:border-[#789581]/60"
              />
            </label>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-full border border-white/10 px-4 py-3 text-xs font-semibold text-[#8b938c]">キャンセル</button>
              <button type="submit" className="flex-1 rounded-full bg-[#d9c18d] px-4 py-3 text-xs font-bold text-[#171813]">候補に追加</button>
            </div>
          </form>
        )}

        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#789581]">SCOUT PIPELINE</p>
              <h2 className="mt-1 font-serif text-xl font-semibold">候補者リスト</h2>
            </div>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as ScoutStage | 'all')}
              className="rounded-full border border-white/10 bg-[#0f110f] px-3 py-2 text-[10px] font-bold tracking-[0.12em] text-[#8b938c] outline-none"
            >
              <option value="all">ALL</option>
              {STAGES.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
            </select>
          </div>

          {visibleCandidates.length === 0 ? (
            <div className="mt-4 rounded-[28px] border border-dashed border-white/10 px-6 py-10 text-center">
              <p className="font-serif text-xl text-[#d9d2c5]">まだ候補者はいません。</p>
              <p className="mt-2 text-xs leading-6 text-[#727a73]">大会、SNS、紹介で「気になる」を感じた瞬間に残す。評価は後から育てればOK。</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {visibleCandidates.map((candidate) => {
                const score = scoutScore(candidate);
                return (
                  <article key={candidate.id} className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#789581]">{candidate.sport}</p>
                        <h3 className="mt-1 truncate font-serif text-2xl font-semibold text-[#eee8dc]">{candidate.name}</h3>
                        <p className="mt-1 text-xs text-[#747b75]">{[candidate.age, candidate.area, candidate.source].filter(Boolean).join(' · ') || '詳細未登録'}</p>
                      </div>
                      <div className="shrink-0 rounded-2xl border border-[#c8ab72]/20 bg-[#c8ab72]/[0.05] px-4 py-3 text-center">
                        <p className="text-[8px] font-bold tracking-[0.16em] text-[#9f8b62]">ACE SCORE</p>
                        <p className="mt-1 text-2xl font-semibold text-[#e7d4a7]">{score}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-4 gap-1.5 text-center">
                      {[
                        ['伸びしろ', candidate.potential],
                        ['学習力', candidate.coachability],
                        ['身体性', candidate.physicality],
                        ['ACE適合', candidate.aceFit],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-xl bg-white/[0.025] px-2 py-2">
                          <p className="text-[8px] text-[#687069]">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-[#bfc4bd]">{value}/5</p>
                        </div>
                      ))}
                    </div>

                    {candidate.note && <p className="mt-4 rounded-2xl bg-[#101310] p-4 text-sm leading-7 text-[#9ca39c]">{candidate.note}</p>}

                    <div className="mt-4">
                      <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#687069]">STAGE</p>
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {STAGES.map((stage) => (
                          <button
                            key={stage.value}
                            type="button"
                            onClick={() => updateStage(candidate.id, stage.value)}
                            className={`rounded-xl border px-2 py-2 text-[9px] font-bold tracking-[0.08em] transition ${candidate.stage === stage.value ? 'border-[#789581]/50 bg-[#789581]/15 text-[#c3d1c6]' : 'border-white/10 text-[#626a63]'}`}
                          >
                            {stage.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[9px] text-[#59605a]">端末内保存 · {new Date(candidate.createdAt).toLocaleDateString('ja-JP')}</p>
                      <button type="button" onClick={() => removeCandidate(candidate.id)} className="text-[10px] font-semibold text-[#8b6764]">候補から外す</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[28px] border border-[#789581]/15 bg-[#789581]/[0.04] p-5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#789581]">NEXT PHASE</p>
          <p className="mt-2 text-sm leading-7 text-[#9da59e]">次はSupabaseへ同期し、ACE診断・Quest実績・成長ログからスカウトスコアを自動更新。本人が公開を選んだ選手だけを検索対象にする設計へ拡張できます。</p>
        </section>
      </div>
      <PwaNav />
    </main>
  );
}
