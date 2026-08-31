"use client";

import { useEffect, useMemo, useState } from "react";
import { getCurrentIdentity, type AceIdentity } from "@/lib/auth/supabaseAuth";
import CommandCenterSummary from "@/components/admin/CommandCenterSummary";
import {
  completePrivateOsAction,
  getAdminOsSnapshot,
  type AdminOsProject,
  type AdminOsSnapshot,
  type AdminOsTask,
} from "@/lib/admin/privateOs";

const syncLabels: Record<string, string> = {
  want_to_master: "Want to",
  master_dashboard_projects: "Projects",
  task_board_tasks: "Tasks",
  content_os_master: "Content",
};

const projectPriority: Record<string, number> = { S: 0, A: 1, B: 2, C: 3 };
const taskPriority: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const taskStatus: Record<string, number> = { NOW: 0, REVIEW: 1, NEXT: 2, WAIT: 3 };

function sortProjects(projects: AdminOsProject[]) {
  return [...projects]
    .filter((project) => !["COMPLETE", "HOLD", "ARCHIVE", "ARCHIVED"].includes(project.status ?? ""))
    .sort((a, b) => {
      const priorityDiff = (projectPriority[a.priority ?? ""] ?? 9) - (projectPriority[b.priority ?? ""] ?? 9);
      if (priorityDiff !== 0) return priorityDiff;
      return a.projectId.localeCompare(b.projectId);
    });
}

function sortTasks(tasks: AdminOsTask[]) {
  return [...tasks]
    .filter((task) => ["NOW", "NEXT", "REVIEW", "WAIT"].includes(task.status ?? ""))
    .sort((a, b) => {
      const priorityDiff = (taskPriority[a.priority ?? ""] ?? 9) - (taskPriority[b.priority ?? ""] ?? 9);
      if (priorityDiff !== 0) return priorityDiff;
      return (taskStatus[a.status ?? ""] ?? 9) - (taskStatus[b.status ?? ""] ?? 9);
    });
}

