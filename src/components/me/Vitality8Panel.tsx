"use client";

import { useEffect, useMemo, useState } from "react";

const HEALTH_KEYS = ["sensing", "margin", "learning", "regulation"] as const;
const BURNING_KEYS = ["want", "space", "energy", "loop"] as const;
const SCORE_VALUES = [0, 1, 2, 3, 4, 5] as const;

type HealthKey = (typeof HEALTH_KEYS)[number];
type BurningKey = (typeof BURNING_KEYS)[number];
type VitalityKey = HealthKey | BurningKey;
type ScoreMap = Record<VitalityKey, number>;
type DraftMap = Record<VitalityKey, number | null>;

type VitalityItem = {
  key: VitalityKey;
  code: string;
  short: string;
  title: string;
  prompt: string;
  group: "health" | "burning";
};

type StoredVitality = {
  version: 1;
  scores: ScoreMap;
  updatedAt: string;
};

const ITEMS: VitalityItem[] = [
  {
    key: "sensing",
    code: "SENSING",
    short: "感覚",
    title: "感覚・接点",
    prompt: "身体や環境の変化・違和感を、今ちゃんと拾えている",
    group: "health",
  },
  {
    key: "margin",
    code: "MARGIN",
    short: "余力",
    title: "余力・代謝",
    prompt: "睡眠・時間・体力・お金など、回復と再投資の余白がある",
    group: "health",
  },
  {
    key: "learning",
    code: "LEARNING",
    short: "学習",
    title: "学習・改善",
    prompt: "結果や失敗を観察し、次の行動へ反映できている",
    group: "health",
  },
  {
    key: "regulation",
    code: "REGULATION",
    short: "調整",
    title: "供給・調整",
    prompt: "負荷や予定、必要なものの過不足を調整できている",
    group: "health",
  },
  {
    key: "want",
    code: "WANT",
    short: "WANT",
    title: "WANT・価値",
    prompt: "誰にも言われなくても進みたい理由・守りたい価値がある",
    group: "burning",
  },
  {
    key: "space",
    code: "SPACE",
    short: "余白",
    title: "自由・余白",
    prompt: "選択肢・安全・人間関係・環境に、燃え続けられる余白がある",
    group: "burning",
  },
  {
    key: "energy",
    code: "ENERGY",
    short: "熱",
    title: "身体・感情の熱",
    prompt: "好奇心や身体エネルギーがあり、実際に動ける状態にある",
    group: "burning",
  },
  {
    key: "loop",
    code: "LOOP",
    short: "連鎖",
    title: "行動・連鎖",
    prompt: "小さく動き、結果を受け取り、次の一歩へつなげられている",
    group: "burning",
  },
];

function emptyDraft(): DraftMap {
  return {
    sensing: null,
    margin: null,
    learning: null,
    regulation: null,
    want: null,
    space: null,
    energy: null,
    loop: null,
  };
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 5;
}

function isStoredVitality(value: unknown): value is StoredVitality {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || typeof record.updatedAt !== "string" || !record.scores || typeof record.scores !== "object") return false;
  const scores = record.scores as Record<string, unknown>;
  return ITEMS.every((item) => isScore(scores[item.key]));
}

