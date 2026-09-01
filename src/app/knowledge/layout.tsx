import Link from "next/link";
import { APP_ROUTES } from "@/lib/appRoutes";

export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-white/[0.10] bg-[#0b111d]/90 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-[#9aa7ba]">
          <Link href={APP_ROUTES.knowledge} className="rounded-xl px-3 py-2.5 hover:bg-white/[0.05] hover:text-white">
            新 Today
          </Link>
          <Link href={APP_ROUTES.knowledgeAsk} className="rounded-xl bg-[#ff8a1f]/[0.10] px-3 py-2.5 text-[#ffad62] hover:bg-[#ff8a1f]/[0.16]">
            問 Ask
          </Link>
          <Link href={APP_ROUTES.knowledgeLibrary} className="rounded-xl px-3 py-2.5 hover:bg-white/[0.05] hover:text-white">
            知 Library
          </Link>
        </div>
      </nav>
    </>
  );
}
