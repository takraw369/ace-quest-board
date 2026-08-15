import Ajv2020, { type ErrorObject } from 'ajv/dist/2020';
import canonicalSchema from '../contracts/ace-method/APP_QUEST_PACK_SCHEMA.json';
import canonicalQuestPack from '../contracts/ace-method/quest-pack.json';
import type {
  FlowCompassQuestStage,
  FlowCompassQuestViewModel,
  FlowCompassStepId,
} from '@/types/flow-compass';

export const ACE_METHOD_CANONICAL_SOURCE = {
  type: 'ace-method.quest-pack',
  repository: 'takraw369/ace-method',
  canonicalCommit: '89b17f011366f1a36385fbc54a475b4eb7844c61',
  path: 'flow-compass/app/quest-pack.json',
  schemaPath: 'flow-compass/APP_QUEST_PACK_SCHEMA.json',
  contractVersion: 'flow-compass.quest-pack/0.1.0',
} as const;

const EXPECTED_STAGE_LABELS = [
  'ARRIVE',
  'LOCATE',
  'EXPERIMENT',
  'REORIENT',
  'RECORD',
] as const;

const STAGE_PRESENTATION: Record<
  (typeof EXPECTED_STAGE_LABELS)[number],
  { id: FlowCompassStepId; displayLabel: string }
> = {
  ARRIVE: { id: 'arrive', displayLabel: 'ARRIVE' },
  LOCATE: { id: 'locate', displayLabel: 'LOCATE' },
  EXPERIMENT: { id: 'compress-release', displayLabel: 'COMPRESS / RELEASE' },
  REORIENT: { id: 'reorient', displayLabel: 'REORIENT' },
  RECORD: { id: 'record', displayLabel: 'RECORD' },
};

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateCanonicalPack = ajv.compile(canonicalSchema);

export class QuestPackValidationError extends Error {
  readonly source = ACE_METHOD_CANONICAL_SOURCE;
  readonly issues: string[];

  constructor(message: string, issues: string[]) {
    super(`${message}\n- ${issues.join('\n- ')}`);
    this.name = 'QuestPackValidationError';
    this.issues = issues;
  }
}

const formatSchemaIssue = (issue: ErrorObject) => {
  const path = issue.instancePath || '/';
  return `${path} ${issue.message ?? 'is invalid'}`;
};

const asRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new QuestPackValidationError('Canonical quest-pack adapter failed', [
      `${path} must be an object`,
    ]);
  }
  return value as Record<string, unknown>;
};

export function validateCanonicalQuestPack(payload: unknown): void {
  if (!validateCanonicalPack(payload)) {
    throw new QuestPackValidationError(
      'Canonical quest-pack does not match ace-method schema',
      (validateCanonicalPack.errors ?? []).map(formatSchemaIssue),
    );
  }
}

function adaptStage(value: unknown, index: number): FlowCompassQuestStage {
  const stage = asRecord(value, `quests[].steps[${index}]`);
  const canonicalLabel = stage.label;
  const expectedLabel = EXPECTED_STAGE_LABELS[index];

  if (canonicalLabel !== expectedLabel) {
    throw new QuestPackValidationError('Unsupported canonical quest step sequence', [
      `quests[].steps[${index}].label expected ${expectedLabel}, received ${String(canonicalLabel)}`,
    ]);
  }

  const presentation = STAGE_PRESENTATION[expectedLabel];
  return {
    id: presentation.id,
    canonicalLabel: expectedLabel,
    displayLabel: presentation.displayLabel,
    instruction: String(stage.instruction),
    startSecond: Number(stage.startSecond),
    estimatedSeconds: Number(stage.durationSeconds),
  };
}

