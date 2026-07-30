import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { firstName } from '../lib/mask.js';
import { isCommunityMember } from '../lib/scope.js';

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
  if (!await isCommunityMember(req.supabase, req.params.id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  // community_members has two FKs to profiles (user_id and invited_by), so the
  // embed must name which one — an unqualified profiles(...) fails as ambiguous.
  const { data, error } = await req.supabase
    .from('community_members')
    .select('*, profiles:user_id(full_name, email, avatar_url)')
    .eq('community_id', req.params.id)
    .order('joined_at');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Recent contributions in this community — the reason to come back and the
// nudge that recommending is something neighbours actually do.
// Members only: this reveals who is active in a private community.
router.get('/:id/activity', requireAuth, async (req, res) => {
  const communityId = req.params.id;
  const limit = Math.min(Number(req.query.limit) || 8, 20);

  if (!await isCommunityMember(req.supabase, communityId, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  const [{ data: providers }, { data: reviews }] = await Promise.all([
    req.supabase
      .from('providers')
      .select('id, name, created_at, categories(name, slug), profiles:added_by(full_name)')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit),
    req.supabase
      .from('reviews')
      .select('id, rating, title, created_at, providers!inner(id, name, community_id), profiles:user_id(full_name)')
      .eq('providers.community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const events = [
    ...(providers || []).map(p => ({
      type: 'recommendation',
      id: `provider-${p.id}`,
      provider_id: p.id,
      provider_name: p.name,
      category: p.categories?.name || null,
      actor: firstName(p.profiles?.full_name),
      created_at: p.created_at,
    })),
    ...(reviews || []).map(r => ({
      type: 'review',
      id: `review-${r.id}`,
      provider_id: r.providers?.id,
      provider_name: r.providers?.name,
      rating: r.rating,
      title: r.title,
      actor: firstName(r.profiles?.full_name),
      created_at: r.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit);

  // Drives the "N new recommendations this week" nudge on the homepage.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = (providers || []).filter(p => new Date(p.created_at) >= weekAgo).length;

  res.json({ events, new_this_week: thisWeek });
});

export default router;
