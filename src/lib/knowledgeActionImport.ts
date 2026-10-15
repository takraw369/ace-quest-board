/** User-selected private file handoff; source links are never fetched automatically. */
export type KnowledgeActionSource = { nodeId: string; sourceKey: string; title: string; canonicalUrl: string };
export type KnowledgeActionLineage = {
  schema: 'masa-knowledge-action/v1';
  proposalId: string;
  destination: 'ACE' | 'SLF' | 'Athlete Quest';
  mode: 'training_reflection';
  reviewStatus: 'ai_candidate' | 'human_reviewed';
  visibility: 'private';
  sources: KnowledgeActionSource[];
};
export type KnowledgeActionDraft = KnowledgeActionLineage & {
  title: string;
  practice: { instruction: string; steps: string[]; reflectionQuestions: string[] };
  constraints: string[];
};
export type KnowledgeActionReflection = { outcome: string; learning: string; nextAction: string };
export type KnowledgeActionFeedback = {
  schema: 'masa-knowledge-action-feedback/v1';
  eventId: string;
  proposalId: string;
  sourceNodeIds: string[];
  reflection: KnowledgeActionReflection;
  occurredAt: string;
};

export const KNOWLEDGE_ACTION_MAX_BYTES = 128 * 1024;
export const KNOWLEDGE_ACTION_REFLECTION_MAX_CHARS = 1500;
export const KNOWLEDGE_ACTION_FEEDBACK_NOTE_MAX_CHARS = 5000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STABLE_ID = /^[A-Za-z0-9_-]{1,120}$/;

function invalid(field: string): never {
  throw new Error(`Knowledge Actionファイルの形式を確認してください（${field}）。`);
}
function object(value: unknown, keys: string[], field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(field);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !keys.includes(key)) || keys.some((key) => !Object.hasOwn(record, key))) invalid(field);
  return record;
}
function text(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) invalid(field);
  return value.trim();
}
function list(value: unknown, min: number, max: number, field: string): string[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(field);
  return value.map((entry) => text(entry, 1000, field));
}
function canonicalUrl(value: unknown): string {
  const raw = text(value, 2048, 'canonicalUrl');
  if (/\s/.test(raw)) invalid('canonicalUrl');
  let url: URL;
  try { url = new URL(raw); } catch { invalid('canonicalUrl'); }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || /(?:^|\.)(?:localhost|local)$/.test(url.hostname)) invalid('canonicalUrl');
  return url.href;
}

export function parseKnowledgeActionDraft(raw: string): KnowledgeActionDraft {
  if (new TextEncoder().encode(raw).byteLength > KNOWLEDGE_ACTION_MAX_BYTES) invalid('128KB以内');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { invalid('JSON'); }
  const record = object(parsed, ['schema', 'proposalId', 'title', 'destination', 'mode', 'reviewStatus', 'visibility', 'sources', 'practice', 'constraints'], 'schema');
  if (record.schema !== 'masa-knowledge-action/v1' || record.mode !== 'training_reflection' || record.visibility !== 'private') invalid('version / mode / visibility');
  if (record.destination !== 'ACE' && record.destination !== 'SLF' && record.destination !== 'Athlete Quest') invalid('destination');
  if (record.reviewStatus !== 'ai_candidate' && record.reviewStatus !== 'human_reviewed') invalid('reviewStatus');
  const proposalId = text(record.proposalId, 120, 'proposalId');
  if (!STABLE_ID.test(proposalId)) invalid('proposalId ASCII');
  if (!Array.isArray(record.sources) || record.sources.length < 1 || record.sources.length > 12) invalid('sources');
  const sources = record.sources.map((source) => {
    const item = object(source, ['nodeId', 'sourceKey', 'title', 'canonicalUrl'], 'source');
    const nodeId = text(item.nodeId, 36, 'nodeId');
    if (!UUID.test(nodeId)) invalid('nodeId UUID');
    return { nodeId, sourceKey: text(item.sourceKey, 240, 'sourceKey'), title: text(item.title, 240, 'source title'), canonicalUrl: canonicalUrl(item.canonicalUrl) };
  });
  if (new Set(sources.map((source) => source.nodeId.toLowerCase())).size !== sources.length) invalid('重複nodeId');
  const practice = object(record.practice, ['instruction', 'steps', 'reflectionQuestions'], 'practice');
  return {
    schema: 'masa-knowledge-action/v1', proposalId, title: text(record.title, 240, 'title'),
    destination: record.destination, mode: 'training_reflection', reviewStatus: record.reviewStatus,
    visibility: 'private', sources,
    practice: { instruction: text(practice.instruction, 4000, 'instruction'), steps: list(practice.steps, 1, 20, 'steps'), reflectionQuestions: list(practice.reflectionQuestions, 1, 12, 'reflectionQuestions') },
    constraints: list(record.constraints, 0, 20, 'constraints'),
  };
}

