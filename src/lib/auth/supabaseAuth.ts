export const SUPABASE_URL = "https://qydbtholbwbuwiswmqsr.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mv8O-7lEXnuubYLVzXIJnA_A1irQJB9";

const SESSION_KEY = "ace.auth.session.v1";
const RETURN_TO_KEY = "ace.auth.return_to.v1";

type StoredSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type AceUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type AceRole = "admin" | "coach" | "flower";

export type AceIdentity = {
  user: AceUser;
  role: AceRole;
  displayName: string | null;
  contactId: string | null;
};

export type MyAceSnapshot = {
  serialCode: string | null;
  progress: {
    xpTotal: number;
    growthLevel: number;
    growthRank: string;
    streakCurrent: number;
    actionsCompleted: number;
    questsCompleted: number;
    educationCompleted: number;
  };
  curriculum: {
    stage: string | null;
    branch: string | null;
    loopPosition: string | null;
    recommendedNodeId: string | null;
    reason: string | null;
    confidence: number | null;
  } | null;
  recommendation: {
    type: string;
    ref: string | null;
    destination: string | null;
    reason: string;
    status: string;
    generatedAt: string;
  } | null;
  recentEvents: Array<{
    eventType: string;
    capturedSignal: string | null;
    occurredAt: string;
  }>;
  learningCounts: Record<string, number>;
};

