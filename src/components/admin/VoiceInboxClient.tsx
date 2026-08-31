"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCurrentIdentity, type AceIdentity } from "@/lib/auth/supabaseAuth";
import {
  getVoiceInbox,
  updateVoiceItem,
  type VoiceBucket,
  type VoiceItem,
  type VoicePatch,
  type VoicePriority,
  type VoiceStatus,
} from "@/lib/admin/voiceInbox";

const TYPE_LABELS: Record<string, string> = {
  praise: "よかった",
  outcome: "変わった",
  friction: "困った",
  request: "欲しい",
  edit: "修正",
  add: "追加",
  note: "メモ",
};

const STATUS_LABELS: Record<VoiceStatus, string> = {
  pending: "新着",
  reviewing: "検討中",
  applied: "反映済み",
  dismissed: "見送り",
};

const BUCKET_LABELS: Record<VoiceBucket, string> = {
  inbox: "INBOX",
  improvement: "改善",
  case: "Case",
  content: "Content",
  product: "商品",
  research: "調査",
};

const PRIORITIES: VoicePriority[] = ["P0", "P1", "P2", "P3"];
const STATUSES: VoiceStatus[] = ["pending", "reviewing", "applied", "dismissed"];
const BUCKETS: VoiceBucket[] = ["inbox", "improvement", "case", "content", "product", "research"];
const PRIORITY_ORDER: Record<VoicePriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function typeLabel(value: string) {
  return TYPE_LABELS[value] ?? value;
}

function clusterId(item: VoiceItem) {
  return item.clusterKey || item.theme || `${item.targetType}:${item.targetKey}:${item.feedbackType}`;
}

function suggestedBucket(item: VoiceItem): VoiceBucket {
  if (item.feedbackType === "outcome" || item.feedbackType === "praise") return "case";
  if (item.feedbackType === "friction" || item.feedbackType === "edit") return "improvement";
  if (item.feedbackType === "request" || item.feedbackType === "add") return "product";
  return "research";
}

