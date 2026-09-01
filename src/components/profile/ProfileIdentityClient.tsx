'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  beginGoogleLogin,
  getAccessToken,
  getCurrentIdentity,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '@/lib/auth/supabaseAuth';

type ProfileRow = {
  nickname: string | null;
  professional_name: string | null;
  teacher_name_public: boolean;
};

export default function ProfileIdentityClient() {
  const [loading, setLoading] = useState(true);
  const [loginRequired, setLoginRequired] = useState(false);
  const [nickname, setNickname] = useState('');
  const [professionalName, setProfessionalName] = useState('');
  const [teacherNamePublic, setTeacherNamePublic] = useState(false);
  const [role, setRole] = useState<string>('flower');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          if (alive) setLoginRequired(true);
          return;
        }
        const identity = await getCurrentIdentity();
        if (!identity) {
          if (alive) setLoginRequired(true);
          return;
        }
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?select=nickname,professional_name,teacher_name_public&id=eq.${encodeURIComponent(identity.user.id)}`,
          {
            headers: {
              apikey: SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/json',
            },
            cache: 'no-store',
          },
        );
        if (!response.ok) throw new Error(`profile_fetch_${response.status}`);
        const rows = (await response.json()) as ProfileRow[];
        const profile = rows[0];
        if (!alive) return;
        setNickname(profile?.nickname ?? '');
        setProfessionalName(profile?.professional_name ?? '');
        setTeacherNamePublic(Boolean(profile?.teacher_name_public));
        setRole(identity.role);
        setEmail(identity.user.email ?? '');
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'プロフィールを読み込めませんでした');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function saveProfile() {
    setSaved(false);
    setError('');
    const cleanNickname = nickname.trim();
    const cleanProfessionalName = professionalName.trim();
    if (!cleanNickname) {
      setError('ニックネームを入力してください。');
      return;
    }
    if (cleanNickname.length > 40 || cleanProfessionalName.length > 80) {
      setError('名前が長すぎます。');
      return;
    }
    if (teacherNamePublic && !cleanProfessionalName) {
      setError('先生として公開する名前を入力してください。');
      return;
    }

    setSaving(true);
    try {
      const accessToken = await getAccessToken();
      const identity = await getCurrentIdentity();
      if (!accessToken || !identity) throw new Error('login_required');
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(identity.user.id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            nickname: cleanNickname,
            display_name: cleanNickname,
            professional_name: cleanProfessionalName || null,
            teacher_name_public: teacherNamePublic,
            updated_at: new Date().toISOString(),
          }),
        },
      );
      if (!response.ok) throw new Error(`profile_save_${response.status}`);
      setNickname(cleanNickname);
      setProfessionalName(cleanProfessionalName);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080d16] px-4 pb-24 pt-7 text-[#edf2f8]">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold tracking-[.22em] text-[#ff9a42]">IDENTITY</p>
            <h1 className="mt-1 font-serif text-3xl font-semibold">ACEでの名前</h1>
          </div>
          <Link href="/knowledge/today" className="rounded-xl border border-white/10 px-3 py-2 text-xs text-[#9aa7ba]">戻る</Link>
        </div>

        {loading && <div className="mt-7 rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-[#8895a9]">読み込み中…</div>}

        {!loading && loginRequired && (
          <section className="mt-7 rounded-3xl border border-[#ff8a1f]/25 bg-[#ff8a1f]/[0.04] p-6">
            <h2 className="font-serif text-xl font-semibold">ログインが必要です</h2>
            <button type="button" onClick={() => beginGoogleLogin('/profile')} className="mt-5 rounded-xl bg-[#ff8a1f] px-5 py-3 text-sm font-bold text-[#07152e]">Googleでログイン</button>
          </section>
        )}

        {!loading && !loginRequired && (
          <div className="mt-7 space-y-4">
            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[10px] font-bold tracking-[.18em] text-[#ff9a42]">普段の表示名</p>
              <label className="mt-4 block text-sm font-semibold">ニックネーム</label>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={40}
                placeholder="例：MASA、まさ、はな"
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#0d1320] px-4 text-sm outline-none focus:border-[#ff8a1f]/50"
              />
              <p className="mt-2 text-xs leading-6 text-[#79869a]">Today、Quest、コミュニティなど通常のACE画面ではこの名前を使います。Googleアカウント名は自動表示しません。</p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[10px] font-bold tracking-[.18em] text-[#ff9a42]">先生・コーチとしての表示</p>
              <label className="mt-4 block text-sm font-semibold">公開する先生名</label>
              <input
                value={professionalName}
                onChange={(event) => setProfessionalName(event.target.value)}
                maxLength={80}
                placeholder="例：山田 昌寛"
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#0d1320] px-4 text-sm outline-none focus:border-[#ff8a1f]/50"
              />
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                <input type="checkbox" checked={teacherNamePublic} onChange={(event) => setTeacherNamePublic(event.target.checked)} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold">先生・コーチ画面ではこの名前を公開する</span>
                  <span className="mt-1 block text-xs leading-6 text-[#79869a]">役割が付いても本名を勝手に公開しません。本人がここで明示的にONにした場合だけ使います。</span>
                </span>
              </label>
              <p className="mt-3 text-[11px] text-[#66748a]">現在のACE role: {role}</p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-5">
              <p className="text-[10px] font-bold tracking-[.18em] text-[#7f8ca0]">運営確認用</p>
              <p className="mt-3 text-sm leading-7 text-[#9aa7ba]">ログイン情報・運営確認用の本名は、公開表示名とは別に扱います。決済、契約、先生登録など必要な場面でのみ確認し、ACE上へ自動公開しません。</p>
              {email && <p className="mt-3 text-xs text-[#66748a]">Login: {email}</p>}
            </section>

            {error && <div className="rounded-2xl border border-red-300/15 bg-red-300/[0.04] p-4 text-sm text-red-200">{error}</div>}
            {saved && <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4 text-sm text-emerald-200">保存しました。次回表示からニックネームが使われます。</div>}

            <button type="button" disabled={saving} onClick={saveProfile} className="h-12 w-full rounded-xl bg-[#ff8a1f] text-sm font-bold text-[#07152e] disabled:opacity-50">
              {saving ? '保存中…' : '保存する'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
