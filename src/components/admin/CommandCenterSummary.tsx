"use client";

import { useMemo } from "react";
import type { AdminOsProject, AdminOsSnapshot, AdminOsTask } from "@/lib/admin/privateOs";

const ACTIVE_TASK_STATUSES = new Set(["NOW", "NEXT", "REVIEW", "WAIT"]);
const ACTIVE_PROJECT_STATUSES = new Set(["ACTIVE", "BUILD", "REVIEW", "DESIGN"]);
const TASK_PRIORITY: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const TASK_STATUS: Record<string, number> = { NOW: 0, REVIEW: 1, NEXT: 2, WAIT: 3 };

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function yen(value: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(value);
}

function pickFocusTask(tasks: AdminOsTask[], todayKey: string) {
  return [...tasks]
    .filter((task) => ACTIVE_TASK_STATUSES.has(task.status ?? ""))
    .sort((a, b) => {
      const focusRank = (task: AdminOsTask) => {
        if (task.status === "NOW" && task.dueDate === todayKey) return 0;
        if (task.status === "NOW" && task.timeHint?.includes("今日")) return 1;
        if (task.status === "NOW") return 2;
        if (task.status === "REVIEW") return 3;
        if (task.status === "NEXT") return 4;
        return 5;
      };
      const focusDiff = focusRank(a) - focusRank(b);
      if (focusDiff !== 0) return focusDiff;
      const priorityDiff = (TASK_PRIORITY[a.priority ?? ""] ?? 9) - (TASK_PRIORITY[b.priority ?? ""] ?? 9);
      if (priorityDiff !== 0) return priorityDiff;
      return (TASK_STATUS[a.status ?? ""] ?? 9) - (TASK_STATUS[b.status ?? ""] ?? 9);
    })[0] ?? null;
}

function resolveFocusProject(projects: AdminOsProject[]) {
  const sProjects = projects.filter(
    (project) => project.priority === "S" && ACTIVE_PROJECT_STATUSES.has(project.status ?? ""),
  );
  const activeSProjects = sProjects.filter((project) => project.status === "ACTIVE");

  if (activeSProjects.length === 1) return { project: activeSProjects[0], ambiguous: false, sProjects };
  if (activeSProjects.length > 1) return { project: null, ambiguous: true, sProjects };
  if (sProjects.length === 1) return { project: sProjects[0], ambiguous: false, sProjects };
  return { project: null, ambiguous: sProjects.length > 1, sProjects };
}

