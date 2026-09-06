# ACE 48H TEACH LOOP

Status: v0.1 implementation spec
Canonical concept: Google Drive `CANON｜48H TEACH LOOP｜学びを経験知へ変える実践プロトコル`
Drive file ID: `1B0v158pcLo1GQTZRzsTb70PFMnI8liyuAjbK7dlGaEM`

## Purpose

ACEの学習完了を「読んだ・見た」から「人にTeachした・現実でActionした」へ変える。

知識消費を増やすのではなく、学びを経験知へ変換し、自分の言葉と行動に残る教育OSにする。

## Completion rule

```text
Consume / Read
  ↓
Teach Evidence
  +
Action Evidence
  ↓
Education Completed
  ↓
Re-Teach / Mastery
```

### v0.1 minimum completion

Education Completed は次の2つが両方そろった時だけ記録する。

1. Teach Evidence
   - 誰にTeachしたか
   - Teachして気づいたこと（任意）
2. Action Evidence
   - 現実で何を実践したか
   - 実践して気づいたこと（任意）

`education_completed` はこのEvidence Gateを通過した後だけ発火させる。
既存のGrowth TriggerによりEducation完了XPと `person_progress.education_completed` が更新される。

## Important semantic change

### Read / Consume is engagement, not completion

既存Learn UIでは読了率と滞在時間から `content_completed` を記録している。
これはコンテンツ消費の分析イベントとしては有用だが、学習完了を意味しない。

v0.1ではXP/教育完了判定と切り離したまま運用する。
次フェーズでイベント名を `content_consumed` 等へ整理し、意味の混同をなくす。

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

Only after Teach + Action evidence is present.

Payload includes:
- `completion_rule: teach+action`
- `evidence: { teach: true, action: true }`
- Teach evidence
- Action evidence

Existing `funnel_event_growth_award` handles XP/progress.

## UI v0.1

Route:

`/learn/48h-teach`

Flow:

1. 今回の学びを1文で記録
2. 誰にTeachしたかを記録
3. 実際に何をActionしたかを記録
4. 両方そろうまでCompleteボタンは無効
5. API成功後にACE COMPLETE / XPを表示
6. Re-Teachを次のMasteryとして提示

Learn画面からは `Teach＋Actionで完了` ランチャーで到達する。

## Re-Teach = Mastery

Re-Teachはv0.1の最低完了条件には含めない。

理由:
- 毎回Re-Teach必須にすると初期行動コストが高い
- Teach + Actionで「理解→現実接続」までは担保できる
- Re-Teachは経験を混ぜ、自分の言葉へ変換する上位Evidenceとして価値が高い

次フェーズでは `learning_reteach_recorded` としてMastery XP / Human Graph signalへ接続する。

## Rollout

### v0.1 — Evidence Gate
- Teach + Actionフォーム
- Evidence events
- `education_completed` gate
- existing XP/progress reuse
- Learn launcher

### v0.2 — Content-bound completion
- `content_id / asset_id / node_id` を自動引継ぎ
- 各教材カードに「この学びを実践する」CTA
- `content_completed` → `content_consumed` semantic migration
- recommendation / learning_state とEvidenceを結合

### v0.3 — 48H Loop
- 学習開始時刻から48時間の期限表示
- Teach未完了 / Action未完了のリマインド
- Re-Teach Mastery
- Human Graph / curriculum_states / learning_statesへEvidence反映
- Lesson / Quest / Community間で同じ完了契約を共有

## ACE principle

> ACEでは、知ったことを評価しない。現実に流れた学びを評価する。

Input → Teach → Action → Experience → Re-Teach → Asset
