import { Router } from 'express';
import { resolveCommunityIds } from '../lib/scope.js';

const router = Router();

router.get('/', async (req, res) => {
  const { community_id, nearby } = req.query;

  const { data, error } = await req.supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  if (error) return res.status(500).json({ error: error.message });

  // Without a community there is nothing meaningful to count — an unscoped
  // total would mix other communities' private directories together.
  if (!community_id) return res.json(data);

  const communityIds = await resolveCommunityIds(req.supabase, community_id, nearby);

  // One query then tally in memory: a per-community directory is small, and this
  // avoids a round trip per category.
  const { data: rows } = await req.supabase
    .from('providers')
    .select('category_id')
    .in('community_id', communityIds);

  const counts = {};
  for (const row of rows || []) {
    counts[row.category_id] = (counts[row.category_id] || 0) + 1;
  }

  res.json(data.map(c => ({ ...c, provider_count: counts[c.id] || 0 })));
});

router.get('/:slug', async (req, res) => {
  const { data, error } = await req.supabase
    .from('categories')
    .select('*')
    .eq('slug', req.params.slug)
    .single();

  if (error) return res.status(404).json({ error: 'Category not found' });
  res.json(data);
});

export default router;
