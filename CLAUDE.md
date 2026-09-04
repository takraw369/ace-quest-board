# ACE Quest Board

## What is this?
人生ゲーム風ビジョンマップ × タスクマネージャー。
To Do / Want to を入力 → ビジョンへの道筋がゲームボード上に可視化 → タスク完了でコマが進む。

## Architecture
- Next.js 16 (App Router, static export)
- Tailwind CSS + Framer Motion（アニメーション）
- Zustand + localStorage（Phase 1の状態管理）
- Supabase（Phase 4〜）
- Deploy: Cloudflare Workers Static Assets

## Deployment policy
- Netlify is retired for this repository. Do not add new Netlify deploys, hooks, plugins, or build settings.
- `dev` is the development/testing branch and is connected to the development Worker `ace-quest-board-dev`.
- Development/test URL uses the Worker workers.dev hostname. Do not attach the production custom domain to the development Worker.
- `main` is the production/release branch.
- Production deploy uses Wrangler environment `production`, Worker `ace-quest-board`, and custom domain `ace.sunlovesflow.com`.
- Current static export is deployed as Cloudflare Workers Static Assets from `out/`.
- If SSR, Server Actions, Route Handlers, or server-side auth become necessary, evaluate Cloudflare's current recommended Next.js path before changing architecture.

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
- `npm run deploy:dev` — development Worker (`ace-quest-board-dev`) へデプロイ
- `npm run deploy:prod` — production Worker (`ace-quest-board`) + `ace.sunlovesflow.com` へデプロイ

## Branch strategy
- `main` — 本番・リリース
- `dev` — 開発・実機テスト
- 通常実装は `dev`。実機確認後に `main` へ昇格する。
