'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LAYERS } from '@/lib/appRoutes';

const PWA_ROUTES = ['/today', '/learn', '/quest', '/me', '/people', '/connect/line'];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function LayerSwitcher() {
  const pathname = usePathname();
  if (PWA_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null;

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.08] bg-[#071426]/94 shadow-[0_10px_40px_rgba(0,0,0,.18)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 px-4 py-2.5 md:px-7">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#ff8a1f]/45 bg-[#ff8a1f]/10 text-[10px] font-black tracking-wide text-[#ff9a42]">OS</span>
          <span className="min-w-0"><span className="block truncate text-[10px] font-bold tracking-[.18em] text-[#f2f5f9]">FLOW OS</span><span className="hidden text-[8px] tracking-[.12em] text-[#718097] sm:block">KNOWLEDGE → WANT TO → QUEST</span></span>
        </Link>
        <nav aria-label="知・望・行" className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.025] p-1">
          {LAYERS.map((layer) => {
            const active = isActive(pathname, layer.href);
            return <Link key={layer.key} href={layer.href} aria-current={active ? 'page' : undefined} className={`flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-semibold tracking-wide transition sm:px-3.5 sm:text-[10px] ${active ? 'bg-[#ff8a1f] text-[#071426] shadow-[0_5px_20px_rgba(255,138,31,.20)]' : 'text-[#aeb9c8] hover:bg-white/[0.06] hover:text-white'}`}><span className="font-serif text-xs sm:text-sm">{layer.kanji}</span><span className="hidden sm:inline">{layer.label}</span></Link>;
          })}
        </nav>
      </div>
    </header>
  );
}
