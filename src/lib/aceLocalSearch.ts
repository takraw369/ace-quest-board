import { DAILY_QUIZZES } from "@/lib/dailyQuizData";

export type AceSearchDocument = {
  id: string;
  title: string;
  text: string;
  category: string;
  href: string;
};

const entryPoints: AceSearchDocument[] = [
  {
    id: "ace-dictionary",
    title: "困りごとから探す（ACE Dictionary）",
    text: "不安、緊張、行動できない、迷い、モチベーションなど今の困りごとを入り口に学習を始める。",
    category: "ACEの入口",
    href: "/dictionary",
  },
  {
    id: "ace-calibration",
    title: "身体・認知・感情・行動を測る",
    text: "ACEのCalibration。BODY COGNITION EMOTION ACTIONの現在地を確かめ、いま必要な練習とQuestを見つける。",
    category: "現在地の確認",
    href: "/calibration",
  },
  {
    id: "ace-quest",
    title: "Questを選び、実践につなげる",
    text: "今の自分に合うQuestを選び、予測、行動、結果、振り返りを循環させて成長の証拠を残す。",
    category: "行動・Quest",
    href: "/quest-router",
  },
  {
    id: "ace-athlete",
    title: "ACE Athlete 練習日誌",
    text: "練習前のコンディションチェック、練習メニュー、気づき、振り返り、成長記録を継続して残す。",
    category: "アスリート",
    href: "/athlete",
  },
  {
    id: "ace-knowledge",
    title: "ACE Knowledge Base Camp",
    text: "動画・スライド・ワーク・Questをつなぎ、知識を学びと体験に変える教材ライブラリ。",
    category: "教材",
    href: "/knowledge",
  },
  {
    id: "ace-myself",
    title: "My ACE 成長とEvidence",
    text: "過去の実践と振り返りを証拠として蓄積し、自分のパターンと次の行動に活かす。",
    category: "成長記録",
    href: "/my-ace",
  },
];

export const ACE_SEARCH_DOCUMENTS: AceSearchDocument[] = [
  ...entryPoints,
  ...DAILY_QUIZZES.map((quiz) => ({
    id: "quiz-" + quiz.id,
    title: quiz.question,
    text: quiz.explanation + " " + quiz.action + " 出典・位置づけ: " + quiz.sourceLabel,
    category: "学習カード / " + quiz.category,
    href: "/today",
  })),
];

function normalise(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja").replace(/\s+/g, " ").trim();
}

function bigrams(value: string) {
  const chars = Array.from(value.replace(/[\s、。，．！？!?,;:：]/g, ""));
  const grams = new Set<string>();
  for (let i = 0; i + 1 < chars.length; i += 1) grams.add(chars[i] + chars[i + 1]);
  if (chars.length === 1) grams.add(chars[0]);
  return grams;
}

export function keywordSearch(query: string): AceSearchDocument[] {
  const q = normalise(query);
  if (!q) return ACE_SEARCH_DOCUMENTS.slice(0, 8);
  const qGrams = bigrams(q);
  const ranked = ACE_SEARCH_DOCUMENTS.map((doc) => {
    const title = normalise(doc.title);
    const text = normalise(doc.text);
    const titleGrams = bigrams(title);
    const textGrams = bigrams(text);
    let score = title.includes(q) ? 14 : 0;
    if (text.includes(q)) score += 8;
    for (const gram of qGrams) {
      if (titleGrams.has(gram)) score += 3;
      if (textGrams.has(gram)) score += 1;
    }
    return { doc, score };
  });
  return ranked.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 12).map((item) => item.doc);
}
