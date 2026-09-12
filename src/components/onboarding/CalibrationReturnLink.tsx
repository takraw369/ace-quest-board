'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function CalibrationReturnLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    setShow(next === '/onboarding');
  }, []);

  if (!show) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[60] px-4 pt-[max(10px,env(safe-area-inset-top))] pointer-events-none">
      <div className="mx-auto flex max-w-xl justify-end">
        <Link
          href="/onboarding"
          className="pointer-events-auto rounded-full border border-[#c8ab72]/20 bg-[#0d100d]/90 px-4 py-2 text-[11px] font-semibold text-[#d9c18d] shadow-lg shadow-black/20 backdrop-blur-xl"
        >
          ← Character Createへ戻る
        </Link>
      </div>
    </div>
  );
}
