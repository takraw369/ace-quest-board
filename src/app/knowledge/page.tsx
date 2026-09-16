import Link from "next/link";
import { APP_ROUTES } from "@/lib/appRoutes";

const trailheads = [
  {
    icon: "🌊",
    name: "FLOW 基礎",
    oneLine: "今の自分を知り、次の一歩を選ぶ。",
    badge: "ACEに含む",
    href: APP_ROUTES.questRouter,
  },
  {
    icon: "🫀",
    name: "BODY",
    oneLine: "身体から整えて、動ける状態をつくる。",
    badge: "ACEに含む",
    href: APP_ROUTES.dictionary,
  },
  {
    icon: "🧠",
    name: "MIND",
    oneLine: "思考・感情・注意の使い方を探る。",
    badge: "ACEに含む",
    href: APP_ROUTES.knowledgeAsk,
  },
];

const packs = [
  { icon: "🥕", name: "食と健康", note: "食べる・整える・観察する", status: "追加テーマ" },
  { icon: "🧭", name: "学び方", note: "好奇心から自分の学習法へ", status: "追加テーマ" },
  { icon: "🤝", name: "人間関係", note: "距離・対話・つながりを学ぶ", status: "追加テーマ" },
  { icon: "⚡", name: "AIと創作", note: "つくる・伝える・資産にする", status: "追加テーマ" },
  { icon: "🏃", name: "Athlete", note: "身体知・競技・成長を深める", status: "追加テーマ" },
  { icon: "🌍", name: "World Quest", note: "世界を見て、常識を揺らす", status: "追加テーマ" },
];

const assetTypes = [
  { icon: "▶", label: "動画", text: "観てつかむ" },
  { icon: "▤", label: "スライド", text: "図で理解する" },
  { icon: "✎", label: "ワーク", text: "自分で試す" },
  { icon: "◆", label: "Quest", text: "体験に変える" },
];

