// Resolve which communities a request may read from. Returns null for
// "no community scoping", otherwise the list of allowed community ids.
// Used by search and category counts so both honour the same boundary.
export async function resolveCommunityIds(supabase, community_id, nearby) {
  if (!community_id) return null;
  if (nearby !== 'true' && nearby !== true) return [community_id];

  const { data: community } = await supabase
    .from('communities')
    .select('state')
    .eq('id', community_id)
    .single();
  if (!community) return [community_id];

  const { data: nearbyCommunities } = await supabase
    .from('communities')
    .select('id')
    .eq('state', community.state)
    .eq('is_active', true);

  const ids = (nearbyCommunities || []).map(c => c.id);
  return ids.length > 0 ? ids : [community_id];
}

export async function isCommunityMember(supabase, communityId, userId) {
  const { data } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}
