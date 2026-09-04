'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const ENTRY: Record<string, { eyebrow: string; title: string; action: string }> = {
  '/want-to': {
    eyebrow: '望 → 行',
    title: 'この方向から、今できるQuestへ',
    action: 'Questを絞る',
  },
  '/calibration': {
    eyebrow: '現在地 → 行',
    title: '今の状態に合うQuestへつなぐ',
    action: 'Questを絞る',
  },
  '/today': {
    eyebrow: '今日 → 行',
    title: '時間と集中度まで含めて次の一手へ',
    action: 'Questを選ぶ',
  },
};

export default function FlowLoopGuide() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === '/quest') {
    return (
      <Link
        href="/my-ace"
        className="fixed bottom-[5.7rem] right-4 z-40 rounded-full border border-[#789581]/30 bg-[#111510]/95 px-4 py-3 text-xs font-bold text-[#b8c9bb] shadow-2xl backdrop-blur md:right-6"
      >
        体験のEvidenceを見る →
      </Link>
    );
  }

  const entry = ENTRY[pathname];
  if (!entry) return null;

  const params = new URLSearchParams();
  params.set('source', pathname.slice(1) || 'today');
  const wantId = searchParams.get('q');
  if (pathname === '/want-to' && wantId) params.set('want', wantId);
  const href = `/quest-router?${params.toString()}`;

  return (
    <aside className="fixed bottom-[5.7rem] left-1/2 z-40 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-[22px] border border-[#c8ab72]/20 bg-[#111510]/95 p-3 shadow-[0_22px_70px_rgba(0,0,0,.36)] backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#789581]">{entry.eyebrow}</p>
          <p className="mt-1 truncate text-xs font-semibold text-[#e9e1d1]">{entry.title}</p>
        </div>
        <Link href={href} className="shrink-0 rounded-full bg-[#d9c18d] px-4 py-2.5 text-xs font-black text-[#171813]">
          {entry.action} →
        </Link>
      </div>
    </aside>
  );
}
