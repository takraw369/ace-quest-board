export const FLOW_COMPASS_STEP_IDS = [
  'arrive',
  'locate',
  'compress-release',
  'reorient',
  'record',
] as const;

export type FlowCompassStepId = (typeof FLOW_COMPASS_STEP_IDS)[number];

export interface CompassPoint {
  x: number;
  y: number;
}

export interface FlowCompassDayOneState {
  schemaVersion: 1;
  stepIndex: number;
  center: CompassPoint;
  compression: number;
  compressionRange: {
    min: number;
    max: number;
  };
  orientation: number;
  arrived: boolean;
  located: boolean;
  reoriented: boolean;
  insight: string;
  anchor: string;
  completedAt: string | null;
}

export interface FlowCompassQuestStage {
  id: FlowCompassStepId;
  label: string;
  prompt: string;
  estimatedSeconds: number;
}

/**
 * Temporary contract for the prototype. It is intentionally content-first so
 * it can later be adapted to ace-method/flow-compass/QUEST_SCHEMA.json.
 */
export interface FlowCompassQuestDefinition {
  schemaVersion: 'prototype-0.1';
  slug: string;
  title: string;
  intent: string;
  stages: FlowCompassQuestStage[];
  scientificStatus: {
    measurable: string[];
    metaphor: string[];
  };
}
