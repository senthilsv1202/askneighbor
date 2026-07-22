import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/validate', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Invite code is required' });

  const upperCode = code.trim().toUpperCase();

  const { data: community } = await req.supabase
    .from('communities')
    .select('id, name, city, state')
    .eq('invite_code', upperCode)
    .eq('is_active', true)
    .single();

  if (community) {
    return res.json({ valid: true, community, source: 'community' });
  }

  const { data: invite } = await req.supabase
    .from('invites')
    .select('id, community_id, max_uses, use_count, expires_at, is_active, communities(id, name, city, state)')
    .eq('code', upperCode)
    .eq('is_active', true)
    .single();

  if (!invite) return res.json({ valid: false });

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return res.json({ valid: false, reason: 'Invite has expired' });
  }
  if (invite.max_uses && invite.use_count >= invite.max_uses) {
    return res.json({ valid: false, reason: 'Invite has reached maximum uses' });
  }

  res.json({ valid: true, community: invite.communities, source: 'invite', invite_id: invite.id });
});

router.post('/join', requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Invite code is required' });

  const upperCode = code.trim().toUpperCase();

  let community_id = null;
  let invite_id = null;

  const { data: community } = await req.supabase
    .from('communities')
    .select('id')
    .eq('invite_code', upperCode)
    .eq('is_active', true)
    .single();

  if (community) {
    community_id = community.id;
  } else {
    const { data: invite } = await req.supabase
      .from('invites')
      .select('id, community_id, max_uses, use_count, expires_at')
      .eq('code', upperCode)
      .eq('is_active', true)
      .single();

    if (!invite) return res.status(400).json({ error: 'Invalid invite code' });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }
    if (invite.max_uses && invite.use_count >= invite.max_uses) {
      return res.status(400).json({ error: 'Invite has reached maximum uses' });
    }

    community_id = invite.community_id;
    invite_id = invite.id;
  }

  const { data: existing } = await req.supabase
    .from('community_members')
    .select('id')
    .eq('community_id', community_id)
    .eq('user_id', req.user.id)
    .single();

  if (existing) return res.json({ message: 'Already a member', community_id });

  const { error: joinError } = await req.supabase
    .from('community_members')
    .insert({ community_id, user_id: req.user.id, role: 'member' });

  if (joinError) return res.status(500).json({ error: joinError.message });

  if (invite_id) {
    await req.supabase.rpc('increment_invite_use', { invite_id_param: invite_id }).catch(() => {
      req.supabase
        .from('invites')
        .update({ use_count: req.supabase.raw('use_count + 1') })
        .eq('id', invite_id);
    });
  }

  res.json({ message: 'Joined successfully', community_id });
});

router.post('/generate', requireAuth, async (req, res) => {
  const { community_id, max_uses = 10, expires_in_days = 7 } = req.body;

  const { data: membership } = await req.supabase
    .from('community_members')
    .select('role')
    .eq('community_id', community_id)
    .eq('user_id', req.user.id)
    .single();

  if (!membership) return res.status(403).json({ error: 'Not a member of this community' });

  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  const expires_at = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await req.supabase
    .from('invites')
    .insert({ community_id, code, created_by: req.user.id, max_uses, expires_at })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
