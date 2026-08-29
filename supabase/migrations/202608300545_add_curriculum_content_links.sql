create table if not exists public.curriculum_content_links (
  id uuid primary key default gen_random_uuid(),
  node_id text not null,
  asset_id text not null,
  content_kind text not null default 'article' check (content_kind in ('article','video','audio','guide')),
  display_title text not null,
  why_text text,
  public_summary text,
  public_body text,
  public_url text,
  access_tier text not null default 'free' check (access_tier in ('free','member','paid')),
  offer_slug text,
  display_order integer not null default 100,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(node_id, asset_id)
);

alter table public.curriculum_content_links enable row level security;
create index if not exists curriculum_content_links_node_status_order_idx
  on public.curriculum_content_links(node_id, status, display_order);

insert into public.curriculum_content_links
(node_id,asset_id,content_kind,display_title,why_text,public_summary,public_body,access_tier,offer_slug,display_order,metadata)
values
('N002','C025','article','呼吸は最初のFLOWスイッチ','片足立ちで見えた「身体条件で出力が変わる」を、呼吸から理解する。','同じ能力でも、呼吸・姿勢・疲労などの身体条件で出力は変わる。','身体は「意思」の前に出力条件を作っている。呼吸が浅い、姿勢が崩れる、疲労が強い。こうした条件が変われば、同じ人・同じ能力でも結果は変わる。Questの結果を能力判定にせず、「今日はどんな条件だったか」を一つだけ観察する。次に同じ課題を行う時は、呼吸や姿勢を一つ変えて前後差を取ると、自分のFLOW条件が見え始める。','free','winning_os_90',10,'{"source_asset":"FLOW KNOWLEDGE"}'::jsonb),
('N002','C004','article','バランスは「筋力」だけではない','目を閉じた瞬間に崩れた体験を、感覚入力と脳の統合という視点で見る。','バランスは視覚・前庭感覚・体性感覚など複数の情報を統合して作られる。','目を開けている時と閉じた時で結果が変わるなら、「バランス能力がある／ない」だけでは説明しきれない。人は複数の感覚情報を使って姿勢を調整している。どの情報に依存していたか、疲労や緊張で何が変わったかを見ると、結果を自分の能力そのものと誤認しにくくなる。重要なのは一回の記録ではなく、条件を変えながら再現性を探すこと。','free','winning_os_90',20,'{"source_asset":"sports neuroscience"}'::jsonb),
('N002','C002','article','本番の出力は「条件設計」で変えられる','身体の実験を、競技や本番でのパフォーマンス設計につなげる。','本番で出力を安定させるには、気合いより再現可能な条件と復帰手順を持つ。','練習ではできるのに本番では出ない時、原因を「メンタルが弱い」で終えると改善が難しい。身体条件、注意、感情反応、行動手順を分けて観察すると、再現可能な勝ち筋が作れる。Questで取った小さなデータは、その勝ち筋を作る材料になる。崩れた時に何を戻すかまで決めておくと、本番中の修正速度も上げられる。','free','winning_os_90',30,'{"source_asset":"world warrior mind"}'::jsonb),
('N003','C008','article','予測は「見るもの」を変える','予想と実測のズレを、注意と情報選択の視点から深める。','人はすべての情報を同じように見ているわけではなく、予測や関心によって拾う情報が変わる。','「こうなるはず」と思っていると、その予測に合う情報ばかりを拾いやすい。だからQuestでは、先に予測を書き、あとで実測と比べる。ズレは失敗ではなく、自分が何を見落としていたかを教えるデータになる。予測→実測→更新を繰り返すほど、自分の判断モデルは現実に近づいていく。','free','winning_os_90',10,'{"source_asset":"RAS/scotoma"}'::jsonb),
('N003','C006','article','予測誤差は学習の入口','当たったか外れたかではなく、ズレを次の行動設計に使う。','学習は「正解を知る」より、自分の予測モデルを更新する時に深まる。','予測と結果が違った時、すぐに自分を評価する必要はない。「何を前提に予測したか」「実際には何が違ったか」を分ける。次の実験では条件を一つだけ変える。この小さな更新の反復が、知識を自分の使える型に変えていく。','free','winning_os_90',20,'{"source_asset":"coaching"}'::jsonb),
('N003','C007','article','習慣は意思より「次の条件」で作る','予測データを、習慣やIf-Thenの設計へつなげる。','行動が続くかは意志の強さだけでなく、いつ・どこで・何をきっかけに始めるかで変わる。','Questで「思ったより始めにくかった」「予想より早く終わった」が分かったら、その情報を次の条件設計に使う。たとえば「朝食後に3分だけ」「机に座ったら最初の1手だけ」と入口を固定する。予測誤差は、自分に合う習慣条件を見つける材料になる。','free','winning_os_90',30,'{"source_asset":"habit system"}'::jsonb),
('N001','C006','article','事実・解釈・感情を分ける','体験を混ぜずに観察すると、次の選択肢が増える。','起きた事実と、自分の解釈・感情・身体反応は別のレイヤーとして扱える。','「失敗した」「嫌われた」「自分は弱い」は、事実そのものではなく解釈が混ざっていることがある。何が起きたか、どう意味づけたか、何を感じたか、身体がどう反応したかを分けると、変えられる場所が見つかる。分離は感情を消すためではなく、反応に飲み込まれず次を選ぶために使う。','free','winning_os_90',10,'{"source_asset":"coaching"}'::jsonb),
('N001','C008','article','スコトーマは「見えていない前提」に出る','解釈を事実だと思った瞬間に、別の可能性が見えにくくなる。','注意は限られているため、自分の前提に合わない情報は抜けやすい。','強い解釈を持つほど、それと矛盾する情報は見落としやすい。だから事実と解釈を分け、「別の説明はあるか？」を一度置く。これはポジティブ思考ではなく、情報探索の幅を戻す作業。見え方が増えるほど、選べる行動も増える。','free','winning_os_90',20,'{"source_asset":"RAS/scotoma"}'::jsonb),
('N001','C021','article','闇を材料に変える','強い感情や崩れた体験を、自分の型を作る材料として扱う。','嫌な体験を無理に肯定せず、そこから使える情報だけを回収する。','感情が強い体験ほど、記憶にも判断にも影響しやすい。だから「良い経験にしよう」と急がず、まず事実・解釈・感情・身体反応を分ける。その上で「次に同じ状況が来たら何を変えるか」を一つ決める。体験は消せなくても、次の行動設計へ変換できる。','free','winning_os_90',30,'{"source_asset":"core philosophy"}'::jsonb)
on conflict (node_id,asset_id) do update set
  content_kind=excluded.content_kind,
  display_title=excluded.display_title,
  why_text=excluded.why_text,
  public_summary=excluded.public_summary,
  public_body=excluded.public_body,
  access_tier=excluded.access_tier,
  offer_slug=excluded.offer_slug,
  display_order=excluded.display_order,
  metadata=excluded.metadata,
  updated_at=now();
