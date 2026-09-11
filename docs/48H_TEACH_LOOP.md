# ACE 48H LEARNING LOOP

Status: v0.1 completion contract + v0.2 UX lightening
Canonical concept: Google Drive `CANON｜48H TEACH LOOP｜学びを経験知へ変える実践プロトコル`
Drive file ID: `1B0v158pcLo1GQTZRzsTb70PFMnI8liyuAjbK7dlGaEM`
Handoff: `HANDOFF｜ACE 48H LEARNING LOOP｜本番E2E完了・UX改善点｜2026-09-06`

## Purpose

ACEの学習完了を「読んだ・見た」から「人に話した・現実で1つ試した」へ変える。

知識消費を増やすのではなく、学びを経験知へ変換し、自分の言葉と行動に残る教育OSにする。

ユーザー体験は軽くする。深い思想とEvidence判定は裏側に残す。

## Completion rule

内部契約はv0.1から変えない。

```text
Consume / Read
  ↓
Teach / Share Evidence
  +
Action Evidence
  ↓
Education Completed
  ↓
Re-Teach / Mastery
```

### v0.1 minimum completion

Education Completed は次の2つが両方そろった時だけ記録する。

1. Teach / Share Evidence
   - 誰に話したか
   - 話して気づいたこと（任意）
2. Action Evidence
   - 現実で何を1つ試したか
   - 試して気づいたこと（任意）

`education_completed` はこのEvidence Gateを通過した後だけ発火させる。
既存のGrowth TriggerによりEducation完了XPと `person_progress.education_completed` が更新される。

## Important semantic change

### Read / Consume is engagement, not completion

既存Learn UIでは読了率と滞在時間から `content_completed` を記録している。
これはコンテンツ消費の分析イベントとしては有用だが、学習完了を意味しない。

v0.1ではXP/教育完了判定と切り離したまま運用する。
後続フェーズでイベント名を `content_consumed` 等へ整理し、意味の混同をなくす。

## Event contract v0.1

### `learning_teach_recorded`

Channel: `pwa`

Payload core:
- `learning_key`
- `learning_title`
- `completion_rule: teach+action`
- `evidence_kind: teach`
- `teach_to`
- `teach_note`
- optional: `content_id`, `asset_id`, `node_id`, `flow_day`

### `learning_action_completed`

Channel: `pwa`

Payload core:
- `learning_key`
- `learning_title`
- `completion_rule: teach+action`
- `evidence_kind: action`
- `action_taken`
- `reflection`
- optional: `content_id`, `asset_id`, `node_id`, `flow_day`

### `education_completed`

Only after Teach / Share + Action evidence is present.

Payload includes:
- `completion_rule: teach+action`
- `evidence: { teach: true, action: true }`
- Teach / Share evidence
- Action evidence

Existing `funnel_event_growth_award` handles XP/progress.

## UI v0.2

Route:

`/learn/48h-teach`

User-facing principle:

> 誰かに話す。1つ試す。

Required input is intentionally minimal:

1. 今回の学びを一言
2. 誰かに話したかを選ぶ
3. 何か1つ試したことを短く残す

Optional reflection stays collapsed by default.

Do not foreground these internal terms in user-facing UI:
- Teach
- Action Evidence
- Re-Teach
- Mastery Evidence

The current backend payload and completion gate stay unchanged. UI copy does not rename the database contract.

Learn launcher copy: `話す＋1つ試す`

## Re-Teach = Mastery

Re-Teachは最低完了条件には含めない。

理由:
- 毎回Re-Teach必須にすると初期行動コストが高い
- Share + Actionで「理解→現実接続」までは担保できる
- Re-Teachは経験を混ぜ、自分の言葉へ変換する上位Evidenceとして価値が高い

ユーザー向けには強制しない。必要なら「もう一度、誰かに話せたら。」程度の軽いナッジにする。

## Rollout

### v0.1 — Evidence Gate
- Teach / Share + Actionフォーム
- Evidence events
- `education_completed` gate
- existing XP/progress reuse
- Learn launcher
- production E2E PASS

### v0.2 — UX lightening
- user-facing Teach terminologyを外す
- `誰かに話した？` を選択式にする
- `何か1つ試した？` へ軽量化
- 説明量削減
- 必須入力最小化
- optional reflectionを折りたたむ
- backend Evidence contractは維持

### v0.3 — Content-bound completion
- `content_id / asset_id / node_id` を自動引継ぎ
- 各教材カードに「この学びを実践する」CTA
- `content_completed` → `content_consumed` semantic migration
- recommendation / learning_state とEvidenceを結合

### v0.4 — 48H / Mastery extension
- 学習開始時刻から48時間の期限表示
- 未完了リマインド
- Re-Teach Mastery
- Human Graph / curriculum_states / learning_statesへEvidence反映
- Lesson / Quest / Community間で同じ完了契約を共有

## ACE principle

> ACEでは、知ったことを評価しない。現実に流れた学びを評価する。

Input → Share → Action → Experience → Re-Teach → Asset
