import { getActiveHarnessCards } from '@/lib/dailyHarness';
import type { HarnessCard, HarnessDeck, HarnessSelection } from '@/types/dailyHarness';

const DECKS: HarnessDeck[] = ['vision', 'theme', 'medium'];

export type HarnessRandom = () => number;

export function weightedPick(cards: HarnessCard[], random: HarnessRandom = Math.random): HarnessCard {
  const eligible = cards.filter((card) => card.active && Number.isFinite(card.baseWeight) && card.baseWeight > 0);
  if (eligible.length === 0) throw new Error('No eligible Daily Harness cards');

  const totalWeight = eligible.reduce((sum, card) => sum + card.baseWeight, 0);
  let cursor = random() * totalWeight;

  for (const card of eligible) {
    cursor -= card.baseWeight;
    if (cursor < 0) return card;
  }

  return eligible[eligible.length - 1];
}

export function drawHarnessSelection(random: HarnessRandom = Math.random): HarnessSelection {
  return DECKS.reduce((selection, deck) => {
    selection[deck] = weightedPick(getActiveHarnessCards(deck), random);
    return selection;
  }, {} as HarnessSelection);
}