function suggestedPriority(item: VoiceItem, clusterSize: number): VoicePriority {
  if ((item.feedbackType === "friction" || item.feedbackType === "request") && clusterSize >= 3) return "P0";
  if ((item.feedbackType === "friction" || item.feedbackType === "request") && clusterSize >= 2) return "P1";
  if (item.feedbackType === "friction" || item.feedbackType === "request") return "P1";
  return "P2";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPublicConsent(value: string) {
  return value === "anonymous_public" || value === "named_public";
}

export default function VoiceInboxClient() {
  const [identity, setIdentity] = useState<AceIdentity | null>(null);
  const [items, setItems] = useState<VoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | VoiceStatus>("all");
  const [bucketFilter, setBucketFilter] = useState<"all" | VoiceBucket>("all");

  useEffect(() => {
    let cancelled = false;

    void getCurrentIdentity()
      .then(async (current) => {
        if (!current) {
          window.location.replace("/login");
          return;
        }
        if (current.role !== "admin") {
          window.location.replace("/my-ace");
          return;
        }
        if (cancelled) return;
        setIdentity(current);
        const next = await getVoiceInbox(current);
        if (!cancelled) setItems(next);
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "voice_inbox_load_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clusterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = clusterId(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const clusters = useMemo(() => {
    const grouped = new Map<string, { key: string; label: string; type: string; count: number; open: number; latestAt: string }>();
    for (const item of items) {
      const key = clusterId(item);
      const existing = grouped.get(key);
      const label = item.theme || item.targetKey;
      const open = item.status === "pending" || item.status === "reviewing" ? 1 : 0;
      if (!existing) {
        grouped.set(key, { key, label, type: item.feedbackType, count: 1, open, latestAt: item.createdAt });
      } else {
        existing.count += 1;
        existing.open += open;
        if (item.createdAt > existing.latestAt) existing.latestAt = item.createdAt;
      }
    }
    return [...grouped.values()]
      .sort((a, b) => b.count - a.count || b.open - a.open || b.latestAt.localeCompare(a.latestAt))
      .slice(0, 6);
  }, [items]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...items]
      .filter((item) => typeFilter === "all" || item.feedbackType === typeFilter)
      .filter((item) => statusFilter === "all" || item.status === statusFilter)
      .filter((item) => bucketFilter === "all" || item.workflowBucket === bucketFilter)
      .filter((item) => {
        if (!normalized) return true;
        return [item.body, item.targetKey, item.targetType, item.theme ?? "", item.source]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((a, b) => {
        const priority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        return priority !== 0 ? priority : b.createdAt.localeCompare(a.createdAt);
      });
  }, [items, query, typeFilter, statusFilter, bucketFilter]);

  const metrics = useMemo(() => ({
    pending: items.filter((item) => item.status === "pending").length,
    signals: items.filter((item) => ["friction", "request"].includes(item.feedbackType) && item.status !== "dismissed").length,
    outcomes: items.filter((item) => ["outcome", "praise"].includes(item.feedbackType)).length,
    publicVoices: items.filter((item) => isPublicConsent(item.publicConsent)).length,
  }), [items]);

  async function applyPatch(item: VoiceItem, patch: VoicePatch) {
    if (!identity) return;
    setSavingId(item.id);
    setError(null);
    try {
      const updated = await updateVoiceItem(identity, item.id, patch);
      setItems((current) => current.map((candidate) => candidate.id === updated.id ? updated : candidate));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "voice_update_failed");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <main className="ace-theme-active grid min-h-[60vh] place-items-center bg-ace-bg px-6 text-ace-text">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-ace-accent" />
          <p className="mt-5 text-xs font-black tracking-[0.22em] text-ace-text-muted">VOICE INBOX LOADING</p>
        </div>
      </main>
    );
  }

  if (!identity) return null;

  return (
    <main className="ace-theme-active min-h-screen bg-ace-bg px-4 pb-24 pt-6 text-ace-text sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-black tracking-[0.28em] text-ace-accent">VOICE LOOP / ADMIN</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">VOICE INBOX</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ace-text-muted">
              顧客の声を「集める」で止めず、改善・Case・Content・商品へ流す判断画面。繰り返し出る声ほど上に浮かびます。
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/my-ace" className="rounded-xl border border-ace-border px-3 py-2 text-xs font-bold text-ace-text-secondary transition hover:bg-ace-raised">← My ACE</Link>
            <a href="https://masahiro-yamada.com/dashboard" className="rounded-xl border border-ace-accent/25 bg-ace-accent/8 px-3 py-2 text-xs font-black text-ace-accent-soft">Admin Dashboard ↗</a>
          </div>
        </header>

        {error ? (
          <div className="mt-5 rounded-2xl border border-ace-warning/25 bg-ace-deep px-4 py-3 text-sm text-ace-text-secondary">
            VOICEの読み書きでエラーが発生しました。<span className="ml-2 font-mono text-[10px] text-ace-text-muted">{error}</span>
          </div>
        ) : null}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="NEW" value={metrics.pending} note="未確認" />
          <Metric label="SIGNAL" value={metrics.signals} note="困った / 欲しい" />
          <Metric label="OUTCOME" value={metrics.outcomes} note="成果 / 好反応" />
          <Metric label="PUBLIC" value={metrics.publicVoices} note="掲載許諾あり" />
        </section>

        <section className="mt-5 rounded-[28px] border border-ace-border bg-ace-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[9px] font-black tracking-[0.24em] text-ace-accent">REPEATED SIGNALS</div>
              <h2 className="mt-1 text-xl font-black">繰り返し出ている声</h2>
            </div>
            <span className="text-[10px] text-ace-text-muted">theme / target × type で自動集約</span>
          </div>
          {clusters.length ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clusters.map((cluster) => (
                <button
                  key={cluster.key}
                  type="button"
                  onClick={() => {
                    setQuery(cluster.label);
                    setTypeFilter(cluster.type);
                  }}
                  className="rounded-2xl border border-ace-border bg-ace-deep p-4 text-left transition hover:border-ace-accent/30 hover:bg-ace-raised"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[9px] font-black tracking-[0.15em] text-ace-accent">{typeLabel(cluster.type)}</span>
                    <span className="rounded-full bg-ace-raised px-2.5 py-1 text-[10px] font-black">×{cluster.count}</span>
                  </div>
                  <div className="mt-2 line-clamp-2 text-sm font-black leading-5">{cluster.label}</div>
                  <div className="mt-2 text-[10px] text-ace-text-muted">open {cluster.open} · latest {formatDate(cluster.latestAt)}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-ace-border bg-ace-deep p-5 text-sm text-ace-text-muted">VOICEが入ると、繰り返しシグナルがここに現れます。</div>
          )}
        </section>

        <section className="mt-5 rounded-[28px] border border-ace-border bg-ace-deep p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="本文・Quest・テーマを検索"
              className="rounded-xl border border-ace-border bg-ace-surface px-4 py-3 text-sm outline-none transition placeholder:text-ace-text-muted focus:border-ace-accent/45"
            />
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-xl border border-ace-border bg-ace-surface px-3 py-3 text-xs font-bold">
              <option value="all">全タイプ</option>
              {["friction", "request", "outcome", "praise", "edit", "add", "note"].map((value) => <option key={value} value={value}>{typeLabel(value)}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | VoiceStatus)} className="rounded-xl border border-ace-border bg-ace-surface px-3 py-3 text-xs font-bold">
              <option value="all">全ステータス</option>
              {STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
            </select>
            <select value={bucketFilter} onChange={(event) => setBucketFilter(event.target.value as "all" | VoiceBucket)} className="rounded-xl border border-ace-border bg-ace-surface px-3 py-3 text-xs font-bold">
              <option value="all">全ルート</option>
              {BUCKETS.map((value) => <option key={value} value={value}>{BUCKET_LABELS[value]}</option>)}
            </select>
          </div>
          <div className="mt-3 text-[10px] text-ace-text-muted">{filtered.length} / {items.length} VOICE</div>
        </section>

        <section className="mt-4 space-y-3">
          {filtered.map((item) => {
            const count = clusterCounts.get(clusterId(item)) ?? 1;
            const autoBucket = suggestedBucket(item);
            const autoPriority = suggestedPriority(item, count);
            const isSaving = savingId === item.id;

            return (
              <article key={item.id} className="rounded-[24px] border border-ace-border bg-ace-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[9px] font-black tracking-[0.12em]">
                      <span className="rounded-full bg-ace-accent/10 px-2.5 py-1 text-ace-accent">{typeLabel(item.feedbackType)}</span>
                      <span className="rounded-full bg-ace-deep px-2.5 py-1 text-ace-text-secondary">{STATUS_LABELS[item.status]}</span>
                      <span className="rounded-full bg-ace-deep px-2.5 py-1 text-ace-text-secondary">{item.priority}</span>
                      <span className="text-ace-text-muted">{BUCKET_LABELS[item.workflowBucket]}</span>
                      {count > 1 ? <span className="text-ace-warning">REPEAT ×{count}</span> : null}
                      {isPublicConsent(item.publicConsent) ? <span className="text-ace-accent-soft">PUBLIC OK</span> : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-[15px] font-bold leading-7 text-ace-text">{item.body}</p>
                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ace-text-muted">
                      <span>{item.targetType} / {item.targetKey}</span>
                      <span>{item.source}</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  <div className="text-[9px] font-black tracking-[0.12em] text-ace-text-muted">{isSaving ? "SAVING..." : "READY"}</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-[9px] font-black tracking-[0.12em] text-ace-text-muted">PRIORITY
                    <select value={item.priority} disabled={isSaving} onChange={(event) => void applyPatch(item, { priority: event.target.value as VoicePriority })} className="mt-1.5 w-full rounded-xl border border-ace-border bg-ace-deep px-3 py-2.5 text-xs font-bold text-ace-text">
                      {PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="text-[9px] font-black tracking-[0.12em] text-ace-text-muted">ROUTE
                    <select value={item.workflowBucket} disabled={isSaving} onChange={(event) => void applyPatch(item, { workflowBucket: event.target.value as VoiceBucket })} className="mt-1.5 w-full rounded-xl border border-ace-border bg-ace-deep px-3 py-2.5 text-xs font-bold text-ace-text">
                      {BUCKETS.map((value) => <option key={value} value={value}>{BUCKET_LABELS[value]}</option>)}
                    </select>
                  </label>
                  <label className="text-[9px] font-black tracking-[0.12em] text-ace-text-muted">STATUS
                    <select value={item.status} disabled={isSaving} onChange={(event) => void applyPatch(item, { status: event.target.value as VoiceStatus })} className="mt-1.5 w-full rounded-xl border border-ace-border bg-ace-deep px-3 py-2.5 text-xs font-bold text-ace-text">
                      {STATUSES.map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}
                    </select>
                  </label>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="text-[9px] font-black tracking-[0.12em] text-ace-text-muted">THEME / CLUSTER
                    <input
                      key={`${item.id}-${item.theme ?? ""}`}
                      defaultValue={item.theme ?? ""}
                      onBlur={(event) => {
                        const next = event.target.value.trim() || null;
                        if (next !== item.theme) void applyPatch(item, { theme: next, clusterKey: next });
                      }}
                      className="mt-1.5 w-full rounded-xl border border-ace-border bg-ace-deep px-3 py-2.5 text-xs text-ace-text outline-none focus:border-ace-accent/40"
                      placeholder="例：Quest完了導線 / 価格 / 継続"
                    />
                  </label>
                  <label className="text-[9px] font-black tracking-[0.12em] text-ace-text-muted">REVIEW NOTE
                    <input
                      key={`${item.id}-${item.reviewNote ?? ""}`}
                      defaultValue={item.reviewNote ?? ""}
                      onBlur={(event) => {
                        const next = event.target.value.trim() || null;
                        if (next !== item.reviewNote) void applyPatch(item, { reviewNote: next });
                      }}
                      className="mt-1.5 w-full rounded-xl border border-ace-border bg-ace-deep px-3 py-2.5 text-xs text-ace-text outline-none focus:border-ace-accent/40"
                      placeholder="判断理由・次アクション"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {item.workflowBucket === "inbox" ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void applyPatch(item, { workflowBucket: autoBucket, priority: autoPriority, status: item.status === "pending" ? "reviewing" : item.status })}
                      className="rounded-xl border border-ace-accent/25 bg-ace-accent/8 px-3 py-2 text-[10px] font-black text-ace-accent-soft transition hover:bg-ace-accent/15 disabled:opacity-50"
                    >
                      AUTO TRIAGE → {BUCKET_LABELS[autoBucket]} / {autoPriority}
                    </button>
                  ) : null}
                  {item.status !== "applied" ? (
                    <button type="button" disabled={isSaving} onClick={() => void applyPatch(item, { status: "applied" })} className="rounded-xl border border-ace-border px-3 py-2 text-[10px] font-black text-ace-text-secondary transition hover:bg-ace-raised disabled:opacity-50">反映済みにする</button>
                  ) : null}
                </div>
              </article>
            );
          })}

          {!filtered.length ? (
            <div className="rounded-[24px] border border-dashed border-ace-border bg-ace-surface p-8 text-center text-sm text-ace-text-muted">
              条件に合うVOICEはまだありません。
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-2xl border border-ace-border bg-ace-deep p-4">
      <div className="text-[9px] font-black tracking-[0.18em] text-ace-text-muted">{label}</div>
      <div className="mt-2 text-2xl font-black">{value.toLocaleString("ja-JP")}</div>
      <div className="mt-1 text-[10px] text-ace-text-muted">{note}</div>
    </div>
  );
}
