import {
  getAccessToken,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  type AceIdentity,
} from "@/lib/auth/supabaseAuth";

export type VoicePriority = "P0" | "P1" | "P2" | "P3";
export type VoiceStatus = "pending" | "reviewing" | "applied" | "dismissed";
export type VoiceBucket = "inbox" | "improvement" | "case" | "content" | "product" | "research";

export type VoiceItem = {
  id: string;
  targetType: string;
  targetKey: string;
  feedbackType: string;
  body: string;
  status: VoiceStatus;
  source: string;
  createdAt: string;
  updatedAt: string;
  personId: string | null;
  clientEventId: string | null;
  publicConsent: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  priority: VoicePriority;
  workflowBucket: VoiceBucket;
  theme: string | null;
  clusterKey: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
};

type VoiceRow = {
  id: string;
  target_type: string;
  target_key: string;
  feedback_type: string;
  body: string;
  status: VoiceStatus;
  source: string;
  created_at: string;
  updated_at: string;
  person_id: string | null;
  client_event_id: string | null;
  public_consent: string;
  metadata: Record<string, unknown> | null;
  occurred_at: string;
  priority: VoicePriority;
  workflow_bucket: VoiceBucket;
  theme: string | null;
  cluster_key: string | null;
  review_note: string | null;
  reviewed_at: string | null;
};

export type VoicePatch = Partial<{
  status: VoiceStatus;
  priority: VoicePriority;
  workflowBucket: VoiceBucket;
  theme: string | null;
  clusterKey: string | null;
  reviewNote: string | null;
}>;

function fromRow(row: VoiceRow): VoiceItem {
  return {
    id: row.id,
    targetType: row.target_type,
    targetKey: row.target_key,
    feedbackType: row.feedback_type,
    body: row.body,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    personId: row.person_id,
    clientEventId: row.client_event_id,
    publicConsent: row.public_consent,
    metadata: row.metadata ?? {},
    occurredAt: row.occurred_at,
    priority: row.priority,
    workflowBucket: row.workflow_bucket,
    theme: row.theme,
    clusterKey: row.cluster_key,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
  };
}

async function adminRequest<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) throw new Error(`voice_inbox_rest_${response.status}`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getVoiceInbox(identity: AceIdentity): Promise<VoiceItem[]> {
  if (identity.role !== "admin") return [];
  const accessToken = await getAccessToken();
  if (!accessToken) return [];

  const rows = await adminRequest<VoiceRow[]>(
    "os_feedback?select=id,target_type,target_key,feedback_type,body,status,source,created_at,updated_at,person_id,client_event_id,public_consent,metadata,occurred_at,priority,workflow_bucket,theme,cluster_key,review_note,reviewed_at&order=created_at.desc&limit=250",
    accessToken,
  );

  return rows.map(fromRow);
}

export async function updateVoiceItem(identity: AceIdentity, id: string, patch: VoicePatch): Promise<VoiceItem> {
  if (identity.role !== "admin") throw new Error("voice_admin_required");
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("voice_auth_required");

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) {
    payload.status = patch.status;
    payload.reviewed_at = patch.status === "pending" ? null : new Date().toISOString();
  }
  if (patch.priority !== undefined) payload.priority = patch.priority;
  if (patch.workflowBucket !== undefined) payload.workflow_bucket = patch.workflowBucket;
  if (patch.theme !== undefined) payload.theme = patch.theme;
  if (patch.clusterKey !== undefined) payload.cluster_key = patch.clusterKey;
  if (patch.reviewNote !== undefined) payload.review_note = patch.reviewNote;

  const rows = await adminRequest<VoiceRow[]>(`os_feedback?id=eq.${encodeURIComponent(id)}`, accessToken, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
  });

  if (!rows[0]) throw new Error("voice_update_missing");
  return fromRow(rows[0]);
}