function assertQuestViewModel(value: FlowCompassQuestViewModel): void {
  const issues: string[] = [];
  if (value.stages.length !== EXPECTED_STAGE_LABELS.length) {
    issues.push(`view model must contain ${EXPECTED_STAGE_LABELS.length} stages`);
  }
  value.stages.forEach((stage, index) => {
    if (stage.canonicalLabel !== EXPECTED_STAGE_LABELS[index]) {
      issues.push(`view model stage ${index} must be ${EXPECTED_STAGE_LABELS[index]}`);
    }
    if (!stage.instruction.trim()) issues.push(`view model stage ${index} instruction is empty`);
  });
  if (value.source.contractVersion !== ACE_METHOD_CANONICAL_SOURCE.contractVersion) {
    issues.push(`unsupported source contract ${value.source.contractVersion}`);
  }
  if (issues.length) {
    throw new QuestPackValidationError('Athlete Quest view model is invalid', issues);
  }
}

function adaptQuest(
  value: unknown,
  pack: Record<string, unknown>,
): FlowCompassQuestViewModel {
  const quest = asRecord(value, 'quests[]');
  const scientificStatus = asRecord(pack.scientificStatus, 'scientificStatus');
  const record = asRecord(quest.record, 'quests[].record');
  const id = String(quest.id);

  if (!id.startsWith('flow-compass:')) {
    throw new QuestPackValidationError('Unknown canonical quest type', [
      `quests[].id ${id} is not a FLOW COMPASS quest`,
    ]);
  }

  const viewModel: FlowCompassQuestViewModel = {
    viewModelVersion: 'athlete-quest.flow-compass-view/0.1.0',
    id,
    day: Number(quest.day),
    slug: String(quest.slug),
    title: String(quest.title),
    phase: quest.phase as FlowCompassQuestViewModel['phase'],
    status: quest.status as FlowCompassQuestViewModel['status'],
    durationSeconds: Number(quest.durationSeconds),
    prompt: String(quest.prompt),
    intention: String(quest.intention),
    stages: (quest.steps as unknown[]).map(adaptStage),
    scientificStatus: {
      scope: String(scientificStatus.scope),
      metaphors: [...(scientificStatus.metaphors as string[])],
      claimPolicy: String(scientificStatus.claimPolicy),
    },
    bodyCue: String(quest.bodyCue),
    microExperiment: String(quest.microExperiment),
    reflection: [...(quest.reflection as string[])],
    record: {
      observation: String(record.observation),
      interpretation: String(record.interpretation),
      nextAction: String(record.nextAction),
      deltaScale: [...(record.deltaScale as number[])],
    },
    progressionLink: String(quest.progressionLink),
    safetyCue: String(quest.safetyCue),
    source: {
      ...ACE_METHOD_CANONICAL_SOURCE,
      sourceVersion: String(pack.sourceVersion),
      locale: String(pack.locale),
    },
  };

  assertQuestViewModel(viewModel);
  return viewModel;
}

export function adaptCanonicalQuestPack(payload: unknown): FlowCompassQuestViewModel[] {
  validateCanonicalQuestPack(payload);
  const pack = asRecord(payload, 'root');
  const quests = (pack.quests as unknown[]).map((quest) => adaptQuest(quest, pack));
  const days = quests.map((quest) => quest.day);
  const uniqueDays = new Set(days);

  if (uniqueDays.size !== quests.length || quests.some((quest, index) => quest.day !== index + 1)) {
    throw new QuestPackValidationError('Canonical quest-pack day sequence is invalid', [
      `expected unique ordered days 1..${quests.length}, received ${days.join(', ')}`,
    ]);
  }

  return quests;
}

let canonicalQuestCache: FlowCompassQuestViewModel[] | undefined;

export function loadCanonicalFlowCompassQuests(): FlowCompassQuestViewModel[] {
  canonicalQuestCache ??= adaptCanonicalQuestPack(canonicalQuestPack);
  return canonicalQuestCache;
}

export function loadCanonicalFlowCompassQuest(day: number): FlowCompassQuestViewModel {
  if (!Number.isInteger(day) || day < 1 || day > 35) {
    throw new QuestPackValidationError('Requested FLOW COMPASS day is unsupported', [
      `day must be an integer from 1 through 35; received ${String(day)}`,
    ]);
  }

  const quest = loadCanonicalFlowCompassQuests().find((candidate) => candidate.day === day);
  if (!quest) {
    throw new QuestPackValidationError('Canonical FLOW COMPASS quest is missing', [
      `no quest found for day ${day}`,
    ]);
  }
  return quest;
}
