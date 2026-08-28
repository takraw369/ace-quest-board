import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = 'https://qydbtholbwbuwiswmqsr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_mv8O-7lEXnuubYLVzXIJnA_A1irQJB9';

type Entry = {
  id: string;
  category: string;
  pain_text: string;
  hidden_want?: string | null;
  root_structure?: string | null;
  metaphor_id?: string | null;
  metaphor_name?: string | null;
  reframe?: string | null;
  first_action?: string | null;
  cta_id?: string | null;
  cta_name?: string | null;
  cta_level?: string | null;
  cta_route?: string | null;
  faq_question?: string | null;
  priority?: string | null;
  tags?: string[] | null;
  aliases?: string[] | null;
};

const priorityWeight: Record<string, number> = { A: 3, B: 2, C: 1 };

function score(entry: Entry, raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return priorityWeight[entry.priority || ''] || 0;
  let total = 0;
  if (entry.pain_text.toLowerCase().includes(q)) total += 12;
  if ((entry.faq_question || '').toLowerCase().includes(q)) total += 8;
  if ((entry.tags || []).some((tag) => tag.toLowerCase().includes(q))) total += 6;
  if ((entry.aliases || []).some((alias) => alias.toLowerCase().includes(q))) total += 6;
  if ((entry.hidden_want || '').toLowerCase().includes(q)) total += 5;
  if ((entry.reframe || '').toLowerCase().includes(q)) total += 4;
  if ((entry.root_structure || '').toLowerCase().includes(q)) total += 3;
  if ((entry.metaphor_name || '').toLowerCase().includes(q)) total += 2;
  if (entry.category.toLowerCase().includes(q)) total += 2;
  return total + (priorityWeight[entry.priority || ''] || 0);
}

function contains(entry: Entry, raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  return [
    entry.pain_text,
    entry.category,
    entry.hidden_want,
    entry.root_structure,
    entry.metaphor_name,
    entry.reframe,
    entry.first_action,
    entry.faq_question,
    ...(entry.tags || []),
    ...(entry.aliases || []),
  ].filter(Boolean).join(' ').toLowerCase().includes(q);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const requestedLimit = Number(searchParams.get('limit') || '3');
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 20) : 3;

  const select = [
    'id', 'category', 'pain_text', 'hidden_want', 'root_structure',
    'metaphor_id', 'metaphor_name', 'reframe', 'first_action',
    'cta_id', 'cta_name', 'cta_level', 'cta_route', 'faq_question',
    'priority', 'tags', 'aliases',
  ].join(',');

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/ace_dictionary_entries?select=${select}&published=eq.true`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: 'dictionary_unavailable' }, { status: 502 });
  }

  const entries = await response.json() as Entry[];
  const filtered = entries
    .filter((entry) => !category || entry.category === category)
    .filter((entry) => contains(entry, q))
    .sort((a, b) => score(b, q) - score(a, q) || a.id.localeCompare(b.id))
    .slice(0, limit);

  return NextResponse.json({
    query: q,
    category: category || null,
    count: filtered.length,
    retrieval_rule: 'Return multiple plausible candidates; do not infer a single root cause without user confirmation.',
    items: filtered,
  });
}
