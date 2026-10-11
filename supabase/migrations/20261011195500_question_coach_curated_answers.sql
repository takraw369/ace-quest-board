-- Question Coach: curated answers, no LLM requirement.
-- Human-approved data may be published; data API readers cannot write to this library.
create table if not exists public.question_coach_answers (
  id uuid primary key default gen_random_uuid(),
  question_key text not null unique,
  question_text text not null,
  aliases text[] not null default '{}'::text[],
  answer text not null,
  upgraded_question text not null default '',
  why_better text not null default '',
  lens text not null default 'META',
  deepeners text[] not null default '{}'::text[],
  keywords text[] not null default '{}'::text[],
  category text not null default 'general',
  status text not null default 'draft' check(status in ('draft','published','archived')),
  source_ref text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint coach_answer_nonempty check (length(trim(answer)) >= 10)
);
create index if not exists question_coach_answers_status_idx on public.question_coach_answers(status);
alter table public.question_coach_answers enable row level security;
revoke all on table public.question_coach_answers from anon, authenticated;
grant select on table public.question_coach_answers to authenticated;
drop policy if exists "Read published Question Coach answers" on public.question_coach_answers;
create policy "Read published Question Coach answers" on public.question_coach_answers
  for select to authenticated using (status = 'published');
-- No insert/update/delete policies for anon or authenticated. Managed curator/migrations only.

insert into public.question_coach_answers
(question_key,question_text,aliases,answer,upgraded_question,why_better,lens,deepeners,keywords,category,status,source_ref)
values
('thinking-daily-questions',
 '思考力を鍛えるには、どんな問いを習慣化すればいい？',
 array['思考力を鍛えるには、どんな問いを習慣化すればいい？','思考力を鍛えるにはどんな問いを習慣化すればいい','思考力を高めるには？'],
 E'思考の練習として、答えを急がず次の5つの問いを試してみてください。\n\n1. 定義：「ここで使う言葉は具体的に何を意味する？」\n2. 根拠：「確認できた事実と、私の推測はどれ？」\n3. 反対：「逆の説明が正しいとしたら、何が見える？」\n4. 構造：「何が原因で、何が結果で、何が環境の影響？」\n5. 行動：「小さく確かめるには、何を一つ試す？」\n\n最初は1日1件で十分。同じ出来事に違う問いを当て、結論がどう変わったかを短くメモしましょう。',
 '今日ひとつ判断する事柄に対して、どんな前提・根拠・反証を確認すればよい？',
 '漠然とした能力向上の話を、今日の判断と観察できる行動に変えられるため。',
 'ASSUMPTION',
 array['いま当然だと思っている前提は何？','別の立場の人なら、どんな説明をする？','明日までに確かめられる小さな実験は？'],
 array['思考力','問い','習慣化'],'thinking','published','internal:question-coach-foundations'),
('question-vs-answer',
 'いい質問をするにはどうしたらいい？',
 array['良い質問の作り方','いい質問をするにはどうしたらいい？','質問を上手くする方法は？'],
 E'質問は、何を決めたいかで変わります。まず「目的」「対象」「条件」「判断の基準」を1行ずつ書いてみましょう。\n\n例：「副業は何がいい？」より、「週5時間、初期費用1万円以内で、自分の経験を活かして最初の顧客を得るには？」の方が、選択肢を比較しやすくなります。\n\n答えを聞いた後は「反対例は？」「次に何を確かめる？」と問い直すと、理解から行動につなげやすくなります。',
 'この質問で、最終的に何を判断・実行したいのか？',
 '目的と制約が明確になり、答えを行動可能な判断材料に変えやすくなるため。',
 'DEFINITION',
 array['どの前提が間違っていると結論が変わる？','選択肢を比べる基準は何？'],
 array['質問','良い質問'],'thinking','published','internal:question-coach-foundations'),
('evidence-or-opinion',
 '事実と意見をどう区別する？',
 array['事実と意見をどう区別する？','事実と解釈の違いは？','事実と仮説を分けたい'],
 E'最初に文を3つへ分解します。\n\n・事実：いつ・どこで・何が起きたか、記録などで確認できること。\n・解釈：その事実に自分が付けた意味や説明。\n・仮説：まだ確かめていない可能性。\n\n例：「返信が2日ない」は確認可能な事実。「嫌われている」は解釈や仮説です。結論を急がず、根拠と別の説明を考えましょう。',
 'その結論のうち、第三者が検証できる部分はどれ？',
 '確認できる事実と推測の境界を見える形にするため。',
 'EVIDENCE',
 array['根拠は一次資料で確かめられる？','別の説明は成り立つ？'],
 array['事実','解釈','根拠'],'thinking','published','internal:question-coach-foundations'),
('habit-implementation',
 '習慣を続けるにはどうすればいい？',
 array['習慣を続けるにはどうすればいい？','三日坊主を減らしたい','習慣化のコツは？'],
 E'続けたい行動を小さくして、「いつ・どこで・何をするか」を決めます。\n\n例：「勉強を頑張る」ではなく、「朝食後に机でテキストを2分だけ開く」。実行した日は印を付け、できなかった日は意志の弱さではなく、時間・環境・難度のどれが障害だったかを見直します。\n\n最初の目標は長時間ではなく、再開しやすい仕組みを作ることです。',
 'いまの生活のどの場面に、2分でできる行動を組み込める？',
 '抽象的な目標を、条件が明確な小さな行動へ変えるため。',
 'ACTION',
 array['一番起きやすい妨害は何？','失敗した翌日に再開する合図は何？'],
 array['習慣','続ける'],'habits','published','internal:question-coach-foundations'),
('better-decisions',
 '大事な決断をするとき、何を考えるべき？',
 array['大事な決断をするとき、何を考えるべき？','意思決定の方法は？','選択で迷ったときは？'],
 E'まず決断の目的、期限、取り返しのつく範囲を書き出しましょう。候補ごとに「メリット・デメリット・確認不足の情報・最悪の時の対処」を並べます。\n\n一つの結論を絶対視せず、何が分かれば意見が変わるかを決めておくと、後で検証しやすくなります。大きな決断なら、自分以外の視点も取り入れましょう。',
 'この選択で守りたい価値は何で、何を犠牲にできる？',
 '価値観とトレードオフがはっきりして、他人の正解に流されにくくなるため。',
 'TRADEOFF',
 array['取り返しがつかないリスクは何？','判断を変える新情報は何？'],
 array['決断','判断','選択'],'decision','published','internal:question-coach-foundations')
on conflict (question_key) do nothing;