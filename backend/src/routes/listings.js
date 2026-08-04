import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { firstName } from '../lib/mask.js';
import { isCommunityMember } from '../lib/scope.js';

const router = Router();

const MODEL_SCREEN = 'claude-sonnet-4-6';
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

// listings.sql has not been run yet. PostgREST answers with its own schema-cache
// error (PGRST205) rather than the Postgres undefined-table code, so match both:
// the raw 42P01 only surfaces if the query ever goes direct to the database.
const UNDEFINED_TABLE = '42P01';
const POSTGREST_NO_TABLE = 'PGRST205';

function tableMissing(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code === UNDEFINED_TABLE
    || code === POSTGREST_NO_TABLE
    || /could not find the table .*listings/i.test(message)
    || /relation .*listings.* does not exist/i.test(message);
}

function notSetUp(res) {
  return res.status(503).json({
    error: 'Housing listings are not set up yet.',
    setup_required: true,
  });
}

// Federal Fair Housing Act protected classes plus New Jersey's Law Against
// Discrimination, which is broader (notably source of lawful income, so refusing
// Section 8 vouchers is unlawful here). Phrases that pass unremarked in a private
// WhatsApp group become published housing advertisements on a site like this.
const SCREEN_PROMPT = `You are checking a housing listing for compliance with the US Fair Housing Act and the New Jersey Law Against Discrimination, before it is published on a community housing board.

Protected characteristics: race, colour, national origin, ancestry, nationality, religion, sex, gender identity or expression, sexual orientation, familial status (having children), disability, marital or civil union status, military service, age, and source of lawful income (including housing vouchers such as Section 8).

Classify the listing:
- "violation": states or implies a preference, limitation or exclusion based on a protected characteristic. Examples: "vegetarian family preferred", "Indian family only", "no kids", "working professionals only", "Christian household", "no Section 8".
- "caution": ambiguous wording a reader could reasonably take as such a preference.
- "ok": no issues.

Do NOT flag lawful, non-protected terms. These are all fine: no smoking, no pets (assistance animals aside), credit or income checks, security deposits, lease length, reasonable occupancy limits, furnished or unfurnished, parking or utility terms.

Return only JSON:
{
  "status": "violation" | "caution" | "ok",
  "issues": [{ "phrase": "the exact wording", "characteristic": "which protected characteristic", "why": "one short sentence" }],
  "suggested_rewrite": "the listing text rewritten compliantly, preserving every lawful requirement — or null if status is ok"
}

Listing title: """{{TITLE}}"""
Listing description: """{{DESCRIPTION}}"""`;

function parseJson(text) {
  return JSON.parse(
    text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  );
}

async function screenForFairHousing(title, description) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // Screening is a safety net, not a gate we can fail closed on: without a key
  // the listing still publishes and the posted disclaimer carries the weight.
  if (!apiKey) return { status: 'unscreened', issues: [], suggested_rewrite: null };

  const client = new Anthropic({ apiKey });
  const prompt = SCREEN_PROMPT
    .replace('{{TITLE}}', (title || '').slice(0, 300))
    .replace('{{DESCRIPTION}}', (description || '').slice(0, 3000));

  try {
    const response = await client.messages.create({
      model: MODEL_SCREEN,
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    });
    const result = parseJson(response.content[0].text);
    return {
      status: ['violation', 'caution', 'ok'].includes(result.status) ? result.status : 'unscreened',
      issues: Array.isArray(result.issues) ? result.issues.slice(0, 5) : [],
      suggested_rewrite: result.suggested_rewrite || null,
    };
  } catch (err) {
    console.error('Fair housing screen failed:', err.message);
    return { status: 'unscreened', issues: [], suggested_rewrite: null };
  }
}

// Lazily retire listings whose expiry has passed. Avoids needing a scheduler,
// and guarantees nobody is shown a stale listing even if this runs rarely.
async function expireStale(supabase, communityId) {
  await supabase
    .from('listings')
    .update({ status: 'expired' })
    .eq('community_id', communityId)
    .eq('status', 'active')
    .lt('expires_at', new Date().toISOString());
}

