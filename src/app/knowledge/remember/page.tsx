"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Cadence = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "turning_point";
type Topic = "身体" | "時間" | "人間関係" | "選択" | "心" | "社会";
type LifeCard = {
  id: string;
  kind: "fact" | "perspective";
  topic: Topic;
  title: string;
  truth: string;
  perspective: string;
  question: string;
  action: string;
  defaultCadence: Cadence;
  qualification?: string;
  source?: { label: string; url: string };
};
type Review = { lastAt: number; nextAt: number; count: number; cadence: Cadence; note?: string };
type ReviewMap = Record<string, Review>;

const STORAGE_KEY = "ace_life_remind_v1";
const CADENCES: { key: Cadence; label: string; days: number | null }[] = [
  { key: "daily", label: "毎日", days: 1 },
  { key: "weekly", label: "毎週", days: 7 },
  { key: "monthly", label: "毎月", days: 30 },
  { key: "quarterly", label: "3か月", days: 90 },
  { key: "yearly", label: "毎年", days: 365 },
  { key: "turning_point", label: "転機に", days: null },
];
const TOPICS: Topic[] = ["身体", "時間", "人間関係", "選択", "心", "社会"];
const DAY_MS = 24 * 60 * 60 * 1000;

const CARDS: LifeCard[] = [
  {
    id: "cell-daily", kind: "fact", topic: "身体",
    title: "毎日、身体は静かに更新されている",
    truth: "研究では、成人の身体で1日あたり約3,300億個の細胞が更新されると推計されている。",
    perspective: "変化は、目に見えなくても進んでいる。今日の自分と昨日の自分は、完全に同一ではない。",
    question: "未来の自分に、今日どんなものを手渡したい？",
    action: "次の食事・睡眠・休息の一つを、丁寧に選んでみる。",
    qualification: "推計値。すべての細胞が同じ速さで入れ替わるわけではなく、「一定期間で身体が丸ごと新品になる」という意味ではない。",
    defaultCadence: "monthly",
    source: { label: "Nature Medicine（2021）", url: "https://www.nature.com/articles/s41591-020-01182-9" },
  },
  {
    id: "gut-epithelium", kind: "fact", topic: "身体",
    title: "小腸の表面は、数日単位で新しくなる",
    truth: "小腸の上皮は、一般に約3〜5日という短い周期で更新される。",
    perspective: "身体には、私たちが意識していないところで維持と修復を続ける仕組みがある。",
    question: "当たり前だと思っている身体の働きに、どんな感謝ができるだろう？",
    action: "食事を一回、急がずに味わう。",
    qualification: "小腸の上皮についての目安。腸全体のすべての細胞が3〜5日で入れ替わるわけではない。",
    defaultCadence: "monthly",
    source: { label: "Intestinal epithelium review（2014）", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4182169/" },
  },
  {
    id: "skin-epidermis", kind: "fact", topic: "身体",
    title: "肌の表面は、数週間をかけて更新される",
    truth: "表皮の細胞は分化して表面へ移動し、やがて剥がれ落ちる。目安は数週間単位で、年齢や個人差でも変わる。",
    perspective: "見た目の変化も、すぐに答えが出るものばかりではない。",
    question: "短期の結果を求めすぎて、長い変化を見失っていない？",
    action: "身体に関する小さな変化を、焦らず観察する。",
    qualification: "皮膚全体が一定日数で完全に更新されるという意味ではない。表皮の部位・状態・測定方法で目安は変わる。",
    defaultCadence: "monthly",
    source: { label: "Westlake Dermatology（2023）", url: "https://www.westlakedermatology.com/blog/skin-cell-turnover/" },
  },
  {
    id: "red-blood-cell", kind: "fact", topic: "身体",
    title: "赤血球の寿命は約120日",
    truth: "健康な成人の赤血球は、およそ120日をかけて新しい細胞に置き換わっていく。",
    perspective: "身体には、古いものの役割が終わり、新しいものへと受け渡される流れがある。",
    question: "もう十分に役割を果たした習慣や考え方はある？",
    action: "今の自分には不要になった習慣を一つ書き出す。",
    qualification: "これは赤血球の平均寿命の話。血液のすべての成分が120日で一斉に入れ替わるわけではない。",
    defaultCadence: "quarterly",
    source: { label: "PubMed / 赤血球ライフサイクル（2021）", url: "https://pubmed.ncbi.nlm.nih.gov/34342697/" },
  },
  {
    id: "liver-renewal", kind: "fact", topic: "身体",
    title: "肝臓の細胞にも、世代交代がある",
    truth: "炭素14による推定研究では、人間の肝臓の細胞の平均年齢は約3年未満と報告された。",
    perspective: "同じ臓器であり続けながら、その内側では変化が起きている。",
    question: "自分らしさを残しながら、変えてもよいものは何だろう？",
    action: "守りたいものと変えたいものを、一つずつ挙げる。",
    qualification: "細胞の種類や性質で更新速度は異なる。肝臓が3年で完全に新品になるという意味ではない。",
    defaultCadence: "yearly",
    source: { label: "Cell Systems（2022）", url: "https://pubmed.ncbi.nlm.nih.gov/35649419/" },
  },
  {
    id: "long-lived-neurons", kind: "fact", topic: "身体",
    title: "変わり続ける身体にも、長く残る細胞がある",
    truth: "成人の脳の一部には、本人とほぼ同じ年齢の神経細胞があることが研究で示されている。",
    perspective: "変化することと、何かを受け継ぐことは矛盾しない。",
    question: "これからの自分へ、失わずに持っていきたいものは？",
    action: "大切にしたい価値観を一言で書く。",
    qualification: "脳のすべての細胞が更新されないわけではない。成人の神経新生には部位ごとに未解決の論点がある。",
    defaultCadence: "yearly",
    source: { label: "Cell（2005）", url: "https://pubmed.ncbi.nlm.nih.gov/16009139/" },
  },
  {
    id: "finite-time", kind: "perspective", topic: "時間",
    title: "後回しにした一日も、人生の一日",
    truth: "時間には限りがあり、使わなかった時間を後から貯め直すことはできない。",
    perspective: "急ぎ続けることと、大切なことを優先することは、同じではない。",
    question: "今日、何を後回しにすると後悔しそう？",
    action: "大切な人や物事に、5分だけ時間を渡す。",
    defaultCadence: "weekly",
  },
  {
    id: "relationships", kind: "perspective", topic: "人間関係",
    title: "いつでも会える、とは限らない",
    truth: "予定は組み直せても、人と過ごせる機会が無限にあるわけではない。",
    perspective: "大切な関係は、何かを達成した後のご褒美だけではない。",
    question: "最近、ちゃんと声を聞いていない大切な人は？",
    action: "一人に、用事のない連絡をしてみる。",
    defaultCadence: "weekly",
  },
  {
    id: "change-the-question", kind: "perspective", topic: "選択",
    title: "答えが見つからないとき、問いを変えてもいい",
    truth: "同じ状況でも、何に注目するかで考えられる選択肢は変わる。",
    perspective: "「どうすれば勝てる？」だけではなく「どこで、何のために挑戦したい？」と問うこともできる。",
    question: "今、解こうとしている問題は、本当に解きたい問題？",
    action: "現在の悩みを、別の問いに言い換える。",
    defaultCadence: "monthly",
  },
  {
    id: "rest-not-failure", kind: "perspective", topic: "心",
    title: "休むことは、前進の反対ではない",
    truth: "人の集中力や身体的な能力は、いつも一定とは限らない。",
    perspective: "長く活動を続けるために、休息を選ぶ日があってもいい。",
    question: "今日は進める日？ それとも回復を優先する日？",
    action: "必要なら、予定から一つ減らす。",
    defaultCadence: "daily",
  },
  {
    id: "own-enough", kind: "perspective", topic: "選択",
    title: "誰かの「正解」が、自分の正解とは限らない",
    truth: "人によって、置かれた環境や使える資源、守りたいものは異なる。",
    perspective: "他人の生き方を評価する前に、自分の「十分」を知っておきたい。",
    question: "今の自分にとって、どれくらいあれば十分？",
    action: "時間・お金・成果のどれか一つで「十分」を定義してみる。",
    defaultCadence: "quarterly",
  },
  {
    id: "generations", kind: "perspective", topic: "社会",
    title: "受け取ったものを、どう手渡す？",
    truth: "日々の暮らしには、過去の誰かの工夫や働きが積み重なっている。",
    perspective: "自分の人生を大切にすることと、次の世代を大切にすることは両立できる。",
    question: "自分が次の世代に渡したいものは何だろう？",
    action: "今日見つけた知恵を、一つだけ言葉に残す。",
    defaultCadence: "yearly",
  },
];

function cadenceLabel(c: Cadence): string {
  return CADENCES.find((item) => item.key === c)?.label ?? "毎月";
}
function nextDue(c: Cadence, now: number): number {
  const days = CADENCES.find((item) => item.key === c)?.days;
  return days === null || days === undefined ? Number.MAX_SAFE_INTEGER : now + days * DAY_MS;
}
function loadReviews(): ReviewMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as ReviewMap;
  } catch {
    // Private mode or invalid legacy state: the reading experience still works.
  }
  return {};
}
function dueLabel(review: Review | undefined, now: number): string {
  if (!review) return "未読";
  if (review.cadence === "turning_point") return "転機に再読";
  if (review.nextAt <= now) return "見返すタイミング";
  const days = Math.max(1, Math.ceil((review.nextAt - now) / DAY_MS));
  return days === 1 ? "明日以降" : "約" + days + "日後";
}

