# Vitality 8

## Purpose

Vitality 8 is a lightweight ACE observation model for the current life-system state. It is not a personality type and is not presented as a scientifically validated diagnostic instrument.

It stays separate from ACE Calibration:

- ACE Calibration = BODY / COGNITION / EMOTION / ACTION state sensor.
- Vitality 8 = higher-level observation of whether life is both sustainable and moving forward.

## Eight elements

### HEALTH / 壊れず続く

- SENSING
- MARGIN
- LEARNING
- REGULATION

### BURNING / 前へ進む

- WANT
- SPACE
- ENERGY
- LOOP

Each element is self-rated from 0 to 5 for the current moment.

## Output

The UI shows:

- 8-element radar
- HEALTH average
- BURNING average
- lowest-scoring bottleneck
- HEALTH × BURNING quadrant: FLOW / STABLE / OVERDRIVE / RESET

The bottleneck is more important than the total score.

## Persistence boundary

Current implementation stores a versioned snapshot in namespaced browser localStorage. Do not invent a mapping from the existing 4-axis ACE Calibration.

Promote Vitality 8 to Supabase only after repeated use shows that cross-device history, coach visibility, recommendation input, or time-series analysis is worth the additional schema and operational coupling.

## Canonical surface

Vitality 8 belongs to the ACE user's personal surface under `/me`. It is not a MASA admin/control-plane feature.
