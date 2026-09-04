'use client';

import { useEffect, useState } from 'react';
import {
  getAccessToken,
  getCurrentIdentity,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/lib/auth/supabaseAuth';

type Evidence = {
  id: string;
  recommendation_ref: string | null;
  reason: string | null;
  acted_at: string | null;
  outcome: {
    prediction?: string;
    actual?: string;
    reflection?: string;
  } | null;
  metadata: Record<string, unknown> | null;
  alternative: Record<string, unknown> | null;
};

function titleOf(item: Evidence) {
  const metadataTitle = item.metadata?.node_title;
  if (typeof metadataTitle === 'string' && metadataTitle.trim()) return metadataTitle;
  const questKey = item.metadata?.quest_key;
  if (typeof questKey === 'string' && questKey.trim()) return questKey;
  return item.recommendation_ref ?? 'Completed Quest';
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default function QuestEvidencePanel() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [identity, accessToken] = await Promise.all([getCurrentIdentity(), getAccessToken()]);
        if (!identity?.contactId || !accessToken) return;
        const query = new URLSearchParams({
          select: 'id,recommendation_ref,reason,acted_at,outcome,metadata,alternative',
          person_id: `eq.${identity.contactId}`,
          recommendation_type: 'eq.quest',
          status: 'eq.completed',
          order: 'acted_at.desc',
          limit: '20',
        });
        const response = await fetch(`${SUPABASE_URL}/rest/v1/education_recommendations?${query.toString()}`, {
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });
        if (!response.ok) return;
        const rows = (await response.json()) as Evidence[];
        if (!cancelled) setItems(rows);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!loaded || items.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-50 rounded-full border border-ace-accent/25 bg-ace-deep/95 px-4 py-3 text-xs font-black text-ace-accent-soft shadow-2xl backdrop-blur sm:right-6"
      >
        Evidence {items.length} →
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-black/70 p-3 backdrop-blur-sm sm:p-6" onMouseDown={() => setOpen(false)}>
          <section
            className="ml-auto h-full w-full max-w-2xl overflow-y-auto rounded-[30px] border border-ace-border bg-ace-bg p-5 text-ace-text shadow-2xl sm:p-7"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-ace-accent">MY ACE / EVIDENCE</p>
                <h2 className="mt-2 text-2xl font-black">体験が、自分の証拠になる。</h2>
                <p className="mt-2 text-sm leading-7 text-ace-text-muted">Prediction → Actual → Reflection を残し、次のQuest選択に使える自分専用の学習履歴。</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-ace-border px-3 py-2 text-sm text-ace-text-muted">×</button>
            </div>

            <div className="mt-6 space-y-4">
              {items.map((item) => {
                const prediction = text(item.outcome?.prediction);
                const actual = text(item.outcome?.actual);
                const reflection = text(item.outcome?.reflection);
                const duration = text(item.alternative?.duration);
                return (
                  <article key={item.id} className="rounded-[24px] border border-ace-border bg-ace-surface p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ace-accent">QUEST EVIDENCE</p>
                        <h3 className="mt-2 text-lg font-black">{titleOf(item)}</h3>
                      </div>
                      <div className="shrink-0 text-right text-[10px] text-ace-text-muted">
                        {duration && <div>{duration}</div>}
                        {item.acted_at && <div className="mt-1">{new Date(item.acted_at).toLocaleDateString('ja-JP')}</div>}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {prediction && <EvidenceRow label="PREDICT" value={prediction} />}
                      {actual && <EvidenceRow label="ACTUAL" value={actual} />}
                      {reflection && <EvidenceRow label="REFLECT" value={reflection} strong />}
                    </div>
                    {!prediction && !actual && !reflection && <p className="mt-4 text-sm text-ace-text-muted">完了記録あり。詳細Evidenceは次回のQuestから蓄積されます。</p>}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function EvidenceRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${strong ? 'border-ace-accent/20 bg-ace-accent/5' : 'border-ace-border bg-ace-deep'}`}>
      <p className="text-[9px] font-black tracking-[0.18em] text-ace-text-muted">{label}</p>
      <p className="mt-2 text-sm leading-7 text-ace-text-secondary">{value}</p>
    </div>
  );
}
