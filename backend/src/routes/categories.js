import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const { data, error } = await req.supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
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
