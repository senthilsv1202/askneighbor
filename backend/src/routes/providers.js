import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { maskProviders } from '../lib/mask.js';

const router = Router();

// PostgREST reports an unknown column as PGRST204 against its schema cache,
// rather than the Postgres undefined-column code.
function missingColumn(error) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === 'PGRST204'
    || code === '42703'
    || /could not find the '(is_neighbor|listing_consent)' column/i.test(message);
}

// List providers — requires auth, returns masked contact info
router.get('/', requireAuth, async (req, res) => {
  const { category, city, zip, q, sort = 'rating', page = 1, limit = 20, community_id, nearby } = req.query;
  const offset = (page - 1) * limit;

  let query = req.supabase
    .from('providers')
    .select('*, categories!inner(name, slug, icon), communities(id, name, slug, city, state)', { count: 'exact' });

  if (community_id) {
    if (nearby === 'true') {
      const { data: community } = await req.supabase
        .from('communities')
        .select('state')
        .eq('id', community_id)
        .single();
      if (community) {
        const { data: nearbyCommunities } = await req.supabase
          .from('communities')
          .select('id')
          .eq('state', community.state)
          .eq('is_active', true);
        const ids = (nearbyCommunities || []).map(c => c.id);
        query = query.in('community_id', ids);
      }
    } else {
      query = query.eq('community_id', community_id);
    }
  }

  if (category) query = query.eq('categories.slug', category);
  if (city) query = query.ilike('city', `%${city}%`);
  if (zip) query = query.eq('zip_code', zip);
  if (q) query = query.textSearch('fts', q, { type: 'websearch' });

  if (sort === 'rating') query = query.order('avg_rating', { ascending: false });
  else if (sort === 'reviews') query = query.order('review_count', { ascending: false });
  else query = query.order('created_at', { ascending: false });

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ providers: maskProviders(data || []), total: count, page: Number(page), limit: Number(limit) });
});

// Get full provider details — requires auth, returns full contact info
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('providers')
    .select('*, categories(name, slug, icon), communities(id, name, slug, city, state), reviews(*, profiles(full_name, avatar_url))')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Provider not found' });
  res.json(data);
});

// Create provider — requires auth + consent acknowledgment
router.post('/', requireAuth, async (req, res) => {
  const { name, category_id, community_id, phone, email, website, address, city, state, zip_code, description, insurance_accepted, services, is_neighbor, listing_consent } = req.body;

  if (!name || !category_id) return res.status(400).json({ error: 'Name and category are required' });

  // A business phone number is public information; a neighbour's is not. Listing a
  // private person without their agreement is the one thing here that could
  // genuinely upset someone, so it is enforced rather than merely asked.
  if (is_neighbor && !listing_consent) {
    return res.status(400).json({
      error: 'Please confirm this neighbour is happy to be listed before adding them.',
    });
  }

  let resolvedCommunityId = community_id;
  if (!resolvedCommunityId) {
    const { data: membership } = await req.supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', req.user.id)
      .limit(1)
      .single();
    resolvedCommunityId = membership?.community_id || null;
  }

  const base = {
    name, category_id, community_id: resolvedCommunityId, phone, email, website, address, city, state, zip_code,
    description, insurance_accepted, services, added_by: req.user.id,
  };
  const withConsent = {
    ...base,
    is_neighbor: Boolean(is_neighbor),
    // Previously the form sent "consent" while this read "consent_acknowledged",
    // so the tick box was never recorded anywhere. Now it is stored per row.
    listing_consent: Boolean(listing_consent),
  };

  const insert = (row) => req.supabase.from('providers').insert(row).select().single();

  let { data, error } = await insert(withConsent);

  // neighbor-services.sql may not have been run yet. Adding a provider is the
  // core action of the whole app, so fall back to the old shape rather than
  // breaking it — but never silently drop a neighbour listing, since that would
  // lose the consent record that makes it legitimate.
  if (error && missingColumn(error)) {
    if (is_neighbor) {
      return res.status(503).json({
        error: 'Neighbor listings are not set up yet. Run neighbor-services.sql, or add this as a business for now.',
        setup_required: true,
      });
    }
    ({ data, error } = await insert(base));
  }

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update provider
router.put('/:id', requireAuth, async (req, res) => {
  const { name, phone, email, website, address, city, state, zip_code, description, insurance_accepted, services } = req.body;

  const { data, error } = await req.supabase
    .from('providers')
    .update({ name, phone, email, website, address, city, state, zip_code, description, insurance_accepted, services })
    .eq('id', req.params.id)
    .eq('added_by', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Request removal — anyone can request, stores for admin review
router.post('/:id/removal-request', async (req, res) => {
  const { reason, requester_name, requester_email } = req.body;
  if (!reason || !requester_email) return res.status(400).json({ error: 'Reason and email are required' });

  const { error } = await req.supabase
    .from('removal_requests')
    .insert({
      provider_id: req.params.id,
      reason,
      requester_name: requester_name || 'Anonymous',
      requester_email
    });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Removal request submitted. We will review it within 48 hours.' });
});

export default router;
