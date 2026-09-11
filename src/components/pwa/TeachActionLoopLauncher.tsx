import Link from 'next/link';

export default function TeachActionLoopLauncher() {
  return (
    <Link
      href="/learn/48h-teach"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-[#d9c18d]/30 bg-[#171813]/95 px-4 py-3 text-xs font-semibold text-[#e9e1d1] shadow-2xl shadow-black/30 backdrop-blur transition hover:border-[#d9c18d]/50 active:scale-[0.98]"
      aria-label="48H Learning Loopを開く"
    >
      <span className="rounded-full bg-[#d9c18d] px-2 py-1 text-[9px] font-black tracking-[0.12em] text-[#171813]">48H</span>
      <span>話す＋1つ試す</span>
    </Link>
  );
}
