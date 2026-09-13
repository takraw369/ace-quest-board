'use client';

import Link from 'next/link';

type FlowWorldMapProps = {
  actionsCompleted?: number;
  questsCompleted?: number;
  learningCompleted?: number;
  hasConnectionRoute?: boolean;
  hasNextRoute?: boolean;
  questCompletedToday?: boolean;
  rank?: string;
  xpTotal?: number;
  nextHref?: string;
};

type WorldNode = {
  key: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  lit: boolean;
  value?: string;
};

function worldChapter(litCount: number, totalMovement: number) {
  if (totalMovement === 0) return { code: 'WORLD 00', title: '世界は、まだ静かに眠っている。', note: '最初の1mmで、最初の道が生まれる。' };
  if (litCount <= 2) return { code: 'WORLD 01', title: '最初の道が、光っている。', note: '動いた場所から、地図が少しずつ現れる。' };
  if (litCount <= 4) return { code: 'WORLD 02', title: '道が、つながり始めている。', note: '行動・Quest・学びが、別々ではなく一本の旅になっていく。' };
  return { code: 'WORLD 03', title: '世界が、少しずつ広がっている。', note: '次の道は、これまでのEvidenceから開いていく。' };
}

export default function FlowWorldMap({
  actionsCompleted = 0,
  questsCompleted = 0,
  learningCompleted = 0,
  hasConnectionRoute = false,
  hasNextRoute = false,
  questCompletedToday = false,
  rank = 'seed',
  xpTotal = 0,
  nextHref = '/quest',
}: FlowWorldMapProps) {
  const nodes: WorldNode[] = [
    { key: 'action', label: 'ACTION FIELD', sublabel: '行動の原', x: 120, y: 25, lit: actionsCompleted > 0, value: String(actionsCompleted) },
    { key: 'quest', label: 'QUEST RIDGE', sublabel: '挑戦の丘', x: 202, y: 83, lit: questsCompleted > 0 || questCompletedToday, value: String(questsCompleted) },
    { key: 'learn', label: 'KNOWLEDGE GROVE', sublabel: '学びの森', x: 171, y: 174, lit: learningCompleted > 0, value: String(learningCompleted) },
    { key: 'people', label: 'ENCOUNTER PORT', sublabel: '出逢いの港', x: 69, y: 174, lit: hasConnectionRoute },
    { key: 'next', label: 'NEXT GATE', sublabel: '次の門', x: 38, y: 83, lit: hasNextRoute },
  ];

  const litCount = nodes.filter((node) => node.lit).length;
  const totalMovement = actionsCompleted + questsCompleted + learningCompleted;
  const chapter = worldChapter(litCount, totalMovement);

  return (
    <section className="relative overflow-hidden rounded-[30px] border border-[#d9c18d]/20 bg-[#0d100d] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.30)]">
      <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#d9c18d]/[0.07] blur-[85px]" />
      <div className="pointer-events-none absolute -bottom-28 -left-24 h-64 w-64 rounded-full bg-[#789581]/[0.08] blur-[90px]" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#789581]">FLOW WORLD · YOUR MAP</p>
          <p className="mt-2 text-[10px] font-bold tracking-[0.16em] text-[#d9c18d]">{chapter.code}</p>
          <h2 className="mt-2 font-serif text-2xl font-semibold leading-9 text-[#eee8dc]">{chapter.title}</h2>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-right">
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#676e68]">TRACE</p>
          <p className="mt-1 text-xs font-semibold uppercase text-[#b8beb7]">{rank}</p>
          <p className="mt-0.5 text-[10px] text-[#777f78]">{xpTotal} XP</p>
        </div>
      </div>

      <div className="relative mx-auto mt-3 h-[300px] w-full max-w-[340px]" aria-label="あなたのFLOW WORLDマップ">
        <svg viewBox="0 0 240 215" className="h-full w-full overflow-visible" role="img">
          <title>行動・Quest・学び・出逢い・次の道が灯るFLOW WORLD</title>
          <circle cx="120" cy="108" r="96" fill="none" stroke="rgba(217,193,141,0.08)" strokeDasharray="2 7" />
          <circle cx="120" cy="108" r="68" fill="none" stroke="rgba(120,149,129,0.10)" />
          {nodes.map((node, index) => (
            <g key={node.key}>
              <line
                x1="120"
                y1="108"
                x2={node.x}
                y2={node.y}
                stroke={node.lit ? 'rgba(217,193,141,0.32)' : 'rgba(255,255,255,0.055)'}
                strokeWidth={node.lit ? 1.2 : 0.8}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.lit ? 13 : 10}
                fill={node.lit ? 'rgba(217,193,141,0.16)' : 'rgba(255,255,255,0.025)'}
                stroke={node.lit ? 'rgba(217,193,141,0.70)' : 'rgba(255,255,255,0.10)'}
                strokeWidth="1"
                className={node.lit ? 'ace-world-node' : undefined}
                style={{ animationDelay: `${index * 140}ms` }}
              />
              <circle cx={node.x} cy={node.y} r="3.5" fill={node.lit ? '#d9c18d' : '#515852'} />
              {node.value && (
                <text x={node.x} y={node.y + 27} textAnchor="middle" fontSize="7" fill={node.lit ? 'rgba(233,225,209,0.75)' : 'rgba(125,132,125,0.45)'}>
                  {node.value}
                </text>
              )}
            </g>
          ))}
          <circle cx="120" cy="108" r="35" fill="rgba(120,149,129,0.08)" stroke="rgba(120,149,129,0.28)" />
          <circle cx="120" cy="108" r={litCount > 0 ? 18 : 13} fill={litCount > 0 ? 'rgba(217,193,141,0.15)' : 'rgba(120,149,129,0.12)'} stroke={litCount > 0 ? 'rgba(217,193,141,0.62)' : 'rgba(120,149,129,0.36)'} className={litCount > 0 ? 'ace-world-core' : undefined} />
          <circle cx="120" cy="108" r="5" fill={litCount > 0 ? '#d9c18d' : '#789581'} />
          <text x="120" y="139" textAnchor="middle" fontSize="6.5" letterSpacing="2.2" fill="rgba(233,225,209,0.52)">FLOW CORE</text>
        </svg>

        {nodes.map((node) => {
          const left = `${(node.x / 240) * 100}%`;
          const top = `${(node.y / 215) * 100}%`;
          return (
            <div key={`label-${node.key}`} className="pointer-events-none absolute -translate-x-1/2" style={{ left, top: `calc(${top} + 20px)` }}>
              <p className={`whitespace-nowrap text-center text-[7px] font-bold tracking-[0.10em] ${node.lit ? 'text-[#b9aa83]' : 'text-[#555c56]'}`}>{node.label}</p>
              <p className={`mt-0.5 whitespace-nowrap text-center text-[8px] ${node.lit ? 'text-[#858d85]' : 'text-[#484e49]'}`}>{node.sublabel}</p>
            </div>
          );
        })}
      </div>

      <div className="relative -mt-2 rounded-[22px] border border-white/8 bg-black/15 p-4">
        <p className="text-sm leading-7 text-[#969d96]">{chapter.note}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold tracking-[0.08em] text-[#6f776f]">{litCount}/5 PATHS LIT</p>
          {hasNextRoute && (
            <Link href={nextHref} className="rounded-full border border-[#d9c18d]/25 bg-[#d9c18d]/10 px-4 py-2 text-[11px] font-bold text-[#dbc58f]">
              次の光へ →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
