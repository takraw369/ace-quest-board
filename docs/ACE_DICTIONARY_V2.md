# ACE Dictionary v2 — 困った時の入口レイヤー

## Position

ACE Dictionary は Knowledge / Want to / Quest と同列の第4レイヤーではない。

```text
困った・モヤモヤ・言葉にならない
          ↓
      ACE Dictionary
          ↓
   ┌──────┼──────┐
   知      望      行
Knowledge Want to Quest
```

目的は「答えを与えること」ではなく、Flower が現在地を見つけ、自分で次の一歩を選べる状態をつくること。

## Single source of truth

- 編集・収集の作業台: Google Sheets `CONTENT_OS / 20_PAIN_FLOW`
- アプリ正本: Supabase `public.ace_dictionary_entries`
- Flower UI: `/dictionary`
- AI lookup API: `/api/dictionary?q=...&category=...&limit=3`

Flower と ACE AI は同じ Supabase 正本を参照する。

## Flower experience

1. 今ひっかかっている言葉をそのまま入力する。
2. 近い悩みを複数眺める。
3. 「これ、近いかも」を本人が選ぶ。
4. reframe / metaphor で見方を増やす。
5. first_action を一つだけ試す。
6. 必要に応じて Knowledge / Want to / Quest / Worksheet / Community / Safety へ進む。

## AI retrieval contract

ACE AI は辞典を診断装置として扱わない。

1. **単一原因に決めつけない。** 1つの結果には複数要因があり得る。
2. **原則3候補まで返す。** pain_text だけでなく FAQ / tags / hidden_want / reframe / root_structure / metaphor も検索する。
3. **本人確認を入れる。** 「この中だとどれが近い？」のように選択権をFlowerへ返す。
4. **Self first.** まず小さな自己理解・一手を優先する。販売CTAを自動で最優先にしない。
5. **必要時のみ深める。** Content → Diagnose → Quest → Community / Service の順は状況に合わせる。
6. **Safetyは別扱い。** 症状・負担が強い、長引く、生活に支障、安全懸念があるテーマでは、辞典内で完結させず適切な医療・公的・専門相談を優先する。
7. **辞典にない時は捏造しない。** 近似候補であることを示すか、新しい悩み語として収集候補へ回す。

## Data fields

- `id`: Pain ID
- `category`: 大分類
- `pain_text`: Flower本人の言葉
- `hidden_want`: 本当はどうなりたいか
- `root_structure`: 仮説としての構造
- `metaphor_id` / `metaphor_name`: 腑に落とすための例え
- `reframe`: Aha / 再定義
- `first_action`: 今日できる一手
- `cta_*`: 次の導線
- `faq_question`: よくある質問表現
- `tags` / `aliases`: 検索語
- `priority`: 表示・整備優先度
- `published`: Flower / AIへ公開するか

## Next evolution

- Sheet → Supabase の自動同期
- synonym / aliases の自動蓄積
- 検索ログから「見つからなかった悩み」を収集
- semantic search / embedding による曖昧検索
- Pain ↔ Knowledge ↔ Want to ↔ Quest の明示的なIDリンク
- Flowerの段階や過去のQuestに合わせたCTAパーソナライズ
- コンテンツ反応をPain / Metaphorへフィードバックしてランキング改善
