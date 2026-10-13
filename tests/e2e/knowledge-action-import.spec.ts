import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { KNOWLEDGE_ACTION_MAX_BYTES, knowledgeActionFeedback, parseKnowledgeActionDraft } from '../../src/lib/knowledgeActionImport';
import { compileToQuestPlan } from '../../src/lib/questCompiler';

// Synthetic fixture: no private Drive text or production session enters Git.
const draft = {
  schema: 'masa-knowledge-action/v1', proposalId: 'proposal-synthetic-focus',
  title: '練習の観察を実践へつなぐ', destination: 'Athlete Quest', mode: 'training_reflection', reviewStatus: 'ai_candidate', visibility: 'private',
  sources: [{ nodeId: '11111111-1111-4111-8111-111111111111', sourceKey: 'drive:synthetic-fixture', title: '架空の練習観察メモ', canonicalUrl: 'https://example.com/synthetic-source' }],
  practice: { instruction: '練習の前後で注意の変化を観察し、自分の経験として記録する。', steps: ['練習前の注意を1行で記録する。', '5分試し、観察した変化を書く。'], reflectionQuestions: ['予測と実際の結果はどう違った？'] },
  constraints: ['この下書きは非公開の個人練習に使う。'],
};

test('Knowledge Action validates bounded schema, Fabric IDs and safe links', () => {
  expect(parseKnowledgeActionDraft(JSON.stringify(draft)).proposalId).toBe(draft.proposalId);
  for (const invalid of [
    { ...draft, schema: 'masa-knowledge-action/v2' }, { ...draft, visibility: 'public' },
    { ...draft, reviewStatus: 'approved' }, { ...draft, additionalField: 'unsupported' },
    { ...draft, title: 'x'.repeat(241) }, { ...draft, proposalId: 'x'.repeat(121) },
    { ...draft, proposalId: 'proposal:unsupported' }, { ...draft, proposalId: '日本語' },
    { ...draft, sources: [] }, { ...draft, sources: [...draft.sources, ...draft.sources] },
    { ...draft, sources: [{ ...draft.sources[0], nodeId: 'unknown-alias' }] },
    { ...draft, sources: [{ ...draft.sources[0], nodeId: '11111111-1111-7111-8111-111111111111' }] },
    { ...draft, sources: [{ ...draft.sources[0], canonicalUrl: 'javascript:alert(1)' }] },
    { ...draft, sources: [{ ...draft.sources[0], canonicalUrl: 'https://user:secret@example.com/' }] },
    { ...draft, sources: [{ ...draft.sources[0], canonicalUrl: 'https://127.0.0.1/' }] },
    { ...draft, practice: { ...draft.practice, steps: ['x'.repeat(1001)] } },
    { ...draft, constraints: Array(21).fill('condition') },
  ]) expect(() => parseKnowledgeActionDraft(JSON.stringify(invalid))).toThrow();
  expect(() => parseKnowledgeActionDraft('{')).toThrow();
  expect(() => parseKnowledgeActionDraft(' '.repeat(KNOWLEDGE_ACTION_MAX_BYTES + 1))).toThrow();
});

test('Compilation and feedback retain provenance, limits and original observation time', () => {
  const plan = compileToQuestPlan({ title: draft.title, text: draft.practice.instruction, knowledgeAction: parseKnowledgeActionDraft(JSON.stringify(draft)) });
  expect(plan.reviewPrompts).toEqual(draft.practice.reflectionQuestions);
  expect(plan.sourceLineage?.sources[0].nodeId).toBe(draft.sources[0].nodeId);
  for (const quest of [plan.mainQuest, ...plan.subQuests, ...plan.dailyQuests]) {
    expect(quest.description).toContain('AI候補（未確定）'); expect(quest.description).toContain('非公開');
    expect(quest.description).toContain(draft.proposalId); expect(quest.description).toContain(draft.sources[0].canonicalUrl);
  }
  const legacy = compileToQuestPlan({ text: draft.practice.instruction });
  expect(legacy.sourceLineage).toBeUndefined(); expect(legacy.dailyQuests).toHaveLength(7);
  const log = { id: 'synthetic-log', completedAt: '2026-10-13T19:00:00+09:00', reflection: '注意の変化は観察できなかった。', sourceLineage: plan.sourceLineage };
  const feedback = knowledgeActionFeedback(log);
  expect(feedback).toEqual({ schema: 'masa-knowledge-action-feedback/v1', eventId: 'ace-synthetic-log', proposalId: draft.proposalId,
    sourceNodeIds: [draft.sources[0].nodeId], reflection: { outcome: log.reflection, learning: '', nextAction: '' }, occurredAt: '2026-10-13T10:00:00.000Z' });
  expect(knowledgeActionFeedback(log).eventId).toBe(feedback.eventId);
  expect(() => knowledgeActionFeedback({ ...log, reflection: '' })).toThrow();
  expect(() => knowledgeActionFeedback({ ...log, completedAt: 'invalid-date' })).toThrow(/記録日時/);
  expect(knowledgeActionFeedback({ ...log, practiceReflection: { outcome: '結'.repeat(1500), learning: '学'.repeat(1500), nextAction: '次'.repeat(1500) } }).reflection.outcome).toHaveLength(1500);
  for (const field of ['outcome', 'learning', 'nextAction']) expect(() => knowledgeActionFeedback({ ...log, practiceReflection: { outcome: '観察した結果', learning: '', nextAction: '', [field]: '長'.repeat(1501) } })).toThrow(/1500文字/);
  expect(() => knowledgeActionFeedback({ ...log, reflection: '長'.repeat(1501) })).toThrow(/元の記録は保持/);
});