export function knowledgeActionText(draft: KnowledgeActionDraft): string {
  return [draft.practice.instruction, ...draft.practice.steps.map((step, index) => `${index + 1}. ${step}`),
    ...(draft.constraints.length ? ['実践条件', ...draft.constraints] : [])].join('\n');
}
export function knowledgeActionLineage(draft: KnowledgeActionDraft): KnowledgeActionLineage {
  return { schema: draft.schema, proposalId: draft.proposalId, destination: draft.destination, mode: draft.mode,
    reviewStatus: draft.reviewStatus, visibility: draft.visibility, sources: draft.sources.map((source) => ({ ...source })) };
}
export function knowledgeActionReviewLabel(lineage: KnowledgeActionLineage): string {
  return lineage.reviewStatus === 'ai_candidate' ? 'AI候補（未確定）' : 'レビュー済み（ファイルの申告）';
}
export function knowledgeActionProvenance(lineage: KnowledgeActionLineage): string {
  return ['非公開のKnowledge Action下書き', knowledgeActionReviewLabel(lineage),
    `Proposal: ${lineage.proposalId} / 適用先: ${lineage.destination}`,
    ...lineage.sources.map((source) => `Source: ${source.nodeId} / ${source.sourceKey} / ${source.title}\n${source.canonicalUrl}`)].join('\n');
}
export function knowledgeActionFeedback(log: {
  id: string; completedAt: string; reflection?: string;
  practiceReflection?: KnowledgeActionReflection; sourceLineage?: KnowledgeActionLineage;
}): KnowledgeActionFeedback {
  if (!log.sourceLineage) throw new Error('この記録にはKnowledge Actionの出典がありません。');
  const eventId = `ace-${log.id}`;
  if (!STABLE_ID.test(eventId) || !STABLE_ID.test(log.sourceLineage.proposalId)) throw new Error('記録IDを確認してください。');
  const reflection = log.practiceReflection ?? { outcome: log.reflection ?? '', learning: '', nextAction: '' };
  for (const field of ['outcome', 'learning', 'nextAction'] as const) {
    if (typeof reflection[field] !== 'string') throw new Error('振り返りの記録形式を確認してください。');
    if (reflection[field].length > KNOWLEDGE_ACTION_REFLECTION_MAX_CHARS) {
      throw new Error('書き出せる振り返りは各項目1500文字以内です。元の記録は保持されています。1500文字以内に整理した新しい記録を作成してから書き出してください。');
    }
  }
  if (!reflection.outcome.trim()) throw new Error('実際に観察した結果を記録してから書き出してください。');
  const note = `実践結果：${reflection.outcome.trim()}\n学び：${reflection.learning.trim()}\n次の行動：${reflection.nextAction.trim()}`;
  if (note.length > KNOWLEDGE_ACTION_FEEDBACK_NOTE_MAX_CHARS) throw new Error('Dashboardへ戻す振り返りを合計5000文字以内に整理してください。');
  const completed = new Date(log.completedAt);
  if (Number.isNaN(completed.getTime())) throw new Error('記録日時を確認してください。');
  return { schema: 'masa-knowledge-action-feedback/v1', eventId, proposalId: log.sourceLineage.proposalId,
    sourceNodeIds: log.sourceLineage.sources.map((source) => source.nodeId),
    reflection: { outcome: reflection.outcome.trim(), learning: reflection.learning.trim(), nextAction: reflection.nextAction.trim() }, occurredAt: completed.toISOString() };
}