export default function LifeRemindPage() {
  const [reviews, setReviews] = useState<ReviewMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [activeId, setActiveId] = useState(CARDS[0].id);
  const [topic, setTopic] = useState<Topic | "すべて">("すべて");
  const [note, setNote] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [showAll, setShowAll] = useState(false);
  const now = Date.now();

  useEffect(() => {
    const data = loadReviews();
    setReviews(data);
    setHydrated(true);
    const firstDue = CARDS.find((c) => !data[c.id] || data[c.id].nextAt <= Date.now());
    if (firstDue) setActiveId(firstDue.id);
  }, []);

  const visibleCards = useMemo(
    () => topic === "すべて" ? CARDS : CARDS.filter((item) => item.topic === topic),
    [topic],
  );
  const active = CARDS.find((item) => item.id === activeId) ?? CARDS[0];
  const review = reviews[active.id];
  const currentCadence = review?.cadence ?? active.defaultCadence;
  const reviewedCount = CARDS.filter((item) => Boolean(reviews[item.id])).length;
  const dueCount = CARDS.filter((item) => !reviews[item.id] || reviews[item.id].nextAt <= now).length;

  function selectCard(card: LifeCard) {
    setActiveId(card.id);
    setNote(reviews[card.id]?.note ?? "");
    setSavedMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveReview(cadence: Cadence, snooze = false) {
    const at = Date.now();
    const updated: ReviewMap = {
      ...reviews,
      [active.id]: {
        lastAt: at,
        nextAt: snooze ? at + DAY_MS : nextDue(cadence, at),
        count: (review?.count ?? 0) + (snooze ? 0 : 1),
        cadence: snooze ? currentCadence : cadence,
        note: note.trim().slice(0, 1500),
      },
    };
    setReviews(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedMessage(snooze ? "明日以降に表示します。" : "この端末に記録しました。");
    } catch {
      setSavedMessage("このブラウザでは保存が使えません。開いている間は記録されています。");
    }
    const other = CARDS.find((c) => c.id !== active.id && (!updated[c.id] || updated[c.id].nextAt <= at));
    if (other) {
      setActiveId(other.id);
      setNote(updated[other.id]?.note ?? "");
    }
  }

  function changeCadence(cadence: Cadence) {
    const updated: ReviewMap = {
      ...reviews,
      [active.id]: {
        lastAt: review?.lastAt ?? Date.now(),
        count: review?.count ?? 0,
        nextAt: review ? nextDue(cadence, Date.now()) : 0,
        cadence,
        note: note.trim().slice(0, 1500),
      },
    };
    setReviews(updated);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedMessage("見返す周期を保存しました。");
    } catch {
      setSavedMessage("保存できませんでした。この画面では設定を反映しています。");
    }
  }

  return (
    <div className="min-h-screen bg-[#090f18] pb-28 text-[#ecf0e9]">
      <main className="mx-auto w-full max-w-5xl min-w-0 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <nav className="mb-7 text-xs text-[#a5b0bd]"><Link href="/knowledge" className="inline-flex min-h-11 items-center underline underline-offset-4">← ACE Knowledge に戻る</Link></nav>
        <header className="max-w-3xl">
          <p className="text-[10px] font-bold tracking-[.2em] text-[#f7b978]">ACE / LIFE REMIND · 試作版</p>
          <h1 className="mt-3 text-balance font-serif text-3xl font-semibold leading-tight sm:text-5xl">大切なことを、<span className="text-[#ffb978]">思い出す。</span></h1>
          <p className="mt-4 text-sm leading-8 text-[#abb8c7]">知っているのに忘れてしまう事実や、見失いがちな視点。今日必要な一枚だけ読んで、次に思い出したい時期を選ぶ。</p>
        </header>

        <section aria-label="読み返しの状態" className="mt-7 grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="text-xs text-[#a3aeba]">触れたカード</div><div className="mt-1 text-2xl font-bold">{hydrated ? reviewedCount : "—"}<span className="ml-1 text-sm font-normal text-[#a3aeba]">/ {CARDS.length}</span></div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><div className="text-xs text-[#a3aeba]">今、見返せるカード</div><div className="mt-1 text-2xl font-bold">{hydrated ? dueCount : "—"}<span className="ml-1 text-sm font-normal text-[#a3aeba]">件</span></div></div>
        </section>

        <section aria-label="今の一枚" className="mt-7 overflow-hidden rounded-3xl border border-[#f7b978]/20 bg-[#122033] shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 bg-[#172b40] px-5 py-4 sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-semibold tracking-wide text-[#f5c991]">{active.kind === "fact" ? "確認された知見・事実" : "考え方・視点"}</span>
              <span className="rounded-full border border-white/15 px-3 py-1.5 text-[#bbc8d1]">{active.topic} · {dueLabel(review, now)}</span>
            </div>
          </div>
          <div className="space-y-6 px-5 py-7 sm:px-8 sm:py-9">
            <div>
              <h2 className="text-balance font-serif text-2xl font-semibold leading-relaxed sm:text-3xl">{active.title}</h2>
              <p className="mt-4 text-base leading-8 text-[#e5ebf0]">{active.truth}</p>
              {active.qualification && <p className="mt-3 rounded-xl border border-white/10 bg-white/[.035] p-3 text-xs leading-6 text-[#bac7d3]">正確にいうと：{active.qualification}</p>}
              {active.source && <a className="mt-3 inline-flex min-h-11 items-center text-xs text-[#fac892] underline underline-offset-4" href={active.source.url} target="_blank" rel="noopener noreferrer">出典：{active.source.label} ↗</a>}
              {active.kind === "perspective" && <p className="mt-2 text-xs leading-6 text-[#aebcc8]">※このカードは人生を見直すための視点であり、科学的な法則を主張するものではありません。</p>}
            </div>

            <div className="rounded-2xl bg-[#25364a] p-4 sm:p-5">
              <div className="text-xs font-bold tracking-widest text-[#f7c78d]">別の見方</div>
              <p className="mt-2 text-sm leading-8">{active.perspective}</p>
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-[#b4c0d0]">自分への問い</div>
              <p className="mt-2 font-serif text-lg leading-8 text-[#fff2dd]">{active.question}</p>
              <p className="mt-3 text-xs leading-6 text-[#aebac8]">小さな一歩：{active.action}</p>
            </div>
            <label className="block text-xs text-[#bbc7d1]" htmlFor="life-remind-note">残したい気づき（任意・端末内のみ）</label>
            <textarea id="life-remind-note" maxLength={1500} rows={2} className="w-full min-w-0 resize-y rounded-xl border border-white/15 bg-[#101a2a] px-4 py-3 text-base leading-7 text-white placeholder:text-[#78879a] focus:border-[#f7b978] focus:outline-none" placeholder="書かなくてもOK" value={note} onChange={(event) => setNote(event.target.value)} />

            <div>
              <p className="text-xs text-[#b6c3ce]">次はいつ思い出したい？</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="見返す頻度">
                {CADENCES.map((item) => <button key={item.key} type="button" onClick={() => changeCadence(item.key)} aria-pressed={currentCadence === item.key} className={"min-h-11 rounded-xl border px-2 py-2 text-xs font-semibold transition " + (currentCadence === item.key ? "border-[#f7b978] bg-[#f7b978] text-[#172033]" : "border-white/15 bg-white/[.04] text-[#c4d1dd] hover:border-[#f7b978]/50")}>{item.label}</button>)}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <button type="button" onClick={() => saveReview(currentCadence)} className="min-h-12 rounded-xl bg-[#ffb978] px-5 py-3 text-sm font-bold text-[#151c25] transition hover:bg-[#ffd29b]">思い出した・次の一枚へ →</button>
              <button type="button" onClick={() => saveReview(currentCadence, true)} className="min-h-12 rounded-xl border border-white/15 px-5 py-3 text-sm text-[#d5dce5] hover:bg-white/[.06]">今はパス</button>
            </div>
            <p aria-live="polite" className="min-h-5 text-xs text-[#a8dfc4]">{savedMessage}</p>
          </div>
        </section>

        <section className="mt-10" aria-label="カードを探す">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><h2 className="font-serif text-2xl font-semibold">人生のリマインド図鑑</h2><p className="mt-2 text-xs leading-6 text-[#a6b4c4]">読みたいテーマや状況から、自由に選べます。</p></div>
            <button type="button" className="min-h-11 rounded-xl border border-white/15 px-4 text-sm" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? "カード一覧を閉じる −" : "カード一覧を見る ＋"}</button>
          </div>
          {showAll && <>
            <div className="mt-5 flex flex-wrap gap-2" aria-label="テーマで絞る">
              {(["すべて", ...TOPICS] as const).map((t) => <button key={t} type="button" onClick={() => setTopic(t)} aria-pressed={topic === t} className={"min-h-11 rounded-full border px-3 text-xs transition " + (topic === t ? "border-[#ffb978] bg-[#ffb978]/15 text-[#ffcf99]" : "border-white/15 text-[#b8c7d3]")}>{t}</button>)}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {visibleCards.map((card) => <button type="button" key={card.id} onClick={() => selectCard(card)} className={"min-w-0 rounded-2xl border p-4 text-left transition hover:border-[#ffb978]/60 " + (active.id === card.id ? "border-[#ffb978] bg-[#ffb978]/10" : "border-white/10 bg-white/[.035]")}>
                <span className="text-xs text-[#ffca93]">{card.topic} · {card.kind === "fact" ? "事実" : "視点"}</span>
                <span className="mt-2 block text-sm font-semibold leading-6">{card.title}</span>
                <span className="mt-2 block text-xs text-[#a7b3c1]">{dueLabel(reviews[card.id], now)} · {cadenceLabel(reviews[card.id]?.cadence ?? card.defaultCadence)}</span>
              </button>)}
            </div>
          </>}
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[.035] p-5 text-xs leading-7 text-[#acb9c6]">
          <h2 className="mb-1 text-sm font-bold text-[#e9f0f2]">この試作の約束</h2>
          <p>事実と解釈を分け、出典や例外を表示します。頻度は自分で決められ、回答しなくても構いません。読んだ履歴とメモはこのブラウザの保存領域のみに置き、端末をまたぐ同期・通知はまだありません。大切なことを思い出すためのもので、医療判断や心理的な評価には使いません。</p>
        </section>
      </main>
    </div>
  );
}
