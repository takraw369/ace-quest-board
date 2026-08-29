'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

type LiffApi = {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(config?: { redirectUri?: string }): void;
  getIDToken(): string | null;
  isInClient(): boolean;
  requestFriendship?: () => Promise<unknown>;
};

type RuntimeConfig = {
  liffId?: string;
  supabaseUrl?: string;
};

declare global {
  interface Window {
    liff?: LiffApi;
  }
}

const DEFAULT_SUPABASE_URL = 'https://qydbtholbwbuwiswmqsr.supabase.co';
const STORAGE_KEY = 'flow:pwa:bootstrap:v1';
const ALLOWED_NEXT = new Set(['/today', '/learn', '/quest', '/me', '/people', '/calibration']);

async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch('/app-config.json', { cache: 'no-store' });
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

export default function LineConnectClient() {
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState('LINEとの接続を準備しています…');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    if (!sdkReady) return;
    let cancelled = false;

    const bootstrap = async () => {
      const runtime = await loadRuntimeConfig();
      const liffId = runtime.liffId || process.env.NEXT_PUBLIC_LIFF_ID || '';
      const supabaseUrl = runtime.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
      const requestedNext = new URLSearchParams(window.location.search).get('next') || '/today';
      const next = ALLOWED_NEXT.has(requestedNext) ? requestedNext : '/today';

      if (!liffId) {
        setStatus('LIFFの設定待ちです。');
        setErrorCode('liff_not_configured');
        return;
      }

      const liff = window.liff;
      if (!liff) {
        setStatus('LIFF SDKを読み込めませんでした。');
        setErrorCode('liff_sdk_unavailable');
        return;
      }

      try {
        setStatus('LINE本人確認中…');
        await liff.init({ liffId });
        if (cancelled) return;

        if (!liff.isLoggedIn()) {
          if (!liff.isInClient()) {
            liff.login({ redirectUri: window.location.href });
            return;
          }
          throw new Error('line_login_required');
        }

        const idToken = liff.getIDToken();
        if (!idToken) throw new Error('id_token_unavailable');

        setStatus('FLOW OSのデータと接続しています…');
        const response = await fetch(`${supabaseUrl}/functions/v1/line-pwa-bootstrap`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_token: idToken }),
        });
        const payload = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (!response.ok) {
          setErrorCode(payload?.error ?? `http_${response.status}`);
          if (payload?.error === 'line_contact_not_found') {
            setStatus('このLINEはまだFLOW OSの友だち情報と紐付いていません。');
          } else if (payload?.error === 'line_login_not_configured') {
            setStatus('サーバー側のLINE Login設定待ちです。');
          } else {
            setStatus('本人確認に失敗しました。LINEからもう一度開いてください。');
          }
          return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, cached_at: new Date().toISOString() }));
        setStatus('接続できました。FLOW OSを開きます…');
        window.location.replace(next);
      } catch (error) {
        if (cancelled) return;
        const code = error instanceof Error ? error.message : 'connection_failed';
        setErrorCode(code);
        setStatus('接続できませんでした。LINEからもう一度開いてください。');
      }
    };

    void bootstrap();
    return () => { cancelled = true; };
  }, [sdkReady]);

  const requestFriendship = async () => {
    try {
      if (!window.liff?.requestFriendship) return;
      await window.liff.requestFriendship();
      window.location.reload();
    } catch {
      setStatus('友だち追加画面を開けませんでした。公式アカウントへ戻って追加してください。');
    }
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-5 py-12 text-[#e9e1d1]">
      <Script
        src="https://static.line-scdn.net/liff/edge/2/sdk.js"
        strategy="afterInteractive"
        onReady={() => setSdkReady(true)}
      />

      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#789581]">FLOW OS</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold">LINEとあなたの学びをつなぐ</h1>
        <p className="mt-5 text-sm leading-7 text-[#9aa097]">{status}</p>

        <div className="mt-8 rounded-3xl border border-[#c8ab72]/15 bg-white/[0.025] p-5">
          <p className="text-sm leading-7 text-[#b6b8b1]">
            LINEは入口と再来訪、FLOW OSはEducation・Quest・振り返りの場所として使います。
          </p>
          {errorCode && (
            <p className="mt-4 break-all font-mono text-[11px] text-[#6f756f]">status: {errorCode}</p>
          )}
        </div>

        {errorCode === 'line_contact_not_found' && (
          <button
            type="button"
            onClick={() => void requestFriendship()}
            className="mt-5 rounded-full bg-[#d9c18d] px-5 py-3 text-sm font-semibold text-[#171813]"
          >
            公式アカウントを友だち追加
          </button>
        )}
      </section>
    </main>
  );
}
