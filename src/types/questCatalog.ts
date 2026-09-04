export type QuestActorMode =
  | 'caregiver_led'
  | 'caregiver_supported'
  | 'adult_scaffolded'
  | 'guided_self'
  | 'self_with_coach'
  | 'self'
  | 'self_or_coach';

export type QuestObservationAxis =
  | 'body'
  | 'emotion'
  | 'attention'
  | 'impulse'
  | 'action_planning'
  | 'meta';

export type QuestCatalogStatus = 'draft' | 'active' | 'retired';

export interface QuestCatalogExperience {
  intro: string;
  prediction: string;
  action: string;
  actual: string;
  reflection: string;
}

export interface QuestCatalogMetadata {
  phase_title?: string;
  canonical_loop?: string[];
  related_node_ids?: string[];
  source_section?: string;
  [key: string]: unknown;
}

/**
 * Canonical reusable Quest template stored in public.quest_catalog.
 *
 * This is intentionally separate from the personal Vision > Milestone > Quest > Task
 * hierarchy. A catalog item becomes a user-specific Quest only when the routing /
 * recommendation layer selects it for a person.
 */
export interface QuestCatalogItem {
  id: string;
  quest_key: string;
  capability: string;
  phase_code: string;
  phase_order: number;
  phase_item_order: number;
  global_order: number;
  age_band: string;
  title: string;
  instruction: string;
  actor_mode: QuestActorMode;
  estimated_minutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  xp_reward: number;
  observation_axes: QuestObservationAxis[];
  tags: string[];
  recommendation_ref: string;
  experience: QuestCatalogExperience;
  status: QuestCatalogStatus;
  source_asset_id?: string | null;
  source_asset_title?: string | null;
  version: string;
  metadata: QuestCatalogMetadata;
  created_at: string;
  updated_at: string;
}

export function questRecommendationRef(capability: string, questKey: string) {
  return `quest:${capability}:${questKey}`;
}
