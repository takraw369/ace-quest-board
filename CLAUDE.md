# ACE Quest Board

## What is this?
人生ゲーム風ビジョンマップ × タスクマネージャー。
To Do / Want to を入力 → ビジョンへの道筋がゲームボード上に可視化 → タスク完了でコマが進む。

## Architecture
- Next.js 14 (App Router, static export)
- Tailwind CSS + Framer Motion（アニメーション）
- Zustand + localStorage（Phase 1の状態管理）
- Supabase（Phase 4〜）
- Deploy: Netlify

## Data hierarchy
Vision > Milestone > Quest > Task
（上位ほど抽象度が高い。Visionが人生ゲームのゴール）

## Key design decisions
- ボードはSVGで描画（DOM要素の羅列ではない）
- ゲーミフィケーションはモチベーション設計の核。XP/レベルは飾りではなく進捗の実感
- Phase 1はlocalStorage完結。DB移行は後方互換性を保つ
- 将来リアン（ACEクライアント）向けに開放するため、データモデルにuserId予約フィールドを入れておく

## Style guide
- ダークテーマベース（ゲーム的没入感）
- アクセントカラーはビジョンごとに変わる
- フォント: Geist（デフォルト）
- アニメーションは「達成感」を強調する方向で（派手すぎず、でも地味にしない）

## Current phase
Phase 1: MVP（コアループ）

## Commands
- `npm run dev` — 開発サーバー
- `npm run build` — ビルド（static export → out/）
- `npx netlify deploy --prod` — デプロイ

## Branch strategy
- `main` — Phase 1 MVP完成後にマージ
- `dev` — 開発ブランチ（通常作業はここ）
