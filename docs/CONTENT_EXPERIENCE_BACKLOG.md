# FLOW OS Content Experience Backlog

Status: evolving backlog
Purpose: Quest後の体験を、知識消費ではなく「気づき → 知恵 → 実装 → 仲間 → 深いACE」へ育てる。

## Core principle

FLOW OSは、記事を読ませるアプリではない。

1. Questで自分のデータを取る
2. その体験に関係する「気になる問い・悩み・記事タイトル」に出会う
3. 自分で選んで読む / 観る / 聴く
4. 新しい見方を手に入れる
5. その見方を次のQuestで使う
6. 学びを続けるほど、自分の「知恵の装備」が増える
7. ある段階から、仲間と学ぶ価値が自然に見えてくる
8. 必要になった人だけ、より深いACEへ進む

課金を急がない。恐怖・焦り・隠れた強制で動かすのではなく、体験から「もっと知りたい」「一人より仲間がいる方が面白い」「ここは深く扱いたい」が本人の中に生まれる導線を作る。

---

## 1. Progression / 渡す順序

### Quest 1–3: DISCOVER
- とにかく楽しい・短い・意外な気づき
- 1 Quest = 1つの発見
- 関連コンテンツは2〜3件だけ
- 課金CTAは出さない
- 「自分って思ったより○○なんだ」を増やす

### Quest 4–6: COLLECT
- 過去Questとの共通パターンを見せる
- 「知恵アイテム」「Lens」「Card」など収集感を出す
- 自分専用のKnowledge Inventoryが育つ
- 学び続ける意味を、説明ではなく蓄積で感じさせる
- 課金CTAは出さない

### Quest 7–10: CONNECT
- 他者の違う見方・成功例・失敗例を少し混ぜる
- 「同じQuestでも人によって結果が違う」を見せる
- 仲間と学ぶと視点が増えることを体験させる
- Community / ACEの世界観は見せるが、いきなり決済させない
- 例: 「このテーマを仲間と試すと、こんな発見が起きる」

### Quest 10+: GO DEEPER
- 本人の蓄積データから「一人で回せる領域」と「深く扱うと伸びる領域」を分ける
- 深いACEの紹介は、価格より先に体験価値・仲間・変化を見せる
- Soft CTA → 詳細 → 適合確認 → 決済、の複数ステップ
- 19,800円Payment Linkを突然出さない

※ Quest回数だけで固定しない。将来は readiness / engagement / repeat learning / community interest も判断材料にする。

---

## 2. Content recommendation / 何を見せるか

- Quest nodeに直接関連する記事
- 本人が書いたACTUAL / REFLECTに関係する記事
- 「悩み」起点の記事
- 「なぜこうなる？」起点の記事
- よくある誤解を壊す記事
- 次のQuestで使える具体策
- 反対視点の記事
- 他者のケーススタディ
- 30秒で読めるMicro Insight
- 1〜3分の記事
- 5〜10分のDeep Dive
- 将来: short video / long video / audio / podcast / live clip

### Title patterns
抽象語の「気づきを深める」だけで誘導しない。

例:
- 「予想より18秒しかできなかった。これ、能力不足？」
- 「なぜ“できると思った時間”はズレるのか？」
- 「本番だけ結果が変わる人に起きていること」
- 「疲労している時、脳は何を見落とす？」
- 「頑張る前に変えるべき“1つの条件”」
- 「同じ練習でも伸びる人・伸びない人の違い」

---

## 3. Knowledge Inventory / ゲーム化

候補:
- Insight Card: 気づき
- Lens Card: 見方
- Skill Card: 実行技術
- Reset Card: 崩れた時の戻し方
- Pattern: 自分に繰り返し出るパターン
- Wisdom: 複数の体験から得た知恵
- Key: 新しい領域を解放する鍵
- Badge: 行動ではなく「学び方」の達成

### Inventory UX
- 記事を読む → アイテムを取得
- Questで使う → アイテムが「知恵」に進化
- 同じLensを複数場面で使う → 熟練度が上がる
- 「装備する」感覚で次QuestにLensを1つ持っていける
- 未取得アイテムはシルエット表示
- コレクション100%を目的にしすぎない

---

## 4. Feedback / ボタン・画面・音・触覚

### Button interaction
- tap時に軽く沈む
- 100〜180ms程度の反応
- 完了時は押した瞬間に状態を返す
- disabled理由を分かるようにする
- 長い通信はskeleton / progressを出す

### Haptics
- 小さな選択: light
- Quest complete: success系
- Item unlock: 2段階の軽い振動
- エラー: 強すぎないwarning

### Sound
- デフォルトは控えめ / mute可能
- Quest complete
- Item acquired
- New insight unlocked
- Rank / chapter unlock
- Community event

音は報酬依存を強くしすぎず、意味のある節目だけ。