function saveSession(session: StoredSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function authHeaders(accessToken?: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function beginGoogleLogin(returnTo = "/my-ace") {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RETURN_TO_KEY, returnTo);
  const redirectTo = `${window.location.origin}/login`;
  const url = new URL(`${SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", redirectTo);
  window.location.assign(url.toString());
}

export function hasOAuthCallbackHash() {
  if (typeof window === "undefined") return false;
  return window.location.hash.includes("access_token=") || window.location.hash.includes("error=");
}

export function consumeOAuthCallback(): string {
  if (typeof window === "undefined") return "/my-ace";

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = Number(params.get("expires_in") ?? "3600");

  if (!accessToken || !refreshToken) {
    const error = params.get("error_description") || params.get("error") || "oauth_callback_missing_tokens";
    throw new Error(error);
  }

  saveSession({
    accessToken,
    refreshToken,
    expiresAt: Date.now() + Math.max(60, expiresIn - 30) * 1000,
  });

  window.history.replaceState({}, "", window.location.pathname);
  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) || "/my-ace";
  sessionStorage.removeItem(RETURN_TO_KEY);
  return returnTo;
}

async function refreshSession(session: StoredSession): Promise<StoredSession | null> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  const refreshed: StoredSession = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in - 30) * 1000,
  };
  saveSession(refreshed);
  return refreshed;
}

export async function getAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const session = loadSession();
  if (!session) return null;
  if (Date.now() < session.expiresAt) return session.accessToken;
  const refreshed = await refreshSession(session);
  return refreshed?.accessToken ?? null;
}

async function restSelect<T>(path: string, accessToken: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      ...authHeaders(accessToken),
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`supabase_rest_${response.status}`);
  return (await response.json()) as T[];
}

export async function getCurrentIdentity(): Promise<AceIdentity | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: authHeaders(accessToken),
  });
  if (!userResponse.ok) {
    clearSession();
    return null;
  }

  const user = (await userResponse.json()) as AceUser;
  const [roles, profiles, contacts] = await Promise.all([
    restSelect<{ role: AceRole }>(`user_roles?select=role&user_id=eq.${encodeURIComponent(user.id)}`, accessToken),
    restSelect<{ display_name: string | null }>(`profiles?select=display_name&id=eq.${encodeURIComponent(user.id)}`, accessToken),
    restSelect<{ id: string }>(`contacts?select=id&auth_user_id=eq.${encodeURIComponent(user.id)}`, accessToken),
  ]);

  return {
    user,
    role: roles[0]?.role ?? "flower",
    displayName: profiles[0]?.display_name ?? null,
    contactId: contacts[0]?.id ?? null,
  };
}

export async function getMyAceSnapshot(identity: AceIdentity): Promise<MyAceSnapshot> {
  const accessToken = await getAccessToken();
  const contactId = identity.contactId;
  if (!accessToken || !contactId) {
    return {
      serialCode: null,
      progress: {
        xpTotal: 0,
        growthLevel: 1,
        growthRank: "seed",
        streakCurrent: 0,
        actionsCompleted: 0,
        questsCompleted: 0,
        educationCompleted: 0,
      },
      curriculum: null,
      recommendation: null,
      recentEvents: [],
      learningCounts: {},
    };
  }

  const encodedContactId = encodeURIComponent(contactId);
  const [progressRows, curriculumRows, recommendationRows, eventRows, learningRows, serialRows] = await Promise.all([
    restSelect<{
      xp_total: number;
      growth_level: number;
      growth_rank: string;
      streak_current: number;
      actions_completed: number;
      quests_completed: number;
      education_completed: number;
    }>(`person_progress?select=xp_total,growth_level,growth_rank,streak_current,actions_completed,quests_completed,education_completed&contact_id=eq.${encodedContactId}`, accessToken),
    restSelect<{
      current_spine_stage: string | null;
      active_branch: string | null;
      learning_loop_position: string | null;
      recommended_node_id: string | null;
      reason: string | null;
      confidence: number | null;
    }>(`curriculum_states?select=current_spine_stage,active_branch,learning_loop_position,recommended_node_id,reason,confidence&person_id=eq.${encodedContactId}`, accessToken),
    restSelect<{
      recommendation_type: string;
      recommendation_ref: string | null;
      destination: string | null;
      reason: string;
      status: string;
      generated_at: string;
    }>(`education_recommendations?select=recommendation_type,recommendation_ref,destination,reason,status,generated_at&person_id=eq.${encodedContactId}&status=in.(proposed,shown,accepted)&order=generated_at.desc&limit=1`, accessToken),
    restSelect<{
      event_type: string;
      captured_signal: string | null;
      occurred_at: string;
    }>(`quest_events?select=event_type,captured_signal,occurred_at&person_id=eq.${encodedContactId}&order=occurred_at.desc&limit=3`, accessToken),
    restSelect<{ learning_status: string }>(`learning_states?select=learning_status&person_id=eq.${encodedContactId}`, accessToken),
    restSelect<{ serial_code: string | null }>(`person_serials?select=serial_code&person_id=eq.${encodedContactId}`, accessToken),
  ]);

  const progress = progressRows[0];
  const curriculum = curriculumRows[0];
  const recommendation = recommendationRows[0];
  const learningCounts = learningRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.learning_status] = (acc[row.learning_status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    serialCode: serialRows[0]?.serial_code ?? null,
    progress: {
      xpTotal: progress?.xp_total ?? 0,
      growthLevel: progress?.growth_level ?? 1,
      growthRank: progress?.growth_rank ?? "seed",
      streakCurrent: progress?.streak_current ?? 0,
      actionsCompleted: progress?.actions_completed ?? 0,
      questsCompleted: progress?.quests_completed ?? 0,
      educationCompleted: progress?.education_completed ?? 0,
    },
    curriculum: curriculum
      ? {
          stage: curriculum.current_spine_stage,
          branch: curriculum.active_branch,
          loopPosition: curriculum.learning_loop_position,
          recommendedNodeId: curriculum.recommended_node_id,
          reason: curriculum.reason,
          confidence: curriculum.confidence,
        }
      : null,
    recommendation: recommendation
      ? {
          type: recommendation.recommendation_type,
          ref: recommendation.recommendation_ref,
          destination: recommendation.destination,
          reason: recommendation.reason,
          status: recommendation.status,
          generatedAt: recommendation.generated_at,
        }
      : null,
    recentEvents: eventRows.map((event) => ({
      eventType: event.event_type,
      capturedSignal: event.captured_signal,
      occurredAt: event.occurred_at,
    })),
    learningCounts,
  };
}

export async function signOut() {
  const accessToken = await getAccessToken();
  if (accessToken) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: authHeaders(accessToken),
    }).catch(() => undefined);
  }
  clearSession();
}
