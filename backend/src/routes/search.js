import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { maskProviders } from '../lib/mask.js';
import { resolveCommunityIds } from '../lib/scope.js';

const router = Router();

const MODEL = 'claude-sonnet-4-6';

// Candidates pulled from the DB before Claude ranks them. Kept small so the
// ranking prompt stays cheap — Claude only ever sees a digest, never contact info.
const CANDIDATE_LIMIT = 25;
const RANKED_LIMIT = 3;
const REVIEWS_PER_PROVIDER = 4;

const CATEGORY_SLUGS = [
  'doctors', 'home-services', 'auto', 'education', 'childcare', 'food',
  'legal', 'beauty', 'real-estate', 'pets', 'cleaning', 'technology',
];

// Claude sometimes wraps JSON in a markdown fence despite being asked not to.
function parseJson(text) {
  const cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

// A model asked for "null if unclear" will sometimes send the string "null",
// which would otherwise become a literal `%null%` filter and match nothing.
function cleanValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || ['null', 'none', 'n/a', 'unknown'].includes(trimmed.toLowerCase())) return null;
  return trimmed;
}

function sanitizeFilters(raw) {
  const category = cleanValue(raw.category);
  return {
    category: CATEGORY_SLUGS.includes(category) ? category : null,
    city: cleanValue(raw.city),
    zip_code: cleanValue(raw.zip_code),
    insurance: cleanValue(raw.insurance),
    keywords: Array.isArray(raw.keywords) ? raw.keywords.filter(k => typeof k === 'string') : [],
    intent: cleanValue(raw.intent),
  };
}

async function extractFilters(client, query) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `A neighbor is searching a local recommendation directory. Turn their request into search filters.

Return only JSON:
{
  "category": "one of: ${CATEGORY_SLUGS.join(', ')} — or null if unclear",
  "city": "city name if mentioned, else null",
  "zip_code": "ZIP if mentioned, else null",
  "insurance": "insurance plan if mentioned, else null",
  "keywords": ["2-5 words capturing the specific need, e.g. newborns, emergency, weekend"],
  "intent": "one short sentence describing what they actually need and why"
}

Request:
"""
${query}
"""`
    }]
  });

  return sanitizeFilters(parseJson(response.content[0].text));
}

// Claude sees name, category, description, rating and review text — deliberately
// no phone, email or address, so a summary cannot leak masked contact details.
function toDigest(providers, reviewsByProvider) {
  return providers.map(p => ({
    id: p.id,
    name: p.name,
    category: p.categories?.name,
    description: p.description,
    city: p.city,
    rating: Number(p.avg_rating),
    review_count: p.review_count,
    services: p.services,
    insurance_accepted: p.insurance_accepted,
    reviews: (reviewsByProvider[p.id] || []).map(r => ({
      rating: r.rating,
      title: r.title,
      body: (r.body || '').slice(0, 300),
    })),
  }));
}

async function rankAndSummarize(client, query, intent, digest) {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `A neighbor searched: "${query}"${intent ? `\nWhat they need: ${intent}` : ''}

Below are provider records from their community directory, including reviews neighbors left. Pick the best matches (at most ${RANKED_LIMIT}) and explain the choice using only what the reviews and descriptions actually say.

Return only JSON:
{
  "answer": "2-3 sentences answering the neighbor directly, in a warm neighborly tone",
  "matches": [
    {
      "id": "provider id",
      "why": "one sentence on why neighbors recommend them, grounded in their reviews",
      "caveat": "an honest downside mentioned in reviews, or null"
    }
  ],
  "gap": "if nothing genuinely fits, one sentence saying so and suggesting they ask the community — otherwise null"
}

Rules:
- Never invent facts, ratings, or reviews that are not below.
- Never state a phone number, email or street address.
- If a provider has no reviews, say it is newly added rather than implying it is proven.
- Fewer, honest matches beat padding the list.

Providers:
${JSON.stringify(digest, null, 2)}`
    }]
  });

  return parseJson(response.content[0].text);
}

// Filler words carry no signal in a directory search but do make a strict
// all-terms match fail. Dropped before the relaxed pass.
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'who', 'what', 'that', 'this', 'any', 'anyone',
  'someone', 'somebody', 'need', 'needs', 'needed', 'looking', 'look', 'want',
  'good', 'great', 'best', 'nice', 'recommend', 'recommends', 'recommendation',
  'recommendations', 'help', 'please', 'know', 'knows', 'near', 'nearby',
  'around', 'about', 'can', 'could', 'would', 'should', 'does', 'have', 'has',
  'get', 'got', 'take', 'takes', 'accepts', 'accept', 'from', 'his', 'her',
  'our', 'their', 'you', 'your', 'find',
]);

