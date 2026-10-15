'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const STORY_ID = 'ace-story-001-last-bell';
const STORAGE_KEY = 'ace_story_001_comments_local_v1';
const MAX_COMMENT_LENGTH = 1200;

type FirstImpression = 'quit' | 'noticed' | 'unsure';
type Drawer = 'race' | 'care';
type Investigation = 'ask' | 'records';
type StoryComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  firstImpression: FirstImpression;
  drawer: Drawer;
  investigation: Investigation;
};
const choices = {
  quit: '勝負をあきらめた',
  noticed: '何かに気づいた',
  unsure: 'まだ分からない',
  race: 'RACE：競走',
  care: 'CARE：気づかい',
  ask: 'ナギに話を聞いた',
  records: '大会記録を調べた',
};

function parseLocalComments(raw: string | null): StoryComment[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is StoryComment => {
      if (!entry || typeof entry !== 'object') return false;
      const item = entry as Partial<StoryComment>;
      return typeof item.id === 'string' &&
        typeof item.body === 'string' &&
        item.body.length <= MAX_COMMENT_LENGTH &&
        typeof item.createdAt === 'string' &&
        typeof item.updatedAt === 'string' &&
        !!item.firstImpression && !!item.drawer && !!item.investigation;
    }).slice(0, 100);
  } catch {
    return [];
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function OptionButton({
  onClick,
  selected,
  children,
}: {
  onClick: () => void;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        'min-h-12 w-full rounded-2xl border px-4 py-3 text-left text-sm leading-6 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d7c08d] ' +
        (selected
          ? 'border-[#d7c08d] bg-[#d7c08d]/15 text-[#f1e0b8]'
          : 'border-white/15 bg-white/[0.03] text-[#ddd8cc] hover:border-[#d7c08d]/50')
      }
    >
      {children}
    </button>
  );
}

