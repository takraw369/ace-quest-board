import { describe, expect, it } from 'vitest';
import canonicalQuestPack from '../contracts/ace-method/quest-pack.json';
import {
  ACE_METHOD_CANONICAL_SOURCE,
  QuestPackValidationError,
  adaptCanonicalQuestPack,
  loadCanonicalFlowCompassQuest,
  validateCanonicalQuestPack,
} from './flow-compass-quest-pack';
import {
  INITIAL_DAY_ONE_STATE,
  canAdvanceDayOne,
  dayOneReducer,
} from './flow-compass-day-one';

describe('ace-method canonical quest-pack consumer', () => {
  it('validates the exact canonical quest-pack against the ace-method schema', () => {
    expect(() => validateCanonicalQuestPack(canonicalQuestPack)).not.toThrow();
    expect(canonicalQuestPack.contractVersion).toBe('flow-compass.quest-pack/0.1.0');
    expect(canonicalQuestPack.quests).toHaveLength(35);
  });

  it('converts canonical Day 1 into the Athlete Quest view model', () => {
    const dayOne = loadCanonicalFlowCompassQuest(1);
    const canonicalDayOne = canonicalQuestPack.quests[0];

    expect(dayOne.id).toBe(canonicalDayOne.id);
    expect(dayOne.title).toBe(canonicalDayOne.title);
    expect(dayOne.prompt).toBe(canonicalDayOne.prompt);
    expect(dayOne.stages.map((stage) => stage.instruction)).toEqual(
      canonicalDayOne.steps.map((step) => step.instruction),
    );
    expect(dayOne.stages.map((stage) => stage.displayLabel)).toEqual([
      'ARRIVE',
      'LOCATE',
      'COMPRESS / RELEASE',
      'REORIENT',
      'RECORD',
    ]);
    expect(dayOne.source).toMatchObject(ACE_METHOD_CANONICAL_SOURCE);
  });

  it('loads Day 2 through the same adapter without a Day 2 UI', () => {
    const dayTwo = loadCanonicalFlowCompassQuest(2);
    const canonicalDayTwo = canonicalQuestPack.quests[1];

    expect(dayTwo.day).toBe(2);
    expect(dayTwo.slug).toBe('contact-map');
    expect(dayTwo.title).toBe(canonicalDayTwo.title);
    expect(dayTwo.stages[2].instruction).toBe(canonicalDayTwo.steps[2].instruction);
    expect(dayTwo.source.canonicalCommit).toBe(
      '89b17f011366f1a36385fbc54a475b4eb7844c61',
    );
  });

  it('converts all 35 canonical days with ordered, reusable stage structure', () => {
    const quests = adaptCanonicalQuestPack(canonicalQuestPack);

    expect(quests.map((quest) => quest.day)).toEqual(
      Array.from({ length: 35 }, (_, index) => index + 1),
    );
    expect(quests.every((quest) => quest.stages.length === 5)).toBe(true);
  });

  it('fails loudly for version mismatch and malformed payloads', () => {
    const unsupported = structuredClone(canonicalQuestPack) as Record<string, unknown>;
    unsupported.contractVersion = 'flow-compass.quest-pack/9.0.0';

    expect(() => validateCanonicalQuestPack(unsupported)).toThrow(QuestPackValidationError);
    expect(() => validateCanonicalQuestPack({ contractVersion: 'flow-compass.quest-pack/0.1.0' }))
      .toThrow(/does not match ace-method schema/);
    expect(() => loadCanonicalFlowCompassQuest(36)).toThrow(/day must be an integer/);
  });

  it('preserves the complete Day 1 interaction state machine', () => {
    const quest = loadCanonicalFlowCompassQuest(1);
    let state = dayOneReducer(INITIAL_DAY_ONE_STATE, { type: 'ARRIVE' });
    expect(canAdvanceDayOne(state)).toBe(true);
    state = dayOneReducer(state, { type: 'NEXT' });
    state = dayOneReducer(state, { type: 'LOCATE', point: { x: 50, y: 50 } });
    expect(canAdvanceDayOne(state)).toBe(true);
    state = dayOneReducer(state, { type: 'NEXT' });
    state = dayOneReducer(state, { type: 'SET_COMPRESSION', value: 70 });
    expect(canAdvanceDayOne(state)).toBe(true);
    state = dayOneReducer(state, { type: 'NEXT' });
    state = dayOneReducer(state, { type: 'SET_ORIENTATION', value: 30 });
    expect(canAdvanceDayOne(state)).toBe(true);
    state = dayOneReducer(state, { type: 'NEXT' });
    state = dayOneReducer(state, { type: 'SET_INSIGHT', value: quest.record.observation });
    expect(canAdvanceDayOne(state)).toBe(true);
    state = dayOneReducer(state, {
      type: 'COMPLETE',
      timestamp: '2026-08-15T00:00:00.000Z',
    });
    expect(state.completedAt).toBe('2026-08-15T00:00:00.000Z');
  });
});