function formatSyncTime(value: string | null) {
  if (!value) return "未同期";
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActionTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function getIdentityAfterAuthSettles() {
  try {
    const identity = await getCurrentIdentity();
    if (identity) return identity;
  } catch {
    // My ACE and this admin panel can mount together immediately after OAuth.
    // A short retry avoids treating that transient auth race as an RLS failure.
  }

  await wait(300);
  return getCurrentIdentity();
}

export default function PrivateOsPanel() {
  const [identity, setIdentity] = useState<AceIdentity | null>(null);
  const [snapshot, setSnapshot] = useState<AdminOsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordingTaskId, setRecordingTaskId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getIdentityAfterAuthSettles()
      .then(async (currentIdentity) => {
        if (!currentIdentity || currentIdentity.role !== "admin") return;
        if (!cancelled) setIdentity(currentIdentity);
        const next = await getAdminOsSnapshot(currentIdentity);
        if (!cancelled) setSnapshot(next);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "private_os_load_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const projects = useMemo(() => sortProjects(snapshot?.projects ?? []).slice(0, 6), [snapshot]);
  const tasks = useMemo(() => sortTasks(snapshot?.tasks ?? []).slice(0, 6), [snapshot]);
  const hasSyncError = snapshot?.sync.some((item) => item.status !== "ok") ?? false;
  const statusNeedsAttention = Boolean(error || hasSyncError);
  const statusLabel = loading ? "SYNC CHECK" : error ? "LOAD ERROR" : hasSyncError ? "SYNC ATTENTION" : "SYNC HEALTHY";

  async function recordAction(task: AdminOsTask) {
    if (!identity || !task.taskId || recordingTaskId) return;

    setRecordingTaskId(task.taskId);
    setActionError(null);
    setActionMessage(null);

    try {
      const result = await completePrivateOsAction(task.taskId);
      const next = await getAdminOsSnapshot(identity);
      setSnapshot(next);

      if (result.alreadyRecorded) {
        setActionMessage(`${task.taskId} はACE ACTIONとして記録済みです。`);
      } else {
        setActionMessage(
          `ACTION +${result.xpAwarded} XP｜XP ${result.xpTotal}｜STREAK ${result.streak}日｜ACTION ${result.actionsCompleted}`,
        );
      }

      window.dispatchEvent(new CustomEvent("ace:progress-updated"));
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "private_os_action_failed");
    } finally {
      setRecordingTaskId(null);
    }
  }

  if (!loading && !snapshot && !error) return null;

  return (
    <section className="ace-theme-active bg-ace-bg px-4 pt-5 text-ace-text sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-5xl rounded-[30px] border border-ace-accent/25 bg-ace-deep p-5 shadow-2xl shadow-black/20 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black tracking-[0.28em] text-ace-accent">PRIVATE OS / COMMAND CENTER</div>
            <h2 className="mt-2 text-2xl font-black">Driveの現在地を、ここで判断する</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ace-text-muted">
              Drive / Sheetsを正本、Supabaseをread model、My ACEを判断UIとして表示。編集は正本側に残します。
            </p>
          </div>
          <div className={`rounded-full border px-3 py-1.5 text-[10px] font-black tracking-[0.12em] ${statusNeedsAttention ? "border-ace-warning/35 text-ace-warning" : "border-ace-accent/30 text-ace-accent-soft"}`}>
            {statusLabel}
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-ace-warning/25 bg-ace-surface p-4 text-sm text-ace-text-secondary">
            <div>Private OSデータを読み込めませんでした。認証状態を再確認しています。</div>
            <div className="mt-2 font-mono text-[10px] text-ace-text-muted">{error}</div>
          </div>
        ) : null}

        {actionMessage ? (
          <div className="mt-5 rounded-2xl border border-ace-accent/25 bg-ace-surface px-4 py-3 text-sm font-bold text-ace-accent-soft">
            {actionMessage}
          </div>
        ) : null}

        {actionError ? (
          <div className="mt-5 rounded-2xl border border-ace-warning/25 bg-ace-surface px-4 py-3 text-sm text-ace-text-secondary">
            ACTION記録に失敗しました。<span className="ml-2 font-mono text-[10px] text-ace-text-muted">{actionError}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-ace-surface" />)}
          </div>
        ) : snapshot ? (
          <>
            <CommandCenterSummary snapshot={snapshot} />

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {snapshot.sync.map((item) => {
                const card = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-black tracking-[0.16em] text-ace-text-muted">{syncLabels[item.syncKey] ?? item.syncKey}</span>
                      <span className={`h-2 w-2 rounded-full ${item.status === "ok" ? "bg-ace-accent" : "bg-ace-warning"}`} />
                    </div>
                    <div className="mt-2 text-2xl font-black">{item.rowCount.toLocaleString("ja-JP")}</div>
                    <div className="mt-1 text-[10px] text-ace-text-muted">{formatSyncTime(item.lastSyncedAt)}</div>
                  </>
                );

                return item.sourceUrl ? (
                  <a key={item.syncKey} href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded-2xl border border-ace-border bg-ace-surface p-4 transition hover:border-ace-accent/30">
                    {card}
                  </a>
                ) : (
                  <div key={item.syncKey} className="rounded-2xl border border-ace-border bg-ace-surface p-4">{card}</div>
                );
              })}
            </div>

            {snapshot.sync.some((item) => item.status !== "ok") ? (
              <div className="mt-3 rounded-2xl border border-ace-warning/25 bg-ace-surface px-4 py-3 text-xs leading-5 text-ace-text-secondary">
                {snapshot.sync
                  .filter((item) => item.status !== "ok")
                  .map((item) => `${syncLabels[item.syncKey] ?? item.syncKey}: ${item.lastError ?? item.status}`)
                  .join(" / ")}
              </div>
            ) : null}

            <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[24px] border border-ace-border bg-ace-surface p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-black tracking-[0.22em] text-ace-accent">NOW / NEXT</div>
                    <h3 className="mt-1 text-lg font-black">実行タスク</h3>
                  </div>
                  <span className="text-[10px] text-ace-text-muted">TASK_BOARD read model</span>
                </div>
                <p className="mt-2 text-[10px] leading-5 text-ace-text-muted">
                  DriveのStatusは変更せず、「実行した事実」だけACEへ記録します。
                </p>
                <div className="mt-4 space-y-3">
                  {tasks.map((task) => (
                    <div key={task.taskId ?? `${task.status}-${task.task}`} className="rounded-2xl border border-ace-border bg-ace-deep p-4">
                      <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[0.12em]">
                        <span className="text-ace-accent">{task.status ?? "TASK"}</span>
                        {task.priority ? <span className="text-ace-text-muted">{task.priority}</span> : null}
                        {task.taskId ? <span className="text-ace-text-muted">{task.taskId}</span> : null}
                      </div>
                      <div className="mt-2 text-sm font-black leading-5">{task.task ?? "Untitled task"}</div>
                      {task.nextAction ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-ace-text-muted">{task.nextAction}</p> : null}

                      {task.actionRecordedAt ? (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-ace-accent/20 bg-ace-surface px-3 py-2">
                          <span className="text-[10px] font-black tracking-[0.12em] text-ace-accent-soft">ACE ACTION RECORDED</span>
                          <span className="text-[9px] text-ace-text-muted">{formatActionTime(task.actionRecordedAt)}</span>
                        </div>
                      ) : task.taskId ? (
                        <button
                          type="button"
                          disabled={Boolean(recordingTaskId)}
                          onClick={() => void recordAction(task)}
                          className="mt-3 w-full rounded-xl border border-ace-accent/25 bg-ace-accent/10 px-3 py-2.5 text-xs font-black text-ace-accent-soft transition hover:bg-ace-accent/15 disabled:cursor-wait disabled:opacity-55"
                        >
                          {recordingTaskId === task.taskId ? "ACTION記録中…" : "実行を記録 → +10 XP"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-ace-border bg-ace-surface p-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-black tracking-[0.22em] text-ace-accent">PROJECT FLOW</div>
                    <h3 className="mt-1 text-lg font-black">進行Project</h3>
                  </div>
                  <span className="text-[10px] text-ace-text-muted">MASTER_DASHBOARD read model</span>
                </div>
                <div className="mt-4 space-y-3">
                  {projects.map((project) => {
                    const body = (
                      <>
                        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[0.12em]">
                          <span className="text-ace-accent">{project.projectId}</span>
                          {project.priority ? <span className="text-ace-text-muted">{project.priority}</span> : null}
                          {project.status ? <span className="text-ace-text-muted">{project.status}</span> : null}
                        </div>
                        <div className="mt-2 text-sm font-black leading-5">{project.projectName}</div>
                        {project.nextAction ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-ace-text-muted">NEXT: {project.nextAction}</p> : null}
                      </>
                    );

                    return project.detailLink ? (
                      <a key={project.projectId} href={project.detailLink} target="_blank" rel="noreferrer" className="block rounded-2xl border border-ace-border bg-ace-deep p-4 transition hover:border-ace-accent/30 hover:bg-ace-raised">
                        {body}
                      </a>
                    ) : (
                      <div key={project.projectId} className="rounded-2xl border border-ace-border bg-ace-deep p-4">{body}</div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
