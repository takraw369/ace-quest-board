'use client';

type FlowWorldSeedProps = {
  xpGain?: number;
  xpTotal?: number;
  streak?: number;
  completed?: boolean;
  title?: string;
};

const petals = [
  { x: 120, y: 46 },
  { x: 186, y: 94 },
  { x: 160, y: 171 },
  { x: 80, y: 171 },
  { x: 54, y: 94 },
];

export default function FlowWorldSeed({
  xpGain = 0,
  xpTotal = 0,
  streak = 0,
  completed = false,
  title = 'FLOW WORLD SEED',
}: FlowWorldSeedProps) {
  return (
    <section
      aria-label="FLOW WORLDの成長フィードバック"
      className="overflow-hidden rounded-[26px] border border-[#789581]/20 bg-[#0d100d] p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">{title}</p>
          <h2 className="mt-2 font-serif text-xl font-semibold text-[#eee8dc]">
            {completed ? '今日の体験が、世界にひとつ刻まれた' : '今日の世界は保存されています'}
          </h2>
        </div>
        {xpGain > 0 && (
          <span className="shrink-0 rounded-full border border-[#d9c18d]/20 bg-[#d9c18d]/10 px-3 py-1.5 text-[10px] font-bold text-[#d9c18d]">
            +{xpGain} XP
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
        <div className="relative mx-auto h-[220px] w-[220px]" aria-hidden="true">
          <svg viewBox="0 0 240 220" className="h-full w-full">
            <circle cx="120" cy="110" r="92" fill="none" stroke="rgba(120,149,129,0.14)" />
            <circle cx="120" cy="110" r="66" fill="none" stroke="rgba(210,185,127,0.12)" />
            {petals.map((petal, index) => (
              <g key={`${petal.x}-${petal.y}`}>
                <circle
                  cx={petal.x}
                  cy={petal.y}
                  r="22"
                  fill={completed ? 'rgba(120,149,129,0.20)' : 'rgba(255,255,255,0.025)'}
                  stroke={completed ? 'rgba(169,192,175,0.45)' : 'rgba(255,255,255,0.08)'}
                />
                <text
                  x={petal.x}
                  y={petal.y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={completed ? 'rgba(233,225,209,0.82)' : 'rgba(147,154,146,0.5)'}
                >
                  {index + 1}
                </text>
              </g>
            ))}
            <circle
              cx="120"
              cy="110"
              r={completed ? 34 : 30}
              fill={completed ? 'rgba(217,193,141,0.18)' : 'rgba(120,149,129,0.10)'}
              stroke={completed ? 'rgba(217,193,141,0.62)' : 'rgba(120,149,129,0.32)'}
              strokeWidth="1.5"
              className={completed ? 'animate-pulse' : undefined}
            />
            <circle cx="120" cy="110" r="9" fill={completed ? '#d9c18d' : '#789581'} opacity="0.9" />
          </svg>
        </div>

        <div>
          <p className="text-sm leading-7 text-[#9da29b]">
            今はまだ“完成したゲーム世界”ではなく、Questの体験が世界へ反映されるための最小単位です。
            次の段階で、実際のFLOW状態・獲得したLens・Evidenceに応じて地形や光、解放領域へ接続します。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#7f867f]">TOTAL XP</p>
              <p className="mt-1 font-serif text-lg text-[#eee8dc]">{xpTotal}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
              <p className="text-[9px] uppercase tracking-[0.18em] text-[#7f867f]">STREAK</p>
              <p className="mt-1 font-serif text-lg text-[#eee8dc]">{streak} days</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