export default function CommandCenterSummary({ snapshot }: { snapshot: AdminOsSnapshot }) {
  const today = useMemo(() => new Date(), []);
  const todayKey = localDateKey(today);
  const weekEndKey = localDateKey(addDays(today, 6));

  const activeTasks = snapshot.tasks.filter((task) => ACTIVE_TASK_STATUSES.has(task.status ?? ""));
  const focusTask = pickFocusTask(activeTasks, todayKey);
  const { project: focusProject, ambiguous: focusAmbiguous, sProjects } = resolveFocusProject(snapshot.projects);
  const dueThisWeek = activeTasks.filter((task) => task.dueDate && task.dueDate >= todayKey && task.dueDate <= weekEndKey);
  const overdue = activeTasks.filter((task) => task.dueDate && task.dueDate < todayKey);
  const syncIssues = snapshot.sync.filter((item) => item.status !== "ok");
  const taskBoardUrl = snapshot.sync.find((item) => item.syncKey === "task_board_tasks")?.sourceUrl ?? null;
  const projectsUrl = snapshot.sync.find((item) => item.syncKey === "master_dashboard_projects")?.sourceUrl ?? null;

  const sourceLinks = [
    ["Calendar", "https://calendar.google.com/calendar/u/0/r"],
    ["TASK BOARD", taskBoardUrl],
    ["PROJECTS", projectsUrl],
    ["CONTENT", snapshot.sync.find((item) => item.syncKey === "content_os_master")?.sourceUrl],
    ["Want to", snapshot.sync.find((item) => item.syncKey === "want_to_master")?.sourceUrl],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <div className="mt-5 rounded-[24px] border border-ace-accent/25 bg-ace-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[9px] font-black tracking-[0.24em] text-ace-accent">TODAY CONTROL</div>
          <h3 className="mt-1 text-xl font-black">今日、何を動かすか</h3>
        </div>
        <div className="text-right text-[10px] leading-5 text-ace-text-muted">
          {today.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" })}
          <br />Drive正本から判断
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ace-accent/30 bg-ace-deep p-4">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[0.12em]">
          <span className="text-ace-accent">FIRST MOVE</span>
          {focusTask?.priority ? <span className="text-ace-text-muted">{focusTask.priority}</span> : null}
          {focusTask?.taskId ? <span className="text-ace-text-muted">{focusTask.taskId}</span> : null}
          {focusTask?.timeHint ? <span className="text-ace-text-muted">{focusTask.timeHint}</span> : null}
        </div>
        <div className="mt-2 text-lg font-black leading-7">{focusTask?.task ?? "NOWタスクを1つ決める"}</div>
        {focusTask?.nextAction ? <p className="mt-2 text-xs leading-5 text-ace-text-muted">NEXT: {focusTask.nextAction}</p> : null}
        {taskBoardUrl ? (
          <a href={taskBoardUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-full border border-ace-accent/25 px-3 py-1.5 text-[10px] font-black text-ace-accent-soft">
            TASK BOARDを開く ↗
          </a>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-ace-border bg-ace-deep p-4">
          <div className="text-[9px] font-black tracking-[0.16em] text-ace-text-muted">LIVE REVENUE</div>
          <div className="mt-2 text-xl font-black">{yen(snapshot.revenue.liveRevenueJpy)}</div>
          <div className="mt-1 text-[10px] text-ace-text-muted">本番顧客 {snapshot.revenue.liveCustomerCount} / 決済 {snapshot.revenue.livePurchaseCount}</div>
        </div>
        <div className="rounded-2xl border border-ace-border bg-ace-deep p-4">
          <div className="text-[9px] font-black tracking-[0.16em] text-ace-text-muted">DEADLINE 7D</div>
          <div className="mt-2 text-xl font-black">{dueThisWeek.length}</div>
          <div className={`mt-1 text-[10px] ${overdue.length ? "text-ace-warning" : "text-ace-text-muted"}`}>期限超過 {overdue.length}</div>
        </div>
        <div className={`rounded-2xl border bg-ace-deep p-4 ${focusAmbiguous ? "border-ace-warning/30" : "border-ace-border"}`}>
          <div className="text-[9px] font-black tracking-[0.16em] text-ace-text-muted">S PROJECTS</div>
          <div className="mt-2 text-xl font-black">{sProjects.length}</div>
          <div className={`mt-1 line-clamp-1 text-[10px] ${focusAmbiguous ? "text-ace-warning" : "text-ace-text-muted"}`}>
            {focusProject?.projectName ?? (focusAmbiguous ? "Focus未指定" : "S Projectなし")}
          </div>
        </div>
        <div className={`rounded-2xl border bg-ace-deep p-4 ${syncIssues.length ? "border-ace-warning/30" : "border-ace-border"}`}>
          <div className="text-[9px] font-black tracking-[0.16em] text-ace-text-muted">SYSTEM</div>
          <div className="mt-2 text-xl font-black">{syncIssues.length ? `${syncIssues.length} ALERT` : "HEALTHY"}</div>
          <div className="mt-1 text-[10px] text-ace-text-muted">Drive → Supabase</div>
        </div>
      </div>

      {focusProject ? (
        <a href={focusProject.detailLink ?? "#"} target={focusProject.detailLink ? "_blank" : undefined} rel={focusProject.detailLink ? "noreferrer" : undefined} className="mt-3 block rounded-2xl border border-ace-border bg-ace-deep p-4">
          <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[0.12em]">
            <span className="text-ace-accent">FOCUS PROJECT</span>
            <span className="text-ace-text-muted">{focusProject.projectId}</span>
            <span className="text-ace-text-muted">{focusProject.status}</span>
          </div>
          <div className="mt-2 text-sm font-black">{focusProject.projectName}</div>
          {focusProject.nextAction ? <div className="mt-2 text-xs leading-5 text-ace-text-muted">NEXT: {focusProject.nextAction}</div> : null}
        </a>
      ) : focusAmbiguous ? (
        <a href={projectsUrl ?? "#"} target={projectsUrl ? "_blank" : undefined} rel={projectsUrl ? "noreferrer" : undefined} className="mt-3 block rounded-2xl border border-ace-warning/30 bg-ace-deep p-4">
          <div className="text-[9px] font-black tracking-[0.16em] text-ace-warning">FOCUS PROJECT 未指定</div>
          <div className="mt-2 text-sm font-black">S優先Projectが {sProjects.length} 件あります</div>
          <div className="mt-2 text-xs leading-5 text-ace-text-muted">司令塔で勝手に選ばず、MASTER_DASHBOARD側でFocusを1つに絞るべき状態として表示しています。</div>
        </a>
      ) : null}

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {sourceLinks.map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="shrink-0 rounded-full border border-ace-border bg-ace-deep px-3 py-2 text-[10px] font-black text-ace-text-secondary">
            {label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}
