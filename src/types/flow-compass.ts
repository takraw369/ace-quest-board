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
  canonicalLabel: 'ARRIVE' | 'LOCATE' | 'EXPERIMENT' | 'REORIENT' | 'RECORD';
  displayLabel: string;
  instruction: string;
  startSecond: number;
  estimatedSeconds: number;
}

/**
 * Consumer-side view model for Athlete Quest UI. The canonical contract remains
 * owned by ace-method; this shape is only the validated adapter output.
 */
export interface FlowCompassQuestViewModel {
  viewModelVersion: 'athlete-quest.flow-compass-view/0.1.0';
  id: string;
  day: number;
  slug: string;
  title: string;
  phase: 'NOTICE' | 'UNFIX' | 'RELATE' | 'CIRCULATE' | 'NAVIGATE';
  status: 'test-ready' | 'authored';
  durationSeconds: number;
  prompt: string;
  intention: string;
  stages: FlowCompassQuestStage[];
  scientificStatus: {
    scope: string;
    metaphors: string[];
    claimPolicy: string;
  };
  bodyCue: string;
  microExperiment: string;
  reflection: string[];
  record: {
    observation: string;
    interpretation: string;
    nextAction: string;
    deltaScale: number[];
  };
  progressionLink: string;
  safetyCue: string;
  source: {
    type: 'ace-method.quest-pack';
    repository: 'takraw369/ace-method';
    canonicalCommit: '89b17f011366f1a36385fbc54a475b4eb7844c61';
    path: 'flow-compass/app/quest-pack.json';
    schemaPath: 'flow-compass/APP_QUEST_PACK_SCHEMA.json';
    contractVersion: 'flow-compass.quest-pack/0.1.0';
    sourceVersion: string;
    locale: string;
  };
}
