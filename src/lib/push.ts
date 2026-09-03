import { PwaBootstrap, SUPABASE_URL, sessionIsUsable } from '@/lib/pwa';

export const VAPID_PUBLIC_KEY = 'BIpQyRl-rUcmW1L5V2max90V37uFcxCrKvTWWFlCml0bW4j9gF2B496Uu61V6wvq6ZgxbGpcBt04fg8sMVYXae8';

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export async function getCurrentPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function enablePush(data: PwaBootstrap) {
  if (!pushSupported()) throw new Error('push_not_supported');
  if (!sessionIsUsable(data)) throw new Error('session_expired');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(permission === 'denied' ? 'permission_denied' : 'permission_not_granted');

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const serialized = subscription.toJSON();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/pwa-push-subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: data.session_token,
      subscription: serialized,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.ok !== true) throw new Error(result?.error ?? `http_${response.status}`);

  return subscription;
}
