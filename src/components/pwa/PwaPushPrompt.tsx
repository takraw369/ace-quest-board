'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { enablePush, getCurrentPushSubscription, pushSupported } from '@/lib/push';
import { loadBootstrap, sessionIsUsable } from '@/lib/pwa';

type Mode = 'hidden' | 'install' | 'ready' | 'busy' | 'success' | 'error';

const DISMISS_KEY = 'flow:pwa:push-prompt-dismissed:v1';

function isIos() {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

export default function PwaPushPrompt() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>('hidden');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (pathname !== '/today') {
      setMode('hidden');
      return;
    }
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    if (!pushSupported()) return;
    if (Notification.permission === 'denied') return;

    let cancelled = false;
    (async () => {
      try {
        const existing = await getCurrentPushSubscription();
        if (cancelled || existing) return;
        if (isIos() && !isStandalone()) setMode('install');
        else setMode('ready');
      } catch {
        if (!cancelled) setMode('hidden');
      }
    })();

    return () => { cancelled = true; };
  }, [pathname]);

  if (mode === 'hidden') return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setMode('hidden');
  };

  const activate = async () => {
    const data = loadBootstrap();
    if (!data || !sessionIsUsable(data)) {
      setMessage('ACEとの接続期限が切れています。LINEからもう一度ACEを開いてください。');
      setMode('error');
      return;
    }

    setMode('busy');
    try {
      await enablePush(data);
      setMode('success');
      window.setTimeout(() => setMode('hidden'), 1800);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      if (reason === 'permission_denied') {
        setMessage('通知がOFFになっています。端末の通知設定からACEの通知をONにできます。');
      } else {
        setMessage('通知の設定に失敗しました。少ししてからもう一度試してください。');
      }
      setMode('error');
    }
  };

  return (
    <aside className="fixed inset-x-4 bottom-24 z-[70] mx-auto max-w-md rounded-[24px] border border-[#c8ab72]/20 bg-[#11130f]/95 p-4 text-[#e9e1d1] shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl">
      <button
        type="button"
        onClick={dismiss}
        aria-label="閉じる"
        className="absolute right-3 top-3 rounded-full px-2 py-1 text-xs text-[#737a73]"
      >
        ×
      </button>

      {mode === 'install' && (
        <>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">ACE APP</p>
          <h2 className="mt-2 font-serif text-lg font-semibold">ACEをホーム画面へ</h2>
          <p className="mt-2 pr-6 text-xs leading-6 text-[#9ca097]">
            iPhoneは「共有」→「ホーム画面に追加」でACEアプリとして使えます。追加後に通知をONにできます。
          </p>
        </>
      )}

      {mode === 'ready' && (
        <>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#789581]">ACE PUSH</p>
          <h2 className="mt-2 font-serif text-lg font-semibold">今日のQuestを、見逃さない。</h2>
          <p className="mt-2 pr-6 text-xs leading-6 text-[#9ca097]">Quest・連続達成・MASAからのフィードバックをACEから直接届けます。</p>
          <button
            type="button"
            onClick={activate}
            className="mt-4 rounded-full bg-[#d9c18d] px-4 py-2.5 text-xs font-semibold text-[#171813]"
          >
            通知をONにする
          </button>
        </>
      )}

      {mode === 'busy' && <p className="text-sm text-[#c8c2b6]">通知を設定しています…</p>}
      {mode === 'success' && <p className="text-sm font-semibold text-[#d9c18d]">通知をONにしました ✓</p>}
      {mode === 'error' && <p className="pr-6 text-xs leading-6 text-[#c8c2b6]">{message}</p>}
    </aside>
  );
}
