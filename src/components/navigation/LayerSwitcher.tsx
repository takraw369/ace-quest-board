'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LAYERS } from '@/lib/appRoutes';

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function LayerSwitcher() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="知・望・行"
      className="fixed bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 z-[100] -translate-x-1/2"
    >
      <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#071426]/92 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl">
        {LAYERS.map((layer) => {
          const active = isActive(pathname, layer.href);
          return (
            <Link
              key={layer.key}
              href={layer.href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-[74px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[10px] font-semibold tracking-wide transition sm:min-w-[92px] ${
                active
                  ? 'bg-[#ff8a1f] text-[#071426] shadow-[0_6px_24px_rgba(255,138,31,.22)]'
                  : 'text-[#aeb9c8] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className="font-serif text-sm">{layer.kanji}</span>
              <span>{layer.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
