export const PWA_STORAGE_KEY = 'flow:pwa:bootstrap:v1';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://qydbtholbwbuwiswmqsr.supabase.co';

export type Recommendation = {
  id: string;
  recommendation_type: 'education' | 'quest' | 'connection' | string;
  recommendation_ref?: string | null;
  destination?: string | null;
  reason?: string | null;
  confidence?: number | string | null;
  alternative?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  status?: string;
};

export type AceAxis = 'BODY' | 'COGNITION' | 'EMOTION' | 'ACTION';

export type AceSnapshot = {
  assessment_id?: string;
  completed_at?: string;
  assessed_at?: string;
  contract_version?: string;
  scores?: Partial<Record<AceAxis, number>>;
  result_axis?: AceAxis;
  context?: {
    balance_skipped?: boolean;
  };
};

export type PwaBootstrap = {
  ok: boolean;
  session_token?: string;
  session_expires_at?: string;
  profile?: {
    display_name?: string | null;
    lifecycle_stage?: string;
  };
  flow?: {
    level?: string;
    bottleneck?: string;
    scores?: Record<string, number>;
  } | null;
  ace?: AceSnapshot | null;
  current_recommendations?: Record<string, unknown> | null;
  progress?: {
    xp_total?: number;
    growth_level?: number;
    growth_rank?: string;
    streak_current?: number;
    streak_best?: number;
    actions_completed?: number;
    quests_completed?: number;
    education_completed?: number;
  };
  curriculum?: {
    current_spine_stage?: string | null;
    active_branch?: string | null;
    recommended_node_id?: string | null;
    reason?: string | null;
  } | null;
  recommendations?: Recommendation[];
  cached_at?: string;
};

export function loadBootstrap(): PwaBootstrap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PWA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(PWA_STORAGE_KEY);
    return null;
  }
}

export function saveBootstrap(data: PwaBootstrap) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PWA_STORAGE_KEY, JSON.stringify({ ...data, cached_at: new Date().toISOString() }));
}

export function recommendationOf(data: PwaBootstrap | null, type: string) {
  return data?.recommendations?.find((rec) => rec.recommendation_type === type) ?? null;
}

export function sessionIsUsable(data: PwaBootstrap | null) {
  if (!data?.session_token || !data.session_expires_at) return false;
  return new Date(data.session_expires_at).getTime() > Date.now() + 30_000;
}

export async function growthAction(
  data: PwaBootstrap,
  action: string,
  recommendationId?: string | null,
  payload: Record<string, unknown> = {},
) {
  if (!sessionIsUsable(data)) throw new Error('session_expired');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/pwa-growth-action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: data.session_token,
      action,
      recommendation_id: recommendationId ?? null,
      data: payload,
    }),
  });
  let result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error ?? `http_${response.status}`);

  if (action === 'quest_complete') {
    try {
      const refreshResponse = await fetch(`${SUPABASE_URL}/functions/v1/pwa-refresh-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: data.session_token,
          previous_recommendation_id: recommendationId ?? null,
        }),
      });
      const refreshed = await refreshResponse.json().catch(() => ({}));
      if (
        refreshResponse.ok
        && refreshed?.ok
        && Array.isArray(refreshed?.recommendations)
        && refreshed.recommendations.length > 0
      ) {
        result = {
          ...result,
          recommendations: refreshed.recommendations,
          recommendation_summary: refreshed.recommendation_summary ?? null,
        };
      }
    } catch {
      // Quest completion is already durable. A refresh miss should not undo it.
    }
  }

  const hasFreshRecommendations = Array.isArray(result?.recommendations) && result.recommendations.length > 0;
  if (result?.progress || hasFreshRecommendations || result?.recommendation_summary) {
    saveBootstrap({
      ...data,
      progress: result?.progress
        ? { ...(data.progress ?? {}), ...result.progress }
        : data.progress,
      recommendations: hasFreshRecommendations ? result.recommendations : data.recommendations,
      current_recommendations: result?.recommendation_summary ?? data.current_recommendations,
    });
  }
  return result;
}
