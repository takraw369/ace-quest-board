'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { href: '/today', label: 'TODAY', mark: '●' },
  { href: '/learn', label: 'LEARN', mark: '◐' },
  { href: '/quest', label: 'QUEST', mark: '◆' },
  { href: '/me', label: 'SELF', mark: '◎' },
  { href: '/people', label: 'PEOPLE', mark: '◇' },
];

export default function PwaNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#090a08]/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {items.map((item) => {
          const active = pathname === item.href || (item.href === '/people' && pathname.startsWith('/scout'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[9px] font-semibold tracking-[0.12em] transition ${active ? 'bg-[#c8ab72]/12 text-[#e7d4a7]' : 'text-[#6f766f]'}`}
            >
              <span className="mb-1 text-sm">{item.mark}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