test('Private import → Board → recorded reflection → feedback download survives reload at 320px', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const external: string[] = [];
  await context.route('**/*', (route) => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    external.push(route.request().url()); return route.abort();
  });
  await page.setViewportSize({ width: 320, height: 740 }); await page.goto('/compiler');
  await page.getByLabel('Dashboardの実践下書きを読み込む').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(draft)) });
  await expect(page.getByLabel('タイトル', { exact: true })).toHaveValue(draft.title);
  await expect(page.getByLabel('本文 / メモ / 研究要約')).toHaveValue(/5分試し/);
  await expect(page.getByTestId('knowledge-source-lineage')).toContainText('AI候補（未確定）');
  expect(await page.evaluate(() => localStorage.getItem('ace-quest-engine-v0'))).toBeNull();
  await page.getByRole('button', { name: 'Questへ変換する', exact: true }).click();
  await page.getByRole('button', { name: 'Quest Boardへ接続', exact: true }).click();
  await page.getByLabel('振り返りメモ（完了するQuestに保存）').fill('予測より集中が戻るまで長くかかった。');
  await page.getByLabel('学んだこと（任意）').fill('短い記録でも条件を比べられる。');
  await page.getByRole('button', { name: 'Day 1｜観察するを完了する', exact: true }).click();
  const state = await page.evaluate(() => ({ plan: JSON.parse(localStorage.getItem('ace-quest-engine-v0')!).state, board: JSON.parse(localStorage.getItem('ace-quest-store')!).state }));
  expect(state.plan.logs[0].sourceLineage.sources[0].sourceKey).toBe(draft.sources[0].sourceKey);
  expect(state.board.milestones[0].description).toContain(draft.proposalId); expect(state.board.quests).toHaveLength(3);
  for (const quest of state.board.quests) { expect(quest.description).toContain(draft.sources[0].nodeId); expect(quest.description).toContain('AI候補（未確定）'); }
  expect(state.board.quests[2].description).toContain(draft.practice.instruction);
  expect(state.board.quests[2].description).toContain(draft.constraints[0]);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '振り返りをDashboard用JSONへ書き出す', exact: true }).click();
  const download = await downloaded;
  const feedback = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(feedback.schema).toBe('masa-knowledge-action-feedback/v1'); expect(feedback.eventId).toBe(`ace-${state.plan.logs[0].id}`);
  expect(download.suggestedFilename()).toBe(`${feedback.eventId}.json`); expect(feedback.proposalId).toBe(draft.proposalId);
  expect(feedback.sourceNodeIds).toEqual([draft.sources[0].nodeId]);
  expect(feedback.reflection).toEqual({ outcome: state.plan.logs[0].reflection, learning: '短い記録でも条件を比べられる。', nextAction: '' });
  expect(feedback.occurredAt).toBe(state.plan.logs[0].completedAt);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.reload(); await expect(page.getByTestId('knowledge-source-lineage')).toContainText(draft.proposalId);
  await expect(page.getByRole('button', { name: 'Day 1｜観察するの完了を取り消す', exact: true })).toBeVisible();
  expect(external).toEqual([]);
});

test('Invalid private file preserves ordinary manual compilation', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto('/compiler'); const original = await page.getByLabel('本文 / メモ / 研究要約').inputValue();
  await page.getByLabel('Dashboardの実践下書きを読み込む').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...draft, visibility: 'public' })) });
  await expect(page.getByRole('alert').filter({ hasText: 'Knowledge Action' })).toContainText('visibility');
  await expect(page.getByLabel('本文 / メモ / 研究要約')).toHaveValue(original);
  await page.getByRole('button', { name: 'Questへ変換する', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Quest Boardへ接続', exact: true })).toBeVisible();
  await expect(page.getByTestId('knowledge-source-lineage')).toHaveCount(0);
});

test('1501-character legacy feedback is not truncated or exported', async ({ page, context, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  await context.route('**/*', (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const plan = compileToQuestPlan({ title: draft.title, text: draft.practice.instruction, knowledgeAction: parseKnowledgeActionDraft(JSON.stringify(draft)) });
  const outcome = '長'.repeat(1501);
  const log = { id: 'legacy-long', planId: plan.id, questId: plan.dailyQuests[0].id, questTitle: plan.dailyQuests[0].title, completedAt: '2026-10-13T10:00:00.000Z', xp: 20, growthAxes: ['execution'], reflection: outcome, sourceLineage: plan.sourceLineage };
  await page.addInitScript((state) => localStorage.setItem('ace-quest-engine-v0', JSON.stringify({ state, version: 1 })), { plans: [plan], activePlanId: plan.id, logs: [log] });
  await page.goto('/compiler');
  for (const label of ['振り返りメモ（完了するQuestに保存）', '学んだこと（任意）', '次に試すこと（任意）']) await expect(page.getByLabel(label)).toHaveAttribute('maxlength', '1500');
  const downloads: string[] = []; page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.getByRole('button', { name: '振り返りをDashboard用JSONへ書き出す', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: '1500文字' })).toContainText('元の記録は保持されています');
  expect(downloads).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ace-quest-engine-v0')!).state.logs[0].reflection)).toBe(outcome);
});