function significantTerms(query) {
  const words = (query.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
  return [...new Set(words)];
}

// Plain full-text search — used when AI is unavailable or its filters match nothing,
// so search degrades instead of breaking.
async function textSearch(supabase, query, communityIds) {
  const base = () => {
    let q = supabase
      .from('providers')
      .select('*, categories!inner(name, slug, icon), communities(id, name, slug, city, state)')
      .order('avg_rating', { ascending: false })
      .limit(20);
    if (communityIds) q = q.in('community_id', communityIds);
    return q;
  };

  if (!query) return (await base()).data || [];

  // Strict pass: every term must match.
  const { data: strict } = await base().textSearch('fts', query, { type: 'websearch' });
  if (strict && strict.length > 0) return strict;

  // Relaxed pass: any significant term matches. Neighbors are encouraged to ask in
  // full sentences, and a sentence almost never matches every term — returning
  // close matches beats returning nothing.
  const terms = significantTerms(query);
  if (terms.length === 0) return [];

  const { data: relaxed } = await base().textSearch('fts', terms.join(' | '));
  if (relaxed && relaxed.length > 0) return relaxed;

  // Category pass: the provider text index covers name, description and city but
  // not the category, so "eye doctor" misses a provider called "Princeton Eyecare".
  // Match the query against category names and descriptions instead.
  const categoryIds = await matchCategoryIds(supabase, terms);
  if (categoryIds.length === 0) return [];

  const { data: byCategory } = await base().in('category_id', categoryIds);
  return byCategory || [];
}

// The seeded category descriptions ("Pediatricians, dentists, eye doctors, ...")
// double as a synonym list, so matching against them resolves plain-language terms.
async function matchCategoryIds(supabase, terms) {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, description');

  return (categories || [])
    .filter(c => {
      const haystack = `${c.name} ${c.description || ''}`.toLowerCase();
      return terms.some(t => haystack.includes(t));
    })
    .map(c => c.id);
}

router.post('/ai', requireAuth, async (req, res) => {
  const { q, community_id, nearby } = req.body;
  if (!q || q.trim().length < 3) {
    return res.status(400).json({ error: 'Please describe what you are looking for' });
  }

  const query = q.trim().slice(0, 500);
  const communityIds = await resolveCommunityIds(req.supabase, community_id, nearby);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    const providers = await textSearch(req.supabase, query, communityIds);
    return res.json({ ai: null, filters: null, providers: maskProviders(providers) });
  }

  const client = new Anthropic({ apiKey });

  try {
    const filters = await extractFilters(client, query);
    const hasStructuredFilter = Boolean(filters.category || filters.city || filters.zip_code);

    let providers;
    let usedTextSearch = false;

    if (hasStructuredFilter) {
      let candidates = req.supabase
        .from('providers')
        .select('*, categories!inner(name, slug, icon), communities(id, name, slug, city, state)')
        .order('avg_rating', { ascending: false })
        .limit(CANDIDATE_LIMIT);

      if (communityIds) candidates = candidates.in('community_id', communityIds);
      if (filters.category) candidates = candidates.eq('categories.slug', filters.category);
      if (filters.city) candidates = candidates.ilike('city', `%${filters.city}%`);
      if (filters.zip_code) candidates = candidates.eq('zip_code', filters.zip_code);

      const { data, error } = await candidates;
      if (error) throw new Error(error.message);
      providers = data || [];
    } else {
      // Nothing structured to filter on. An unfiltered query would return the whole
      // directory ranked by rating, which is not an answer — rank by text relevance
      // instead, and legitimately return nothing when nothing matches.
      providers = await textSearch(req.supabase, query, communityIds);
      usedTextSearch = true;
    }

    // Insurance lives in a text[]; match case-insensitively rather than exactly,
    // since neighbors type "aetna" and records say "Aetna".
    if (filters.insurance && providers.length > 0) {
      const want = filters.insurance.toLowerCase();
      const withInsurance = providers.filter(p =>
        (p.insurance_accepted || []).some(i => i.toLowerCase().includes(want))
      );
      if (withInsurance.length > 0) providers = withInsurance;
    }

    // Filters were too narrow — widen to plain text search rather than
    // telling the neighbor their community has nothing.
    if (providers.length === 0 && !usedTextSearch) {
      providers = await textSearch(req.supabase, query, communityIds);
    }

    if (providers.length === 0) {
      return res.json({
        ai: {
          answer: null,
          gap: 'No one in your community has recommended anyone for this yet. Be the first to add a recommendation.',
          matches: [],
        },
        filters,
        providers: [],
      });
    }

    const ids = providers.map(p => p.id);
    const { data: reviews } = await req.supabase
      .from('reviews')
      .select('provider_id, rating, title, body, created_at')
      .in('provider_id', ids)
      .order('created_at', { ascending: false });

    const reviewsByProvider = {};
    for (const r of reviews || []) {
      const bucket = (reviewsByProvider[r.provider_id] ||= []);
      if (bucket.length < REVIEWS_PER_PROVIDER) bucket.push(r);
    }

    const summary = await rankAndSummarize(
      client, query, filters.intent, toDigest(providers, reviewsByProvider)
    );

    // Only trust ids Claude was actually given, and order results to match its ranking.
    const byId = new Map(providers.map(p => [p.id, p]));
    const matches = (summary.matches || [])
      .filter(m => byId.has(m.id))
      .slice(0, RANKED_LIMIT);
    const ranked = matches.map(m => byId.get(m.id));
    const rest = providers.filter(p => !matches.some(m => m.id === p.id));

    res.json({
      ai: { answer: summary.answer || null, gap: summary.gap || null, matches },
      filters,
      providers: maskProviders([...ranked, ...rest]),
    });
  } catch (err) {
    // AI is an enhancement, never a hard dependency — fall back to plain search.
    console.error('AI search failed, falling back to text search:', err.message);
    const providers = await textSearch(req.supabase, query, communityIds);
    res.json({ ai: null, filters: null, providers: maskProviders(providers) });
  }
});

export default router;
