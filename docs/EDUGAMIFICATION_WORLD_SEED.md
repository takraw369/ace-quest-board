# ACE Edu-Gamification / FLOW WORLD SEED

Status: implementation foundation
Branch: `codex/edugamification-world-seed`
Owner app: ACE (`takraw369/ace-quest-board`)

## Purpose

ACEの既存コアループを壊さず、コンテンツ事業とEdu-Gamificationを同じ資産循環にする。

既存:

`困 → 知 → 望 → Router → 行 → 振り返り → 知恵 → 次の行`

追加する体験レイヤー:

`Quest → Evidence → World change → Content / Lens → Equip → Next Quest`

ゲームを別事業・別アプリとして増やさない。ACE本体のQuest完了・My ACE・Knowledge Inventoryの上に“世界が育つ”フィードバックを重ねる。

## Product rule

FLOW WORLDは娯楽用の独立ゲームではない。

ユーザーの現実行動・振り返り・学習・Evidenceが、世界の変化として見えることで、

- 行動したくなる
- 自分の変化を感じる
- 学びを次のQuestで試したくなる
- 継続が単なるstreakではなく意味を持つ

状態を作る。

## P0 vertical slice

最初に作るのは巨大な3D worldではない。

1. `/quest` で Predict → Do → Actual → Reflection
2. Quest complete
3. XP / Evidence保存
4. `FlowWorldSeed` が反応
5. 関連Knowledgeを最大3件提示
6. 1つを読む / 保存 / 将来はEquip
7. Todayへ戻る

これで「現実の行動が世界を変える」最小ループを成立させる。

## Visual primitive

`src/components/experience/FlowWorldSeed.tsx`

役割:
- Quest完了時のWorld change feedback
- 5領域を持つFLOW WORLDの将来表現のseed
- XP / streakを現状データとして表示
- Three.js導入前のUI contract

重要: 現段階ではXPを恣意的なlevelやworld stageへ変換しない。
意味のあるunlock ruleは、FLOW state / Evidence / Lens / Quest lineageのデータ契約が確定してから実装する。

## Integration point

第一候補: `src/components/pwa/QuestClient.tsx`

Quest完了結果の直後、RelatedLearningより前にWorld changeを見せる。

概念:

```tsx
<FlowWorldSeed
  completed
  xpGain={result.xp ?? 0}
  xpTotal={result.total ?? 0}
  streak={result.streak ?? 0}
/>
```

既にその日のQuestが完了している再訪画面では、`completed={false}`で静かな保存状態を見せるか、Today / My ACE側のWorld summaryへ寄せる。

## Data contract before real unlocks

将来のWorld stateは見た目から逆算して作らず、Human Graph / My ACEから意味のある状態を受け取る。

候補:

```ts
type FlowWorldState = {
  userId: string;
  flowDay: string;
  evidenceCount: number;
  completedQuestCount: number;
  equippedLensIds: string[];
  unlockedWorldNodeIds: string[];
  activeWorldNodeId?: string | null;
  worldSignals: {
    body?: number | null;
    cognition?: number | null;
    emotion?: number | null;
    action?: number | null;
  };
};
```

World nodeのunlockは、単純なXP thresholdだけにしない。

## Content business connection

同じ原資産から以下を派生させる。

`Canonical Knowledge`
→ Micro Insight
→ Article
→ Short / Video / Audio
→ Quest
→ Lens / Skill / Reset Card
→ World node / story event

つまりContent EngineとGame Engineを別々に運用しない。

Contentは集客・理解・売上を作り、Questは実践Evidenceを作り、Worldは継続と意味づけを作る。

## 3D / Astra / Three.js phase

P0の行動ループが成立した後、`FlowWorldSeed`の表示レイヤーをThree.jsへ進化させる。

制作ループ:

1. Purpose / emotion / learning outcomeを定義
2. image genでTarget Concept Artを作る
3. Blender MCPで必要なmesh / textureを生成
4. Three.jsでブラウザ実装
5. Current Screenshotを取得
6. Targetと比較
7. lighting / material / camera / geometryを反復修正
8. 60fps / mobile / accessibility gateを通す

Three.js導入は“ゲームを作るため”ではなく、既存ACE loopを空間化するため。

## First 3D scene

巨大worldではなく中央空間だけ。

仮称: `FLOW CORE`

- 中央: Core / 花托
- 周囲: 5つの未解放node
- Quest完了: Coreがpulse
- Lens獲得: 光 / orbitに変化
- Evidence蓄積: nodeへの道が少し可視化
- 次のQuest: 1つのnodeが静かに呼吸する

キャラクター・戦闘・広大なmapは後回し。

## Measurement

P0で見るもの:

- Quest complete → World feedback viewed
- World feedback → related content open
- content → next-day Quest continuation
- World feedbackの有無によるQuest継続差
- World表現が理解を助けるか、単なる装飾になっていないか

将来event候補:

- `world_feedback_viewed`
- `world_node_previewed`
- `world_node_unlocked`
- `world_lens_equipped`
- `world_returned`

## Non-goals now

- 独立したゲームアプリ
- Unity / Unrealへの移行
- 大量の3D asset制作
- 戦闘や複雑なgame mechanics
- XPだけで世界を解放する設計
- 課金のための過剰な報酬ループ

## Definition of next-ready

P0が次段階へ進める条件:

- Quest completeからWorld feedbackが自然に見える
- 既存のRelatedLearningを邪魔しない
- mobileで読める
- static exportを維持
- build / lint / relevant tests PASS
- World state data contractのP1案が確定

その後、Three.js vertical sliceを別ブランチで開始する。
