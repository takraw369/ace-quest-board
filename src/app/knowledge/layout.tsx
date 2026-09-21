import Link from "next/link";
import { APP_ROUTES } from "@/lib/appRoutes";

const items = [
  { href: APP_ROUTES.dictionary, kanji: "困", label: "入口" },
  { href: APP_ROUTES.knowledge, kanji: "知", label: "知る" },
  { href: APP_ROUTES.knowledgeMap, kanji: "図", label: "Map" },
  { href: APP_ROUTES.wantTo, kanji: "望", label: "望む" },
  { href: APP_ROUTES.questRouter, kanji: "行", label: "動く" },
  { href: APP_ROUTES.myAce, kanji: "私", label: "My ACE" },
];

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <nav className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-white/[0.10] bg-[#0b111d]/92 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="grid grid-cols-6 gap-1 text-center text-[9px] font-semibold text-[#8d99ac]">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-1 py-2 transition hover:bg-white/[0.05] hover:text-white"
            >
              <div className="font-serif text-base text-[#dce4ef]">{item.kanji}</div>
              <div className="mt-0.5">{item.label}</div>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
