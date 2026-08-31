import {
  getAccessToken,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
  type AceIdentity,
} from "@/lib/auth/supabaseAuth";

export type AdminOsSyncState = {
  syncKey: string;
  status: string;
  rowCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export type AdminOsProject = {
  projectId: string;
  projectName: string;
  area: string | null;
  projectType: string | null;
  status: string | null;
  priority: string | null;
  outcome: string | null;
  nextAction: string | null;
  detailLink: string | null;
};

export type AdminOsTask = {
  taskId: string | null;
  status: string | null;
  priority: string | null;
  task: string | null;
  project: string | null;
  dueDate: string | null;
  timeHint: string | null;
  nextAction: string | null;
  actionRecordedAt: string | null;
};

export type AdminOsSnapshot = {
  sync: AdminOsSyncState[];
  projects: AdminOsProject[];
  tasks: AdminOsTask[];
};

export type PrivateOsActionResult = {
  recorded: boolean;
  alreadyRecorded: boolean;
  taskId: string;
  eventId: number | null;
  xpAwarded: number;
  xpTotal: number;
  growthLevel: number;
  growthRank: string;
  streak: number;
  actionsCompleted: number;
};

type SyncRow = {
  sync_key: string;
  status: string;
  row_count: number;
  last_synced_at: string | null;
  last_error: string | null;
};

type ProjectRow = {
  project_id: string;
  project_name: string;
  area: string | null;
  project_type: string | null;
  status: string | null;
  priority: string | null;
  outcome: string | null;
  next_action: string | null;
  detail_link: string | null;
};

type TaskRow = {
  task_id: string | null;
  status: string | null;
  priority: string | null;
  task: string | null;
  project: string | null;
  due_date: string | null;
  time_hint: string | null;
  next_action: string | null;
};

type ActionRow = {
  payload: Record<string, unknown> | null;
  occurred_at: string;
};

type ActionRpcRow = {
  recorded?: boolean;
  already_recorded?: boolean;
  task_id?: string;
  event_id?: number;
  xp_awarded?: number;
  xp_total?: number;
  growth_level?: number;
  growth_rank?: string;
  streak?: number;
  actions_completed?: number;
};

function adminHeaders(accessToken: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
}

async function adminSelect<T>(path: string, accessToken: string): Promise<T[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: adminHeaders(accessToken),
  });

  if (!response.ok) throw new Error(`admin_os_rest_${response.status}`);
  return (await response.json()) as T[];
}

export async function completePrivateOsAction(taskId: string): Promise<PrivateOsActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("private_os_action_not_authenticated");

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/complete_private_os_action`, {
    method: "POST",
    headers: {
      ...adminHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_task_id: taskId }),
  });

  if (!response.ok) throw new Error(`private_os_action_${response.status}`);
  const row = (await response.json()) as ActionRpcRow;

  return {
    recorded: Boolean(row.recorded),
    alreadyRecorded: Boolean(row.already_recorded),
    taskId: row.task_id ?? taskId,
    eventId: typeof row.event_id === "number" ? row.event_id : null,
    xpAwarded: typeof row.xp_awarded === "number" ? row.xp_awarded : 0,
    xpTotal: typeof row.xp_total === "number" ? row.xp_total : 0,
    growthLevel: typeof row.growth_level === "number" ? row.growth_level : 1,
    growthRank: row.growth_rank ?? "seed",
    streak: typeof row.streak === "number" ? row.streak : 0,
    actionsCompleted: typeof row.actions_completed === "number" ? row.actions_completed : 0,
  };
}

export async function getAdminOsSnapshot(identity: AceIdentity): Promise<AdminOsSnapshot | null> {
  if (identity.role !== "admin") return null;
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const [syncRows, projectRows, taskRows, actionRows] = await Promise.all([
    adminSelect<SyncRow>(
      "os_sync_state?select=sync_key,status,row_count,last_synced_at,last_error&order=sync_key.asc",
      accessToken,
    ),
    adminSelect<ProjectRow>(
      "os_current_projects?select=project_id,project_name,area,project_type,status,priority,outcome,next_action,detail_link&order=source_row.asc",
      accessToken,
    ),
    adminSelect<TaskRow>(
      "os_tasks?select=task_id,status,priority,task,project,due_date,time_hint,next_action&order=source_row.asc",
      accessToken,
    ),
    adminSelect<ActionRow>(
      "funnel_events?select=payload,occurred_at&event_type=eq.micro_action_completed&channel=eq.my_ace_private_os&order=occurred_at.desc&limit=200",
      accessToken,
    ),
  ]);

  const actionRecordedAt = new Map<string, string>();
  for (const row of actionRows) {
    const taskId = row.payload?.task_id;
    if (typeof taskId === "string" && taskId && !actionRecordedAt.has(taskId)) {
      actionRecordedAt.set(taskId, row.occurred_at);
    }
  }

  return {
    sync: syncRows.map((row) => ({
      syncKey: row.sync_key,
      status: row.status,
      rowCount: row.row_count,
      lastSyncedAt: row.last_synced_at,
      lastError: row.last_error,
    })),
    projects: projectRows.map((row) => ({
      projectId: row.project_id,
      projectName: row.project_name,
      area: row.area,
      projectType: row.project_type,
      status: row.status,
      priority: row.priority,
      outcome: row.outcome,
      nextAction: row.next_action,
      detailLink: row.detail_link,
    })),
    tasks: taskRows.map((row) => ({
      taskId: row.task_id,
      status: row.status,
      priority: row.priority,
      task: row.task,
      project: row.project,
      dueDate: row.due_date,
      timeHint: row.time_hint,
      nextAction: row.next_action,
      actionRecordedAt: row.task_id ? actionRecordedAt.get(row.task_id) ?? null : null,
    })),
  };
}
