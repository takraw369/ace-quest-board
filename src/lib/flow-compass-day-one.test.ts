import { describe, expect, it } from 'vitest';
import {
  INITIAL_DAY_ONE_STATE,
  canAdvanceDayOne,
  dayOneReducer,
  sanitizeDayOneState,
} from './flow-compass-day-one';

describe('FLOW COMPASS Day 1 state', () => {
  it('moves through the experience without passing either boundary', () => {
    let state = dayOneReducer(INITIAL_DAY_ONE_STATE, { type: 'BACK' });
    expect(state.stepIndex).toBe(0);

    for (let index = 0; index < 8; index += 1) {
      state = dayOneReducer(state, { type: 'NEXT' });
    }

    expect(state.stepIndex).toBe(4);
  });

  it('clamps a located center to the usable field', () => {
    const state = dayOneReducer(INITIAL_DAY_ONE_STATE, {
      type: 'LOCATE',
      point: { x: -20, y: 150 },
    });

    expect(state.center).toEqual({ x: 8, y: 92 });
    expect(state.located).toBe(true);
    expect(canAdvanceDayOne({ ...state, stepIndex: 1 })).toBe(true);
  });

  it('requires a meaningful compression and release range', () => {
    const step = { ...INITIAL_DAY_ONE_STATE, stepIndex: 2 };
    const compressed = dayOneReducer(step, { type: 'SET_COMPRESSION', value: 63 });
    const released = dayOneReducer(compressed, { type: 'SET_COMPRESSION', value: 28 });

    expect(released.compressionRange).toEqual({ min: 28, max: 63 });
    expect(canAdvanceDayOne(released)).toBe(true);
  });

  it('does not complete without an observation', () => {
    const untouched = dayOneReducer(INITIAL_DAY_ONE_STATE, {
      type: 'COMPLETE',
      timestamp: '2026-08-14T00:00:00.000Z',
    });
    expect(untouched.completedAt).toBeNull();

    const withInsight = dayOneReducer(
      { ...INITIAL_DAY_ONE_STATE, insight: ' 中心が少し下へ動いた ' },
      { type: 'COMPLETE', timestamp: '2026-08-14T00:00:00.000Z' },
    );
    expect(withInsight.insight).toBe('中心が少し下へ動いた');
    expect(withInsight.completedAt).toBe('2026-08-14T00:00:00.000Z');
  });

  it('sanitizes persisted prototype data', () => {
    const state = sanitizeDayOneState({
      stepIndex: 99,
      center: { x: Number.NaN, y: 101 },
      compression: -1,
      orientation: 500,
      insight: 42,
    });

    expect(state.stepIndex).toBe(4);
    expect(state.center).toEqual({ x: 8, y: 92 });
    expect(state.compression).toBe(0);
    expect(state.orientation).toBe(135);
    expect(state.insight).toBe('');
  });
});