export default function KnowledgePage() {
  return (
    <div className="min-h-screen bg-[#080d16] pb-28 text-[#edf2f8] selection:bg-[#ff8a1f]/25">
      <div
        className="pointer-events-none fixed inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 8%,rgba(255,138,31,.12),transparent 25%),radial-gradient(circle at 82% 32%,rgba(48,86,145,.15),transparent 32%)",
        }}
      />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#ff8a1f]/30 bg-[#ff8a1f]/[0.06] font-serif text-lg text-[#ffad62]">
              知
            </div>
            <div>
              <div className="text-[9px] font-bold tracking-[.22em] text-[#ff9a42]">ACE BASE CAMP</div>
              <div className="font-serif text-lg font-semibold">Knowledge</div>
            </div>
          </div>
          <Link
            href={APP_ROUTES.myAce}
            className="rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2 text-xs text-[#aab5c5] transition hover:bg-white/[0.06] hover:text-white"
          >
            My ACE
          </Link>
        </header>

        <section className="overflow-hidden rounded-[30px] border border-white/[0.09] bg-white/[0.035] p-5 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-[#ff8a1f]/25 bg-[#ff8a1f]/[0.07] px-3 py-1 text-[9px] font-bold tracking-[.18em] text-[#ffad62]">
                FIND YOUR NEXT MOUNTAIN
              </div>
              <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-5xl">
                次に登る山を、
                <span className="text-[#ffad62]">直感で見つける。</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#96a2b4]">
                ACEの知識は、読む棚ではなく登山口。動画・スライド・ワーク・Questが、テーマごとに一つの体験へつながります。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={APP_ROUTES.questRouter}
                  className="rounded-2xl bg-[#ff8a1f] px-5 py-3 text-sm font-bold text-[#07152e] transition hover:brightness-110"
                >
                  今日の山を選ぶ
                </Link>
                <Link
                  href={APP_ROUTES.dictionary}
                  className="rounded-2xl border border-white/[0.10] bg-white/[0.035] px-5 py-3 text-sm font-semibold text-[#d8e0eb] transition hover:bg-white/[0.07]"
                >
                  困りごとから探す
                </Link>
              </div>
            </div>

            <div className="relative min-h-[270px] overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#0c1421]">
              <div className="absolute inset-x-0 bottom-0 h-[72%] bg-[linear-gradient(155deg,transparent_0_20%,rgba(74,101,142,.32)_20.3%_39%,transparent_39.3%),linear-gradient(205deg,transparent_0_31%,rgba(255,138,31,.18)_31.3%_48%,transparent_48.3%),linear-gradient(150deg,transparent_0_42%,rgba(65,86,120,.42)_42.3%_70%,transparent_70.3%)]" />
              <div className="absolute left-[13%] top-[18%] text-4xl">⛰️</div>
              <div className="absolute right-[17%] top-[30%] text-3xl">🏔️</div>
              <div className="absolute left-1/2 top-[52%] -translate-x-1/2 rounded-full border border-[#ff8a1f]/30 bg-[#ff8a1f]/10 px-3 py-1 text-[10px] font-bold text-[#ffad62]">
                BASE CAMP
              </div>
              <div className="absolute inset-x-5 bottom-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl border border-white/[0.08] bg-[#0a101a]/80 px-2 py-3 text-xs">知る</div>
                <div className="rounded-2xl border border-white/[0.08] bg-[#0a101a]/80 px-2 py-3 text-xs">試す</div>
                <div className="rounded-2xl border border-white/[0.08] bg-[#0a101a]/80 px-2 py-3 text-xs">残る</div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[9px] font-bold tracking-[.2em] text-[#68768b]">OPEN NOW</div>
              <h2 className="mt-1 font-serif text-2xl font-semibold">いま登れる山</h2>
            </div>
            <span className="text-xs text-[#6f7c91]">まずは3つだけ</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {trailheads.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="group rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 transition hover:-translate-y-0.5 hover:border-[#ff8a1f]/30 hover:bg-white/[0.045]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-4xl">{item.icon}</div>
                  <span className="rounded-full border border-[#ff8a1f]/20 bg-[#ff8a1f]/[0.06] px-2.5 py-1 text-[9px] font-bold text-[#ffad62]">
                    {item.badge}
                  </span>
                </div>
                <h3 className="mt-8 font-serif text-2xl font-semibold">{item.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#8d99ab]">{item.oneLine}</p>
                <div className="mt-5 text-xs font-bold text-[#c7d0dd] transition group-hover:text-[#ffad62]">登山口へ →</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-5 md:p-7">
          <div className="grid gap-6 md:grid-cols-[.8fr_1.2fr] md:items-center">
            <div>
              <div className="text-[9px] font-bold tracking-[.2em] text-[#68768b]">YOUR TOOLBOX</div>
              <h2 className="mt-1 font-serif text-2xl font-semibold">教材は、ここにたまる。</h2>
              <p className="mt-3 max-w-md text-sm leading-7 text-[#8f9bad]">
                つくった動画やスライドは単発で埋もれず、対応する山の「道具」として残していきます。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {assetTypes.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-[#0d1420] p-4 text-center">
                  <div className="text-2xl text-[#ffad62]">{item.icon}</div>
                  <div className="mt-2 text-sm font-bold">{item.label}</div>
                  <div className="mt-1 text-[10px] text-[#728096]">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <div className="text-[9px] font-bold tracking-[.2em] text-[#68768b]">EXPLORE MORE</div>
            <h2 className="mt-1 font-serif text-2xl font-semibold">次の山を見つける</h2>
            <p className="mt-2 text-sm text-[#7f8ba0]">ACEの基本料金で土台をつくり、必要なテーマだけ追加できる設計へ。</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packs.map((pack) => (
              <div key={pack.name} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-3xl">{pack.icon}</div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] font-bold text-[#7f8ca0]">
                    {pack.status}
                  </span>
                </div>
                <div className="mt-5 font-serif text-lg font-semibold">{pack.name}</div>
                <div className="mt-1 text-xs leading-5 text-[#7d899c]">{pack.note}</div>
                <div className="mt-4 text-[10px] font-bold text-[#59677b]">COMING NEXT</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="text-2xl">①</div>
            <div className="mt-4 font-bold">見つける</div>
            <div className="mt-1 text-xs leading-6 text-[#7f8ca0]">気になる山を直感で選ぶ。</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="text-2xl">②</div>
            <div className="mt-4 font-bold">体験する</div>
            <div className="mt-1 text-xs leading-6 text-[#7f8ca0]">動画・資料・Questをつなげて試す。</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <div className="text-2xl">③</div>
            <div className="mt-4 font-bold">自分の知恵になる</div>
            <div className="mt-1 text-xs leading-6 text-[#7f8ca0]">EvidenceがMy ACEに残り、次の山へつながる。</div>
          </div>
        </section>
      </main>
    </div>
  );
}