function shape(row, viewerId) {
  return {
    ...row,
    posted_by_name: firstName(row.profiles?.full_name),
    is_mine: row.posted_by === viewerId,
    days_left: row.status === 'active'
      ? Math.max(0, Math.ceil((new Date(row.expires_at) - Date.now()) / 86400000))
      : null,
    profiles: undefined,
  };
}

// Preview the screen without posting, so the form can warn while composing.
router.post('/screen', requireAuth, async (req, res) => {
  const { title, description } = req.body;
  if (!title && !description) return res.status(400).json({ error: 'Nothing to screen' });
  res.json(await screenForFairHousing(title, description));
});

router.get('/', requireAuth, async (req, res) => {
  const { community_id, include_closed } = req.query;
  if (!community_id) return res.status(400).json({ error: 'community_id is required' });

  if (!await isCommunityMember(req.supabase, community_id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  await expireStale(req.supabase, community_id).catch(() => {});

  let query = req.supabase
    .from('listings')
    .select('*, profiles:posted_by(full_name)')
    .eq('community_id', community_id)
    .order('created_at', { ascending: false });

  // Closed listings stay visible only to the person who posted them, so they can
  // reopen or renew; everyone else sees a board of genuinely available homes.
  if (include_closed !== 'true') query = query.eq('status', 'active');

  const { data, error } = await query;
  if (error) return tableMissing(error) ? notSetUp(res) : res.status(500).json({ error: error.message });

  res.json({ listings: (data || []).map(row => shape(row, req.user.id)) });
});

router.post('/', requireAuth, async (req, res) => {
  const {
    community_id, listing_type, title, description, price, bedrooms, bathrooms,
    address, city, state, zip_code, available_from, external_url,
    contact_phone, contact_email, days,
  } = req.body;

  if (!community_id) return res.status(400).json({ error: 'community_id is required' });
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!['rent', 'sale'].includes(listing_type)) {
    return res.status(400).json({ error: 'listing_type must be "rent" or "sale"' });
  }
  if (!await isCommunityMember(req.supabase, community_id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  const screen = await screenForFairHousing(title, description);
  // Block only on a clear violation. Flagging ambiguous wording as an error would
  // train people to ignore the warning, so "caution" publishes and is returned
  // to the client to display.
  if (screen.status === 'violation') {
    return res.status(422).json({
      error: 'This listing may breach fair housing rules and was not posted.',
      fair_housing: screen,
    });
  }

  const lifespan = Math.min(Math.max(Number(days) || DEFAULT_DAYS, 1), MAX_DAYS);
  const expires_at = new Date(Date.now() + lifespan * 86400000).toISOString();

  const { data, error } = await req.supabase
    .from('listings')
    .insert({
      community_id, posted_by: req.user.id, listing_type,
      title: title.trim(), description,
      price: price === '' || price == null ? null : Number(price),
      bedrooms: bedrooms === '' || bedrooms == null ? null : Number(bedrooms),
      bathrooms: bathrooms === '' || bathrooms == null ? null : Number(bathrooms),
      address, city, state, zip_code,
      available_from: available_from || null,
      external_url, contact_phone, contact_email,
      expires_at,
    })
    .select('*, profiles:posted_by(full_name)')
    .single();

  if (error) return tableMissing(error) ? notSetUp(res) : res.status(500).json({ error: error.message });

  res.status(201).json({ listing: shape(data, req.user.id), fair_housing: screen });
});

// Mark rented/sold/withdrawn, reopen, or renew. Keeping this one endpoint means
// the "is it still available?" nudge and the status buttons share a path.
router.patch('/:id', requireAuth, async (req, res) => {
  const { status, renew } = req.body;
  const allowed = ['active', 'rented', 'sold', 'withdrawn'];

  const patch = {};
  if (status !== undefined) {
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    patch.status = status;
  }
  if (renew) {
    patch.expires_at = new Date(Date.now() + DEFAULT_DAYS * 86400000).toISOString();
    patch.status = 'active';
  }
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nothing to update' });

  const { data, error } = await req.supabase
    .from('listings')
    .update(patch)
    .eq('id', req.params.id)
    .eq('posted_by', req.user.id)      // only the poster can change their listing
    .select('*, profiles:posted_by(full_name)')
    .maybeSingle();

  if (error) return tableMissing(error) ? notSetUp(res) : res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Listing not found, or it is not yours' });

  res.json({ listing: shape(data, req.user.id) });
});

export default router;