export default function LastBellStoryQuest() {
  const [first, setFirst] = useState<FirstImpression | null>(null);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [comments, setComments] = useState<StoryComment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      setComments(parseLocalComments(window.localStorage.getItem(STORAGE_KEY)));
    } catch {
      setError('端末の保存領域を読み取れません。コメントは保存できない場合があります。');
    }
    setLoaded(true);
  }, []);

  const finished = first !== null && drawer !== null && investigation !== null;

  const persist = (updated: StoryComment[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setComments(updated);
      setError('');
      return true;
    } catch {
      setError('端末に保存できませんでした。空き容量やプライベートブラウズの設定を確認してください。');
      return false;
    }
  };

  const saveComment = () => {
    if (!finished || !first || !drawer || !investigation || !loaded) return;
    const body = draft.trim();
    if (!body || body.length > MAX_COMMENT_LENGTH) return;
    const now = new Date().toISOString();
    let updated: StoryComment[];
    if (editingId) {
      updated = comments.map((item) => item.id === editingId ? { ...item, body, updatedAt: now } : item);
    } else {
      updated = [{
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()),
        body, createdAt: now, updatedAt: now,
        firstImpression: first, drawer, investigation,
      }, ...comments].slice(0, 100);
    }
    if (persist(updated)) {
      setDraft('');
      setEditingId(null);
    }
  };

  const removeComment = (id: string) => {
    if (persist(comments.filter((item) => item.id !== id))) setDeletingId(null);
  };

  return (
    <main className="min-h-screen bg-[#090a08] px-4 pb-24 pt-7 text-[#e9e1d1] sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs text-[#c8ab72] underline-offset-4 hover:underline">← ACE Quest Boardへ</Link>
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a7bbac]">ACE / STORY QUEST 001</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold leading-snug sm:text-4xl">鳴らなかった、最後の鈴</h1>
        <p className="mt-3 text-xs leading-6 text-[#9da49d]">約5分・分岐型の物語。正解のある謎解きではありません。</p>

        <section aria-label="プロローグ" className="mt-7 rounded-3xl border border-[#c8ab72]/15 bg-white/[0.025] p-5 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d5bf8b]">01 / 最初の印象</p>
          <div className="mt-5 space-y-4 text-sm leading-8 text-[#d4d4c9]">
            <p>取り壊し前の、小さな町の体育館。</p>
            <p>壁には、去年のリレー大会の写真が飾られている。</p>
            <p>最終走者のナギは、誰よりも早くゴールに近づいた。しかし、ゴールテープのわずか手前で、突然足を止めた。</p>
            <p>4秒。</p>
            <p>そのままレースは終わり、記録帳には「棄権」と記された。</p>
            <p>写真の下に残された一言。「なぜ、走り切らなかった？」</p>
          </div>
          <p className="mt-6 text-sm font-semibold">あなたは、最初どう感じた？</p>
          <div className="mt-3 space-y-2">
            <OptionButton selected={first === 'quit'} onClick={() => { setFirst('quit'); setDrawer(null); setInvestigation(null); }}>勝負をあきらめたのかもしれない</OptionButton>
            <OptionButton selected={first === 'noticed'} onClick={() => { setFirst('noticed'); setDrawer(null); setInvestigation(null); }}>何かがおかしいと気づいたのかもしれない</OptionButton>
            <OptionButton selected={first === 'unsure'} onClick={() => { setFirst('unsure'); setDrawer(null); setInvestigation(null); }}>今の情報では分からない</OptionButton>
          </div>
        </section>

        {first && (
          <section aria-label="4文字の扉" className="mt-5 rounded-3xl border border-[#c8ab72]/15 bg-white/[0.025] p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d5bf8b]">02 / 4文字の扉</p>
            <p className="mt-4 text-sm leading-8">机には R・A・C・E と刻まれた木札と、青い糸が巻かれた小さな鈴。</p>
            <p className="mt-3 text-sm leading-8">「同じ4文字でも、並べ方で見えるものが変わる。」</p>
            <p className="mt-4 text-sm font-semibold">どちらの引き出しを開く？</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <OptionButton selected={drawer === 'race'} onClick={() => { setDrawer('race'); setInvestigation(null); }}>RACE — 競走を手がかりに</OptionButton>
              <OptionButton selected={drawer === 'care'} onClick={() => { setDrawer('care'); setInvestigation(null); }}>CARE — 気づかいを手がかりに</OptionButton>
            </div>
            {drawer && (
              <p className="mt-4 rounded-2xl bg-[#789581]/10 p-4 text-sm leading-8">
                {drawer === 'race'
                  ? '古いコース図には赤鉛筆で「右側のゴールテープが70cm手前」とある。ただし、誰が書いたのかは分からない。'
                  : '引き出しには鈴と同じ青い糸。「鈴を鳴らさないで、と頼まれた」という書き込み。頼んだ人の名はない。'}
              </p>
            )}
          </section>
        )}

        {drawer && (
          <section aria-label="調査" className="mt-5 rounded-3xl border border-[#c8ab72]/15 bg-white/[0.025] p-5 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d5bf8b]">03 / 何を確かめる？</p>
            <p className="mt-4 text-sm leading-8">残された時間で確かめられるのは、一つだけ。</p>
            <div className="mt-3 space-y-2">
              <OptionButton selected={investigation === 'ask'} onClick={() => setInvestigation('ask')}>ナギ本人に話を聞く</OptionButton>
              <OptionButton selected={investigation === 'records'} onClick={() => setInvestigation('records')}>大会記録を調べる</OptionButton>
            </div>
            {investigation && (
              <p className="mt-4 rounded-2xl bg-[#789581]/10 p-4 text-sm leading-8">
                {investigation === 'ask'
                  ? 'ナギは答えた。「走り切れば勝っていたかもしれない。でも足元の線が二つに見えたんだ。あの4秒が正しかったか、今でも分からない。」'
                  : '大会記録には「強風によるゴールテープ位置ずれを確認。全員のタイムは参考記録とする。再レースは参加者の協議により見送り」とある。'}
              </p>
            )}
          </section>
        )}

        {finished && (
          <>
            <section aria-label="エピローグ" className="mt-5 rounded-3xl border border-[#c8ab72]/15 bg-white/[0.025] p-5 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d5bf8b]">04 / 写真の裏側</p>
              <div className="mt-4 space-y-4 text-sm leading-8">
                <p>古い額縁の裏から一枚の写真が落ちた。ナギと競走相手のハルが、二人でゴールテープを張り直している姿。</p>
                <p>写真の裏には「鈴は、同じ条件で走れた時に鳴らす。」とある。</p>
                <p>誰が書いた言葉なのか。なぜ青い糸で鈴を鳴らないようにしたのか。その答えは残っていない。</p>
                <p>記録帳の「棄権」には二重線が引かれ、「測定不能」と書き直されていた。</p>
                <p>勝利を手放したのか。競走を守ったのか。あるいは、まだ別の理由があったのか。</p>
                <p>鈴は、最後まで鳴らなかった。</p>
              </div>
            </section>

            <section aria-label="コメント" id="comments" className="mt-7 rounded-3xl border border-[#c8ab72]/25 bg-[#c8ab72]/[0.04] p-5 sm:p-7">
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#d5bf8b]">あなたの解釈</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold">あなたには、どう見えた？</h2>
              <p className="mt-3 text-sm leading-7 text-[#b9b8ad]">登場人物の真意を決めつけなくても大丈夫。途中で変わったこと、疑問、別の結末など、自由に残せます。</p>
              <div className="mt-5 rounded-xl border border-[#c8ab72]/15 p-3 text-xs leading-6 text-[#b7b7a9]">
                この試作は<strong className="text-[#e9d8aa]">この端末のブラウザだけに保存</strong>します。他の参加者には見えず、外部には送信しません。共有コメント機能は未実装です。
              </div>
              <label htmlFor="story-comment" className="mt-5 block text-sm font-semibold">{editingId ? 'コメントを編集' : 'コメントを書く'}</label>
              <textarea
                id="story-comment"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
                rows={5}
                placeholder="あの4秒は、あなたにはどんな時間に見えましたか？"
                className="mt-2 w-full resize-y rounded-2xl border border-white/20 bg-[#080a09] p-4 text-sm leading-7 text-[#f1ead7] outline-none focus:border-[#d7c08d]"
              />
              <p className="mt-1 text-right text-[11px] text-[#959c94]">{draft.length} / {MAX_COMMENT_LENGTH}</p>
              {error && <p role="alert" className="mt-2 text-xs text-red-300">{error}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveComment}
                  disabled={!loaded || !draft.trim() || draft.trim().length > MAX_COMMENT_LENGTH}
                  className="min-h-12 rounded-xl bg-[#d7c08d] px-5 text-sm font-semibold text-[#15160f] disabled:cursor-not-allowed disabled:opacity-40"
                >{editingId ? '編集を保存' : 'この端末にコメントを残す'}</button>
                {editingId && (
                  <button type="button" className="min-h-12 rounded-xl border border-white/20 px-4 text-sm" onClick={() => { setDraft(''); setEditingId(null); }}>
                    編集をやめる
                  </button>
                )}
              </div>

              <div aria-live="polite" className="mt-8">
                <h3 className="font-serif text-lg font-semibold">この端末に残したコメント {loaded ? '(' + comments.length + ')' : ''}</h3>
                {loaded && comments.length === 0 && (
                  <p className="mt-3 text-sm leading-7 text-[#a9b0a7]">まだ記録はありません。あなたの読みを最初の一つに。</p>
                )}
                <div className="mt-3 space-y-3">
                  {comments.map((comment) => (
                    <article key={comment.id} className="rounded-2xl border border-white/10 bg-[#090a08] p-4">
                      <p className="text-[11px] text-[#9ca49a]">{formatDate(comment.createdAt)} {comment.createdAt !== comment.updatedAt ? '・編集済み' : ''}</p>
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-[#e9e1d1]">{comment.body}</p>
                      <p className="mt-3 text-[11px] leading-6 text-[#a1a99f]">
                        選んだ道：{choices[comment.firstImpression]} → {choices[comment.drawer]} → {choices[comment.investigation]}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#d5c398]">
                        <button type="button" className="min-h-11 underline-offset-4 hover:underline" onClick={() => {
                          setDraft(comment.body);
                          setEditingId(comment.id);
                          setDeletingId(null);
                          document.getElementById('story-comment')?.focus();
                        }}>編集</button>
                        {deletingId === comment.id ? (
                          <>
                            <button type="button" className="min-h-11 text-red-300 underline-offset-4 hover:underline" onClick={() => removeComment(comment.id)}>削除を確定</button>
                            <button type="button" className="min-h-11 underline-offset-4 hover:underline" onClick={() => setDeletingId(null)}>キャンセル</button>
                          </>
                        ) : (
                          <button type="button" className="min-h-11 underline-offset-4 hover:underline" onClick={() => setDeletingId(comment.id)}>削除</button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
            <p className="mt-6 text-xs leading-7 text-[#9da49d]">教育上の問い：新しい手がかりに触れたあと、自分の最初の読みを、自分の意思で見直したり保留したりできるだろうか。</p>
            <button type="button" onClick={() => { setFirst(null); setDrawer(null); setInvestigation(null); setDraft(''); setEditingId(null); }} className="mt-6 min-h-12 rounded-xl border border-[#c8ab72]/30 px-5 text-sm text-[#d6c293]">
              別の道で読み直す
            </button>
          </>
        )}
        <p className="mt-10 text-center text-[10px] text-[#858d83]">Story ID: {STORY_ID} · Prototype / Local comments only</p>
      </div>
    </main>
  );
}
