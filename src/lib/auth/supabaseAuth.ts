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
