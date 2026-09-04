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
- `dev` is connected directly to Cloudflare Workers Builds for automatic production deployment.
- Current live technical fallback is `https://ace-quest-board.takraw501.workers.dev`.
- `ace.sunlovesflow.com` is the intended production URL after Cloudflare custom-domain cutover verification. Do not retire the workers.dev fallback until that verification passes.
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
- `npx wrangler@latest deploy` — Cloudflareへデプロイ

## Branch strategy
- `main` — Phase 1 MVP完成後にマージ
- `dev` — 開発ブランチ（通常作業はここ）