### Motion
- XPが数字へ吸い込まれる
- Card獲得時にInventoryへ飛ぶ
- 新しい記事は下から軽く出現
- 未解放領域が少しだけ光る
- Knowledge Graphのnodeが増える
- 朝5時にTodayが静かに更新される

---

## 5. Learning loop / 読んで終わらせない

- 読む前: 「あなたはどう思う？」
- 読んだ後: 1タップで「一番変わった見方」
- 保存: 「次のQuestで試す」
- 翌日: 前日に得たLensを使うQuest
- 3日後: 「この知恵、今も使える？」
- 異なる領域で再利用できたらWisdom化

FLOW:
Quest → Content → Insight → Equip → Next Quest → Evidence → Wisdom

---

## 6. Personalization

推薦材料:
- FLOW bottleneck
- ACE axis / balanced lens
- Quest node
- prediction / actual gap
- reflection text
- completed content
- skipped content
- dwell / open / save
- repeated themes
- growth rank
- learning preference
- time available
- community interest

避ける:
- 毎回同じ記事
- 読んでいない記事を「学習済み」にする
- 全員へ同じ商品CTA

---

## 7. Social / 仲間と学ぶ価値

段階的に見せる:
- 匿名の「他の人はこう見た」
- 同じQuestの反応分布
- 別タイプの人の視点
- 2人Quest
- Group Quest
- 同じテーマのGuild / Cohort
- Live reflection
- Peer feedback
- Mentor / ACE facilitator

伝える価値:
- 仲間は励まし要員だけではない
- 自分一人では見えない盲点をくれる
- 他人の試行錯誤が学習速度を上げる
- 自分の経験を言語化して渡すと、自分の理解も深くなる

---

## 8. Monetization / 深いACEへの導線

避ける:
- Quest 1〜2直後の19,800円直リンク
- 不安を煽る
- 隠れた自動課金
- 偽の希少性
- 学びを意図的に不完全にして困らせる

望ましい流れ:
1. 無料で本当に役立つ体験
2. 自分のデータが蓄積
3. 学びが楽しくなる
4. 一人で学ぶ限界も自然に見える
5. 他者と学ぶ価値を体験
6. 「もっと深くやりたい」
7. ACEの世界・人・場を紹介
8. 適合確認 / 相談
9. 商品詳細
10. 決済

CTA候補:
- 「このテーマを仲間と試してみる」
- 「他のACEの見方を見る」
- 「自分のパターンを深く解析する」
- 「次のステージを見る」
- 「個別に勝ち筋へ落とし込む」

価格は価値理解の後。

---

## 9. Content presentation / 見せ方

- 3 cards max by default
- 「おすすめ1位」を強制しすぎない
- タイトル + 1行理由
- 読了時間表示
- ARTICLE / VIDEO / AUDIO区別
- 難易度
- 今のQuestとの関連度
- 「今読む」「あとでInventoryへ」
- 既読 / 未読
- 続きから
- 関連シリーズ
- Surprise content slot

---

## 10. Measurement / 必ず取るイベント

- content_impression
- content_opened
- content_read_25 / 50 / 90
- content_completed
- content_saved
- content_equipped
- content_skipped
- related_quest_started
- insight_recorded
- community_preview_viewed
- community_interest
- ace_preview_viewed
- ace_detail_opened
- checkout_intent
- purchase

見る指標:
- Quest完了 → content open率
- content → 翌日Quest継続率
- saved/equipped → 実行率
- どのタイトルが開かれるか
- どのコンテンツがreflectionの質を上げるか
- community preview後の継続率
- 課金だけでなく、学習継続と実行改善を主要KPIにする

---

## 11. Content operations

- os_content_itemsを原資産として再利用
- curriculum_content_linksでQuest nodeと接続
- 元Drive資料をそのまま公開しない
- 公開用summary/body/video URLを別管理
- 同じ原資産からMicro / Article / Video / Questを派生
- Content OSでタイトル・導入・CTAをA/B可能にする
- 将来Research DAG / Canonical Knowledgeと接続

---

## Immediate priorities

P0. 早すぎる有料CTAを止める / progression gateを入れる
P0. 1日1Primary Quest・朝5時FLOW Dayを実機安定化
P0. content impression/open/save等の計測契約を先に決める
P1. Quest完了画面に抽象CTAではなく関連タイトルを直接2〜3件出す
P1. Knowledge Inventory v0（保存・装備）
P1. N001/N002/N003の公開用コンテンツを実内容まで磨く
P2. Haptics / motion / sound
P2. Quest 7〜10でcommunity preview
P2. Soft CTA / ACE preview page
P3. Community / Group Quest
P3. Video / audio library

This document is intentionally a backlog. Implement one loop at a time and validate with real behavior before adding more mechanics.
