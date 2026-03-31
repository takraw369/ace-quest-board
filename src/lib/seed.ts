import type { Vision, Milestone, Quest, Task } from '@/types/quest';

export const SEED_VISIONS: Vision[] = [
  {
    id: 'v1',
    title: 'ACEを日本のアスリート教育スタンダードにする',
    description: 'ACEコーチングを全国に広める',
    color: '#6366f1',
    icon: '🏆',
    createdAt: new Date().toISOString(),
    order: 1,
  },
  {
    id: 'v2',
    title: 'オンラインビジネスで月収100万円を達成する',
    description: 'デジタルプロダクトとコーチングで収益化',
    color: '#10b981',
    icon: '💰',
    createdAt: new Date().toISOString(),
    order: 2,
  },
];

export const SEED_MILESTONES: Milestone[] = [
  {
    id: 'm1',
    visionId: 'v1',
    title: 'ACE 初クライアント3名獲得',
    description: '3ヶ月コーチング初クライアントを獲得する',
    status: 'active',
    order: 1,
  },
  {
    id: 'm2',
    visionId: 'v1',
    title: 'ACE受講者10名突破',
    description: 'コミュニティを10名まで拡大',
    status: 'locked',
    order: 2,
  },
  {
    id: 'm3',
    visionId: 'v2',
    title: '月収30万円達成',
    description: 'デジタル収益の最初のマイルストーン',
    status: 'active',
    order: 1,
  },
];

export const SEED_QUESTS: Quest[] = [
  {
    id: 'q1',
    milestoneId: 'm1',
    title: 'ACEランディングページ完成',
    description: 'コーチングサービスのLPを完成させる',
    estimatedHours: 8,
    difficulty: 3,
    xpReward: 300,
    status: 'in_progress',
    tags: ['dev', 'design'],
  },
  {
    id: 'q2',
    milestoneId: 'm1',
    title: 'SNS集客コンテンツ10本投稿',
    description: 'TwitterとInstagramで認知を広げる',
    estimatedHours: 5,
    difficulty: 2,
    xpReward: 200,
    status: 'available',
    tags: ['content'],
  },
  {
    id: 'q3',
    milestoneId: 'm1',
    title: '無料セッション5件実施',
    description: 'ターゲットへのアプローチと体験セッション',
    estimatedHours: 10,
    difficulty: 2,
    xpReward: 200,
    status: 'locked',
    tags: [],
  },
  {
    id: 'q4',
    milestoneId: 'm3',
    title: 'デジタルコンテンツ販売設定',
    description: 'Notionテンプレートや動画コースを販売開始',
    estimatedHours: 4,
    difficulty: 2,
    xpReward: 200,
    status: 'available',
    tags: ['dev', 'content'],
  },
];

export const SEED_TASKS: Task[] = [
  { id: 't1', questId: 'q1', title: 'ヒーローセクションのコピー作成', estimatedMinutes: 60, status: 'done', order: 1 },
  { id: 't2', questId: 'q1', title: 'デザインカンプ（Figma）', estimatedMinutes: 120, status: 'done', order: 2 },
  { id: 't3', questId: 'q1', title: 'Next.jsでコーディング', estimatedMinutes: 180, status: 'in_progress', order: 3 },
  { id: 't4', questId: 'q1', title: 'モバイル対応・レスポンシブ', estimatedMinutes: 60, status: 'todo', order: 4 },
  { id: 't5', questId: 'q1', title: 'Netlifyデプロイ', estimatedMinutes: 30, status: 'todo', order: 5 },
  { id: 't6', questId: 'q2', title: 'コンテンツカレンダー作成', estimatedMinutes: 30, status: 'todo', order: 1 },
  { id: 't7', questId: 'q2', title: 'Twitter投稿5本', estimatedMinutes: 60, status: 'todo', order: 2 },
  { id: 't8', questId: 'q2', title: 'Instagram Reel作成', estimatedMinutes: 90, status: 'todo', order: 3 },
];
