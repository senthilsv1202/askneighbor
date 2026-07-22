import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('favorites')
    .select('*, providers(*, categories(name, slug, icon))')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { provider_id } = req.body;
  if (!provider_id) return res.status(400).json({ error: 'Provider ID is required' });

  const { data, error } = await req.supabase
    .from('favorites')
    .insert({ user_id: req.user.id, provider_id })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Already in favorites' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

router.delete('/:providerId', requireAuth, async (req, res) => {
  const { error } = await req.supabase
    .from('favorites')
    .delete()
    .eq('user_id', req.user.id)
    .eq('provider_id', req.params.providerId);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
