# Quest Context UX

FLOW OSでは、Questを内容だけでなく「今どんな状況でできるか」で分類する。
目的は、スキマ時間の活用を煽ることではなく、ユーザーがその時の時間・場所・集中度に合うQuestを迷わず選べること。

## 2つの基本モード

### QUICK QUEST
- 目安: 1〜3分
- 端末: スマホだけで完結
- 状況: 休憩、待ち時間、移動前後、ちょっとした空き時間
- 内容: 観察、予測、選択、軽い実験、短い記録
- 注意: 「移動しながら実行」を推奨しない。身体Questは安全な場所で停止して行う。

### DEEP QUEST
- 目安: 10〜30分
- 端末: スマホ / PC / 紙
- 状況: 机に向かう、静かな場所、意図的に時間を取る
- 内容: 内省、価値観、自己物語、意思決定、長期ゴール、構造化

## 推薦エンジンで持つ属性

Questごとに以下を持つ。

- `quest_mode`: `quick` | `deep`
- `time_budget_minutes`
- `attention_level`: `light` | `focused`
- `availability_context`: 例 `break`, `waiting`, `before_after_commute`, `desk`, `quiet_time`
- `device`: 例 `phone`, `pc`, `paper`
- `environment`: 例 `flexible`, `quiet_space`, `safe_standing_space`
- `physical_requirement`: 例 `none`, `light`, `standing_balance`

## UX表示の原則

ユーザーには生産性を煽る表現をしない。

例:
- `今できるQuest` — 3分 / スマホだけ / 休憩中OK
- `時間を取って向き合うQuest` — 15分 / 落ち着ける場所 / メモ推奨

## Today画面の方向性

将来的にTodayでは、少なくとも次の2枠を分けて表示する。

1. `今できる` — QUICK QUEST
2. `あとで向き合う` — DEEP QUEST

これにより「時間がない」を減らしつつ、すべてをスキマ時間で浅く消化することも防ぐ。

## 設計原則

- スキマ時間 = 浅い学習、ではない。
- 観察・予測・選択・身体チェックはQUICKと相性がよい。
- 価値観・自己物語・重要な意思決定はDEEPへ送る。
- FLOW OSが「今は軽く触るべきか / 深く向き合うべきか」まで案内する。
