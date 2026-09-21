import type {
  CompiledQuest,
  CompiledQuestPlan,
  GrowthAxis,
} from '@/types/questCompiler';

const STOP_WORDS = new Set([
  'こと', 'もの', 'ため', 'これ', 'それ', 'ある', 'いる', 'する', 'なる', 'できる',
  'から', 'まで', 'よう', 'という', 'として', 'そして', 'しかし', 'です', 'ます',
]);

const AXIS_RULES: Array<{ axis: GrowthAxis; words: string[] }> = [
  { axis: 'body', words: ['身体', '運動', '睡眠', '呼吸', '回復', '筋力', '栄養', '姿勢'] },
  { axis: 'focus', words: ['集中', '注意', '認知', '判断', '反応', '脳', '情報'] },
  { axis: 'mind', words: ['感情', '不安', '自信', '予測', '解釈', 'メンタル', '心'] },
  { axis: 'learning', words: ['学習', '研究', '知識', '理解', '振り返り', '実験'] },
  { axis: 'connection', words: ['家族', '仲間', 'チーム', '対話', 'コミュニティ', '関係'] },
  { axis: 'legacy', words: ['教える', '次世代', '社会', '還流', '伝える', '仕組み'] },
];

function cleanText(text: string) {
  return text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function splitSentences(text: string) {
  return cleanText(text)
    .split(/(?<=[。！？!?\n])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function truncate(text: string, max = 72) {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function extractKeywords(text: string, limit = 6) {
  const tokens = cleanText(text).match(/[一-龠々ぁ-んァ-ヶA-Za-z0-9ー]{2,}/g) ?? [];
  const counts = new Map<string, number>();

  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([token]) => token);
}

function inferAxes(text: string): GrowthAxis[] {
  const axes = AXIS_RULES.filter(({ words }) => words.some((word) => text.includes(word))).map(
    ({ axis }) => axis,
  );
  return [...new Set<GrowthAxis>(['execution', ...axes])].slice(0, 3);
}

function quest(
  planId: string,
  suffix: string,
  kind: CompiledQuest['kind'],
  title: string,
  description: string,
  clearCondition: string,
  xp: number,
  growthAxes: GrowthAxis[],
  day?: number,
): CompiledQuest {
  return {
    id: `${planId}-${suffix}`,
    kind,
    title,
    description,
    clearCondition,
    xp,
    growthAxes,
    day,
  };
}

export function compileToQuestPlan(input: {
  title?: string;
  text: string;
  now?: Date;
}): CompiledQuestPlan {
  const text = cleanText(input.text);
  if (text.length < 20) {
    throw new Error('Quest化する本文を20文字以上入力してください。');
  }

  const now = input.now ?? new Date();
  const planId = `plan-${now.getTime()}`;
  const sentences = splitSentences(text);
  const keywords = extractKeywords(text);
  const sourceTitle = input.title?.trim() || truncate(sentences[0] ?? text, 36);
  const coreSentence = truncate(sentences[0] ?? text, 96);
  const axes = inferAxes(text);
  const theme = keywords.slice(0, 3).join('・') || sourceTitle;

  const mainQuest = quest(
    planId,
    'main',
    `「${sourceTitle}」を現実で1つ試す`,
    `読むだけで終わらせず、${theme}から自分の現実で検証できる仮説を1つ選び、7日以内に実践する。`,
    '実践結果を「事実 / 感じたこと / 次に変えること」の3点で記録する。',
    120,
    axes,
  );

  const subQuests = [
    quest(
      planId,
      'sub-1',
      '核を1文に圧縮する',
      `本文の中心仮説を、自分の言葉で1文にする。起点: ${coreSentence}`,
      '「自分は何を試すのか」が1文で言える。',
      30,
      ['learning', 'focus'],
    ),
    quest(
      planId,
      'sub-2',
      '自分の現在地へ接続する',
      '競技・仕事・健康・家族・学習のどこで、この考えが使えるかを1場面選ぶ。',
      '具体的な「いつ / どこで / 何をする」が決まっている。',
      40,
      ['mind', 'execution'],
    ),
    quest(
      planId,
      'sub-3',
      '7日実験に変換する',
      '成功を証明するのではなく、小さく試して観察データを取れる形へ変換する。',
      'Before指標とAfter指標を1つずつ決める。',
      50,
      axes,
    ),
  ];

  const dailySpecs = [
    ['観察する', '今の状態と課題を1つだけ記録する。', '30秒以上観察し、1行記録する。'],
    ['選ぶ', '記事から今日試す要素を1つに絞る。', 'やることを1つ、やらないことを1つ決める。'],
    ['小さく試す', '5〜15分で終わる最小実験を行う。', '結果に関係なく実験を完了する。'],
    ['差を見る', 'Before / Afterの違いを観察する。', '変化・無変化・悪化のどれかを記録する。'],
    ['調整する', '昨日の結果から条件を1つだけ変える。', '変更点と理由を1行で残す。'],
    ['人に説明する', '学びを誰かに伝える前提で3行にまとめる。', '「なぜ / 何を / どう試した」を説明できる。'],
    ['統合する', '7日分を振り返り、残すものと捨てるものを決める。', '次のQuestを1つ決める。'],
  ] as const;

  const dailyQuests = dailySpecs.map(([title, description, clearCondition], index) =>
    quest(
      planId,
      `daily-${index + 1}`,
      'daily',
      `Day ${index + 1}｜${title}`,
      description,
      clearCondition,
      20 + index * 5,
      index === 5 ? ['learning', 'connection'] : index === 6 ? ['learning', 'legacy'] : axes,
      index + 1,
    ),
  );

  return {
    id: planId,
    sourceTitle,
    sourceExcerpt: truncate(text, 180),
    sourceKeywords: keywords,
    createdAt: now.toISOString(),
    mainQuest,
    subQuests,
    dailyQuests,
    reviewPrompts: [
      '実際に起きた事実は何だった？',
      '自分の予測や解釈と、どこが違った？',
      '次に残す行動・やめる行動・変える条件は何？',
    ],
    nextUnlock: '7日分のQuest Logが揃ったら、次の難易度・Skill Quest・他者への翻訳Questを解放する。',
  };
}
