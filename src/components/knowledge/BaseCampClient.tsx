"use client";

import { useEffect, useMemo, useState } from "react";
import {
  beginGoogleLogin,
  getAccessToken,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/lib/auth/supabaseAuth";

type ThemePack = {
  slug: string;
  name: string;
  one_line: string;
  icon: string;
  access_mode: "included" | "entitlement";
  status: "preview" | "live";
  has_access: boolean;
  asset_count: number;
  preview_assets: Array<{ id: string; type: string; title: string; summary?: string }>;
};

type LearningAsset = {
  id: string;
  asset_type: string;
  title: string;
  summary: string;
  asset_url: string;
  thumbnail_url?: string | null;
  metadata?: Record<string, unknown> | null;
  updated_at: string;
};

const assetIcon: Record<string, string> = {
  video: "▶",
  slide: "▤",
  guide: "▥",
  audio: "♪",
  worksheet: "✎",
  quest: "◆",
  reflection: "◌",
};

async function rpc<T>(name: string, body: Record<string, unknown>, accessToken?: string | null): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `rpc_${name}_${response.status}`);
  return (text ? JSON.parse(text) : null) as T;
}

export default function BaseCampClient() {
  const [packs, setPacks] = useState<ThemePack[]>([]);
  const [selected, setSelected] = useState<ThemePack | null>(null);
  const [assets, setAssets] = useState<LearningAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetLoading, setAssetLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const accessToken = await getAccessToken();
      setLoggedIn(Boolean(accessToken));
      const data = await rpc<ThemePack[]>("ace_basecamp_catalog_v1", {}, accessToken);
      setPacks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Base Campを読み込めませんでした");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const included = useMemo(() => packs.filter((pack) => pack.access_mode === "included").slice(0, 3), [packs]);
  const optional = useMemo(() => packs.filter((pack) => pack.access_mode === "entitlement"), [packs]);

  async function openPack(pack: ThemePack) {
    setSelected(pack);
    setAssets([]);
    if (!pack.has_access) return;
    setAssetLoading(true);
    setError("");
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setLoggedIn(false);
        return;
      }
      const data = await rpc<LearningAsset[]>("ace_theme_assets_v1", { p_theme_slug: pack.slug }, accessToken);
      setAssets(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "教材を読み込めませんでした");
    } finally {
      setAssetLoading(false);
    }
  }

  return (
    <>
      {loading && (
        <div className="mt-10 rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-6 text-sm text-[#7f8ca0]">
          登山口を準備中…
        </div>
      )}

      {!loading && error && !packs.length && (
        <div className="mt-10 rounded-[26px] border border-red-300/15 bg-red-300/[0.04] p-6 text-sm text-red-200">
          Base Campの接続に失敗しました。
        </div>
      )}

      {!loading && included.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[9px] font-bold tracking-[.2em] text-[#68768b]">OPEN NOW</div>
              <h2 className="mt-1 font-serif text-2xl font-semibold">いま登れる山</h2>
            </div>
            <span className="text-xs text-[#6f7c91]">まずは3つだけ</span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {included.map((pack) => (
              <button
                type="button"
                key={pack.slug}
                onClick={() => openPack(pack)}
                className="group rounded-[26px] border border-white/[0.08] bg-white/[0.025] p-5 text-left transition hover:-translate-y-0.5 hover:border-[#ff8a1f]/30 hover:bg-white/[0.045]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-4xl">{pack.icon}</div>
                  <span className="rounded-full border border-[#ff8a1f]/20 bg-[#ff8a1f]/[0.06] px-2.5 py-1 text-[9px] font-bold text-[#ffad62]">
                    ACEに含む
                  </span>
                </div>
                <h3 className="mt-8 font-serif text-2xl font-semibold">{pack.name}</h3>
                <p className="mt-2 text-sm leading-6 text-[#8d99ab]">{pack.one_line}</p>
                <div className="mt-5 flex items-center justify-between text-xs font-bold text-[#c7d0dd]">
                  <span>{pack.has_access ? "登山口へ →" : "ログインして登る →"}</span>
                  <span className="text-[10px] font-normal text-[#66748a]">{pack.asset_count} assets</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && optional.length > 0 && (
        <section className="mt-10">
          <div className="mb-4">
            <div className="text-[9px] font-bold tracking-[.2em] text-[#68768b]">EXPLORE MORE</div>
            <h2 className="mt-1 font-serif text-2xl font-semibold">次の山を見つける</h2>
            <p className="mt-2 text-sm text-[#7f8ba0]">ACEの土台から、必要なテーマへ。追加テーマは本当に使える教材が揃った山から開きます。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {optional.map((pack) => (
              <button
                type="button"
                key={pack.slug}
                onClick={() => openPack(pack)}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:border-white/[0.14] hover:bg-white/[0.035]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-3xl">{pack.icon}</div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[9px] font-bold text-[#7f8ca0]">
                    {pack.has_access ? "UNLOCKED" : "追加テーマ"}
                  </span>
                </div>
                <div className="mt-5 font-serif text-lg font-semibold">{pack.name}</div>
                <div className="mt-1 text-xs leading-5 text-[#7d899c]">{pack.one_line}</div>
                <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-[#59677b]">
                  <span>{pack.has_access ? "山を開く →" : pack.status === "live" ? "発見する" : "COMING NEXT"}</span>
                  <span>{pack.asset_count} assets</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm md:items-center" onClick={() => setSelected(null)}>
          <section
            className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-[30px] border border-white/[0.10] bg-[#0b121d] p-5 shadow-2xl md:p-7"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{selected.icon}</div>
                <div>
                  <div className="text-[9px] font-bold tracking-[.18em] text-[#ff9a42]">TRAILHEAD</div>
                  <h2 className="font-serif text-2xl font-semibold">{selected.name}</h2>
                </div>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.08] text-[#8d99ab]">×</button>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#8d99ab]">{selected.one_line}</p>

            {!selected.has_access && !loggedIn && selected.access_mode === "included" && (
              <div className="mt-6 rounded-2xl border border-[#ff8a1f]/20 bg-[#ff8a1f]/[0.05] p-5">
                <div className="font-bold">この山はACEに含まれています。</div>
                <p className="mt-2 text-xs leading-6 text-[#8794a8]">ログインすると教材とQuestへ進めます。</p>
                <button type="button" onClick={() => beginGoogleLogin("/knowledge")} className="mt-4 rounded-xl bg-[#ff8a1f] px-4 py-2.5 text-xs font-bold text-[#07152e]">Googleでログイン</button>
              </div>
            )}

            {!selected.has_access && selected.access_mode === "entitlement" && (
              <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                <div className="text-sm font-bold">まだ見えていない登山口。</div>
                <p className="mt-2 text-xs leading-6 text-[#7f8ca0]">
                  このテーマは追加パックとして育成中です。教材・体験・利用権が揃うまで購入導線は出しません。
                </p>
                {selected.preview_assets?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selected.preview_assets.slice(0, 3).map((asset) => (
                      <div key={asset.id} className="rounded-xl border border-white/[0.06] bg-[#0d1522] px-3 py-2 text-xs text-[#8d99ab]">{asset.title}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selected.has_access && (
              <div className="mt-6">
                <div className="mb-3 text-[9px] font-bold tracking-[.18em] text-[#68768b]">TRAIL TOOLS</div>
                {assetLoading && <div className="text-sm text-[#7f8ca0]">道具を準備中…</div>}
                {!assetLoading && assets.length === 0 && (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-sm text-[#7f8ca0]">
                    この山の教材はこれから追加されます。
                  </div>
                )}
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <a
                      key={asset.id}
                      href={asset.asset_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-[#ff8a1f]/25 hover:bg-white/[0.04]"
                    >
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ff8a1f]/[0.08] text-lg text-[#ffad62]">{assetIcon[asset.asset_type] || "•"}</div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-bold uppercase tracking-[.15em] text-[#68768b]">{asset.asset_type}</div>
                        <div className="mt-1 font-semibold">{asset.title}</div>
                        {asset.summary && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#7f8ca0]">{asset.summary}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
