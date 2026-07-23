import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.post('/', requireAuth, async (req, res) => {
  const { name, description, city, state, zip_code } = req.body;
  if (!name) return res.status(400).json({ error: 'Community name is required' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const invite_code = generateCode();

  const { data: community, error } = await req.supabase
    .from('communities')
    .insert({ name, slug, description, city, state, zip_code, created_by: req.user.id, invite_code })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await req.supabase
    .from('community_members')
    .insert({ community_id: community.id, user_id: req.user.id, role: 'admin' });

  res.status(201).json(community);
});

router.get('/my', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('community_members')
    .select('*, communities(*)')
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/nearby', requireAuth, async (req, res) => {
  const { data: memberships } = await req.supabase
    .from('community_members')
    .select('communities(state)')
    .eq('user_id', req.user.id);

  const states = [...new Set((memberships || []).map(m => m.communities?.state).filter(Boolean))];
  if (states.length === 0) return res.json([]);

  const { data, error } = await req.supabase
    .from('communities')
    .select('id, name, slug, city, state, zip_code, description')
    .in('state', states)
    .eq('is_active', true)
    .order('name');

  if (error) return res.status(500).json({ error: error.message });

  const myIds = (memberships || []).map(m => m.communities?.id).filter(Boolean);
  const nearby = (data || []).filter(c => !myIds.includes(c.id));
  res.json(nearby);
});

router.get('/:id/members', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('community_members')
    .select('*, profiles(full_name, email, avatar_url)')
    .eq('community_id', req.params.id)
    .order('joined_at');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