function average(scores: ScoreMap, keys: readonly VitalityKey[]) {
  return keys.reduce((sum, key) => sum + scores[key], 0) / keys.length;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function statusFor(health: number, burning: number) {
  if (health >= 3 && burning >= 3) {
    return {
      code: "FLOW",
      title: "循環しながら進める",
      body: "健康と燃焼が両立。最低点だけ整えながら、今の流れを前へつなぐ。",
    };
  }
  if (health >= 3) {
    return {
      code: "STABLE",
      title: "土台はある。火を探す",
      body: "壊れにくさはある。WANT・余白・熱・連鎖のどこで火力が落ちているかを見る。",
    };
  }
  if (burning >= 3) {
    return {
      code: "OVERDRIVE",
      title: "進めるが、持続性に注意",
      body: "火力が土台を上回っている。拡大より先に、健康側の最低点を整える。",
    };
  }
  return {
    code: "RESET",
    title: "まず整えて、再点火する",
    body: "今は拡大より回復と再調整。最も低い1要素から小さく立て直す。",
  };
}

export default function Vitality8Panel({ userId }: { userId: string }) {
  const [scores, setScores] = useState<ScoreMap | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftMap>(() => emptyDraft());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const key = `ace.vitality8.v1.${userId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isStoredVitality(parsed)) {
          setScores(parsed.scores);
          setUpdatedAt(parsed.updatedAt);
        }
      }
    } catch {
      // A broken local snapshot must never block My ACE.
    } finally {
      setHydrated(true);
    }
  }, [userId]);

  const canSave = ITEMS.every((item) => draft[item.key] !== null);
  const summary = useMemo(() => {
    if (!scores) return null;
    const health = average(scores, HEALTH_KEYS);
    const burning = average(scores, BURNING_KEYS);
    const bottleneck = ITEMS.reduce((lowest, item) => (scores[item.key] < scores[lowest.key] ? item : lowest), ITEMS[0]);
    return {
      health,
      burning,
      bottleneck,
      status: statusFor(health, burning),
    };
  }, [scores]);

  function beginCheck() {
    setDraft(scores ? { ...scores } : emptyDraft());
    setEditing(true);
  }

  function saveCheck() {
    if (!canSave) return;
    const nextScores = Object.fromEntries(ITEMS.map((item) => [item.key, draft[item.key] as number])) as ScoreMap;
    const nextUpdatedAt = new Date().toISOString();
    const payload: StoredVitality = { version: 1, scores: nextScores, updatedAt: nextUpdatedAt };
    localStorage.setItem(`ace.vitality8.v1.${userId}`, JSON.stringify(payload));
    setScores(nextScores);
    setUpdatedAt(nextUpdatedAt);
    setEditing(false);
    window.dispatchEvent(new CustomEvent("ace:vitality-updated"));
  }

  if (!hydrated) {
    return (
      <section className="mt-5 rounded-[26px] border border-ace-border bg-ace-surface p-6">
        <div className="h-28 animate-pulse rounded-2xl bg-ace-raised/60" />
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-ace-border bg-ace-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[9px] font-black tracking-[0.24em] text-ace-accent">LIFE SYSTEM / 生命体OS</div>
          <h2 className="mt-2 text-xl font-black sm:text-2xl">壊れず、燃えるか。</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ace-text-muted">
            健康4要素は「続けられる土台」、燃焼4要素は「前へ進む火力」。固定タイプではなく、今の状態を0〜5で観察します。
          </p>
        </div>
        {scores && !editing ? (
          <button
            type="button"
            onClick={beginCheck}
            className="rounded-xl border border-ace-border px-3 py-2 text-xs font-bold text-ace-text-secondary transition hover:border-ace-accent/30 hover:bg-ace-raised"
          >
            もう一度測る
          </button>
        ) : null}
      </div>

      {!scores && !editing ? (
        <div className="mt-5 rounded-2xl border border-dashed border-ace-accent/25 bg-ace-deep p-5 sm:flex sm:items-center sm:justify-between sm:gap-5">
          <div>
            <p className="font-black text-ace-text">8要素を測ると、レーダーと現在地が出ます。</p>
            <p className="mt-2 text-sm leading-6 text-ace-text-muted">8問。考え込まず、今この瞬間の感覚で答える。</p>
          </div>
          <button
            type="button"
            onClick={beginCheck}
            className="mt-4 inline-flex rounded-2xl bg-ace-accent px-5 py-3 text-sm font-black text-[#050d18] transition hover:brightness-110 sm:mt-0"
          >
            8要素を測る →
          </button>
        </div>
      ) : null}

      {editing ? (
        <div className="mt-6">
          <div className="grid gap-5 xl:grid-cols-2">
            <ScoreGroup
              title="HEALTH / 壊れず続く"
              subtitle="感覚・余力・学習・調整"
              items={ITEMS.filter((item) => item.group === "health")}
              draft={draft}
              onScore={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
            />
            <ScoreGroup
              title="BURNING / 前へ進む"
              subtitle="WANT・余白・熱・連鎖"
              items={ITEMS.filter((item) => item.group === "burning")}
              draft={draft}
              onScore={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ace-border pt-5">
            <p className="text-xs text-ace-text-muted">0 = ほぼ無い / 5 = 十分ある。平均より最低点を重視します。</p>
            <div className="flex gap-2">
              {scores ? (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-xl border border-ace-border px-4 py-3 text-sm font-bold text-ace-text-secondary transition hover:bg-ace-raised"
                >
                  戻る
                </button>
              ) : null}
              <button
                type="button"
                disabled={!canSave}
                onClick={saveCheck}
                className="rounded-xl bg-ace-accent px-5 py-3 text-sm font-black text-[#050d18] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
              >
                現在地を保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {scores && summary && !editing ? (
        <div className="mt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <VitalMetric label="HEALTH" value={`${round1(summary.health)} / 5`} note="続ける土台" />
            <VitalMetric label="BURNING" value={`${round1(summary.burning)} / 5`} note="進む火力" />
            <VitalMetric label="MODE" value={summary.status.code} note={summary.status.title} />
            <VitalMetric label="BOTTLENECK" value={summary.bottleneck.short} note={`${scores[summary.bottleneck.key]} / 5`} />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-ace-border bg-ace-deep p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[9px] font-black tracking-[0.2em] text-ace-text-muted">8 ELEMENT RADAR</div>
                  <h3 className="mt-1 font-black">今の形</h3>
                </div>
                <span className="text-[10px] text-ace-text-muted">最低点から見る</span>
              </div>
              <RadarChart scores={scores} />
            </div>

            <div className="rounded-2xl border border-ace-border bg-ace-deep p-4 sm:p-5">
              <div>
                <div className="text-[9px] font-black tracking-[0.2em] text-ace-text-muted">HEALTH × BURNING</div>
                <h3 className="mt-1 font-black">現在地マップ</h3>
              </div>
              <QuadrantMap health={summary.health} burning={summary.burning} />
              <div className="mt-4 rounded-xl border border-ace-border bg-ace-surface p-4">
                <div className="text-xs font-black text-ace-accent-soft">{summary.status.code} / {summary.status.title}</div>
                <p className="mt-2 text-sm leading-6 text-ace-text-muted">{summary.status.body}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-ace-text-muted">
            <span>今回最初に触る場所：<strong className="text-ace-text">{summary.bottleneck.title}</strong></span>
            {updatedAt ? <span>更新 {new Date(updatedAt).toLocaleString("ja-JP")}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ScoreGroup({
  title,
  subtitle,
  items,
  draft,
  onScore,
}: {
  title: string;
  subtitle: string;
  items: VitalityItem[];
  draft: DraftMap;
  onScore: (key: VitalityKey, value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-ace-border bg-ace-deep p-4 sm:p-5">
      <div className="text-[10px] font-black tracking-[0.18em] text-ace-accent-soft">{title}</div>
      <div className="mt-1 text-xs text-ace-text-muted">{subtitle}</div>
      <div className="mt-5 space-y-5">
        {items.map((item) => (
          <div key={item.key}>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <span className="text-[9px] font-black tracking-[0.16em] text-ace-text-muted">{item.code}</span>
                <div className="mt-1 text-sm font-black text-ace-text">{item.title}</div>
              </div>
              <span className="text-lg font-black text-ace-accent">{draft[item.key] ?? "—"}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-ace-text-muted">{item.prompt}</p>
            <div className="mt-3 grid grid-cols-6 gap-1.5" role="group" aria-label={`${item.title}のスコア`}>
              {SCORE_VALUES.map((value) => {
                const active = draft[item.key] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onScore(item.key, value)}
                    className={`rounded-lg border py-2 text-xs font-black transition ${
                      active
                        ? "border-ace-accent bg-ace-accent text-[#050d18]"
                        : "border-ace-border bg-ace-surface text-ace-text-secondary hover:border-ace-accent/35 hover:bg-ace-raised"
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VitalMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-ace-border bg-ace-deep px-4 py-4">
      <div className="text-[9px] font-black tracking-[0.18em] text-ace-text-muted">{label}</div>
      <div className="mt-2 text-lg font-black text-ace-text">{value}</div>
      <div className="mt-1 truncate text-[10px] text-ace-text-muted">{note}</div>
    </div>
  );
}

function RadarChart({ scores }: { scores: ScoreMap }) {
  const size = 260;
  const center = size / 2;
  const radius = 82;
  const labelRadius = 108;

  const point = (index: number, distance: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / ITEMS.length;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };

  const polygon = (scale: number) => ITEMS.map((_, index) => point(index, radius * scale)).map((p) => `${p.x},${p.y}`).join(" ");
  const valuePolygon = ITEMS.map((item, index) => point(index, radius * (scores[item.key] / 5))).map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="mt-3 flex justify-center overflow-hidden">
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full max-w-[300px]" role="img" aria-label="8要素レーダーチャート">
        {[1, 2, 3, 4, 5].map((ring) => (
          <polygon key={ring} points={polygon(ring / 5)} fill="none" stroke="var(--ace-border)" strokeWidth="1" opacity={ring === 5 ? 0.95 : 0.6} />
        ))}
        {ITEMS.map((item, index) => {
          const edge = point(index, radius);
          return <line key={item.key} x1={center} y1={center} x2={edge.x} y2={edge.y} stroke="var(--ace-border)" strokeWidth="1" opacity="0.65" />;
        })}
        <polygon points={valuePolygon} fill="var(--ace-accent)" fillOpacity="0.16" stroke="var(--ace-accent)" strokeWidth="2.5" />
        {ITEMS.map((item, index) => {
          const valuePoint = point(index, radius * (scores[item.key] / 5));
          const labelPoint = point(index, labelRadius);
          return (
            <g key={item.key}>
              <circle cx={valuePoint.x} cy={valuePoint.y} r="3" fill="var(--ace-accent)" />
              <text x={labelPoint.x} y={labelPoint.y} fill="var(--ace-text-secondary)" fontSize="9" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
                {item.short}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function QuadrantMap({ health, burning }: { health: number; burning: number }) {
  const x = Math.max(4, Math.min(96, (burning / 5) * 100));
  const y = Math.max(4, Math.min(96, 100 - (health / 5) * 100));

  return (
    <div className="mt-5">
      <div className="relative mx-auto aspect-square w-full max-w-[310px] overflow-hidden rounded-2xl border border-ace-border bg-ace-surface">
        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-ace-border" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-ace-border" />
        <div className="absolute left-3 top-3 text-[9px] font-black tracking-[0.12em] text-ace-text-muted">STABLE</div>
        <div className="absolute right-3 top-3 text-[9px] font-black tracking-[0.12em] text-ace-accent-soft">FLOW</div>
        <div className="absolute bottom-3 left-3 text-[9px] font-black tracking-[0.12em] text-ace-text-muted">RESET</div>
        <div className="absolute bottom-3 right-3 text-[9px] font-black tracking-[0.12em] text-ace-text-muted">OVERDRIVE</div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] font-black tracking-[0.16em] text-ace-text-muted">HEALTH ↑</div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-black tracking-[0.16em] text-ace-text-muted">BURNING →</div>
        <div
          className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ace-deep bg-ace-accent shadow-lg shadow-black/30 transition-all duration-300"
          style={{ left: `${x}%`, top: `${y}%` }}
          aria-label={`Health ${round1(health)}、Burning ${round1(burning)}`}
        />
      </div>
    </div>
  );
}
