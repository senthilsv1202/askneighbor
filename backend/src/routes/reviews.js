import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/provider/:providerId', async (req, res) => {
  const { data, error } = await req.supabase
    .from('reviews')
    .select('*, profiles(full_name, avatar_url)')
    .eq('provider_id', req.params.providerId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { provider_id, rating, title, body } = req.body;

  if (!provider_id || !rating) return res.status(400).json({ error: 'Provider and rating are required' });
  if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

  const { data, error } = await req.supabase
    .from('reviews')
    .insert({ provider_id, user_id: req.user.id, rating, title, body })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'You already reviewed this provider' });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
});

router.put('/:id', requireAuth, async (req, res) => {
  const { rating, title, body } = req.body;

  const { data, error } = await req.supabase
    .from('reviews')
    .update({ rating, title, body })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await req.supabase
    .from('reviews')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default router;
