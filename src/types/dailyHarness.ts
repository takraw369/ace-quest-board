export type HarnessDeck = 'vision' | 'theme' | 'medium';

export type HarnessCard = {
  id: string;
  deck: HarnessDeck;
  title: string;
  subtitle: string;
  active: boolean;
  baseWeight: number;
  question: string;
  ignitionWords: string[];
};

export type HarnessSelection = Record<HarnessDeck, HarnessCard>;
