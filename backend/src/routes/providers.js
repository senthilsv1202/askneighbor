import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
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

  res.json({ providers: data, total: count, page: Number(page), limit: Number(limit) });
});

router.get('/:id', async (req, res) => {
  const { data, error } = await req.supabase
    .from('providers')
    .select('*, categories(name, slug, icon), communities(id, name, slug, city, state), reviews(*, profiles(full_name, avatar_url))')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Provider not found' });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { name, category_id, community_id, phone, email, website, address, city, state, zip_code, description, insurance_accepted, services } = req.body;

  if (!name || !category_id) return res.status(400).json({ error: 'Name and category are required' });

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

  const { data, error } = await req.supabase
    .from('providers')
    .insert({
      name, category_id, community_id: resolvedCommunityId, phone, email, website, address, city, state, zip_code,
      description, insurance_accepted, services, added_by: req.user.id
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

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

export default router;
