import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';
import { firstName } from '../lib/mask.js';
import { isCommunityMember } from '../lib/scope.js';

const router = Router();

const BUCKET = 'event-photos';
// Long enough to browse an album without re-fetching, short enough that a copied
// link stops working well before it could circulate outside the community.
const SIGNED_URL_TTL = 60 * 60;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const UNDEFINED_TABLE = '42P01';
const POSTGREST_NO_TABLE = 'PGRST205';

function tableMissing(error) {
  if (!error) return false;
  const code = error.code || '';
  const message = error.message || '';
  return code === UNDEFINED_TABLE
    || code === POSTGREST_NO_TABLE
    || /could not find the table .*(events|event_photos)/i.test(message);
}

// event-share-links.sql not run yet. Postgres answers 42703 directly; PostgREST
// answers PGRST204 from its schema cache.
function missingShareColumn(error) {
  const code = error?.code || '';
  return code === '42703' || code === 'PGRST204'
    || /share_token/i.test(error?.message || '');
}

function notSetUp(res) {
  return res.status(503).json({
    error: 'Community events are not set up yet.',
    setup_required: true,
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Photos live in a private bucket, so every read needs a fresh signed URL. Minted
// only after the caller has been confirmed a member of the owning community.
async function signPhotos(supabase, photos) {
  if (photos.length === 0) return [];
  const paths = photos.map((p) => p.storage_path);
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  const urlByPath = new Map((data || []).map((d) => [d.path, d.signedUrl]));

  return photos.map((p) => ({
    id: p.id,
    caption: p.caption,
    created_at: p.created_at,
    uploaded_by_name: firstName(p.profiles?.full_name),
    url: urlByPath.get(p.storage_path) || null,
  }));
}

// ── Public album ────────────────────────────────────────────────────────────
// Deliberately unauthenticated: the whole point is that someone can tap a link
// from the group chat and see the photos without an account. Access rests
// entirely on the token being unguessable, so it is 48 hex characters and the
// lookup is exact-match.
//
// Mounted before '/:id' so the literal path is not swallowed by that route.
router.get('/album/:token', async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 20) return res.status(404).json({ error: 'Album not found' });

  const { data: event, error } = await req.supabase
    .from('events')
    .select('id, title, description, location, event_date, share_token')
    .eq('share_token', token)
    .maybeSingle();

  // This endpoint is public, so it never reports why a lookup failed. A missing
  // column or table is answered as "not found" like any bad token: leaking
  // "column events.share_token does not exist" tells a stranger about the schema
  // and means nothing to the person who just tapped a link.
  if (error) {
    if (!tableMissing(error) && !missingShareColumn(error)) {
      console.error('Public album lookup failed:', error.message);
    }
    return res.status(404).json({ error: 'Album not found' });
  }
  if (!event) return res.status(404).json({ error: 'Album not found' });

  const { data: photos } = await req.supabase
    .from('event_photos')
    .select('id, storage_path, caption, created_at')
    .eq('event_id', event.id)
    .order('created_at');

  const signed = await signPhotos(req.supabase, photos || []);

  // No community name and no uploader names. A public link should reveal the
  // occasion and the pictures, not who is in the community or who took what.
  res.json({
    album: {
      title: event.title,
      description: event.description,
      location: event.location,
      event_date: event.event_date,
      photo_count: signed.length,
    },
    photos: signed.map(({ id, url, caption }) => ({ id, url, caption })),
  });
});

router.get('/', requireAuth, async (req, res) => {
  const { community_id } = req.query;
  if (!community_id) return res.status(400).json({ error: 'community_id is required' });
  if (!await isCommunityMember(req.supabase, community_id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  const { data, error } = await req.supabase
    .from('events')
    .select('*, profiles:created_by(full_name), event_photos(id)')
    .eq('community_id', community_id)
    .order('event_date', { ascending: false });

  if (error) return tableMissing(error) ? notSetUp(res) : res.status(500).json({ error: error.message });

  const now = today();
  const shaped = (data || []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    event_date: e.event_date,
    start_time: e.start_time,
    photo_count: (e.event_photos || []).length,
    created_by_name: firstName(e.profiles?.full_name),
    is_mine: e.created_by === req.user.id,
  }));

  // The announcement expires; the album does not. An event simply moves from one
  // list to the other when its date passes — nothing is ever deleted.
  res.json({
    upcoming: shaped.filter((e) => e.event_date >= now)
      .sort((a, b) => a.event_date.localeCompare(b.event_date)),
    past: shaped.filter((e) => e.event_date < now),
  });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { data: event, error } = await req.supabase
    .from('events')
    .select('*, profiles:created_by(full_name)')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return tableMissing(error) ? notSetUp(res) : res.status(500).json({ error: error.message });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!await isCommunityMember(req.supabase, event.community_id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  const { data: photos } = await req.supabase
    .from('event_photos')
    .select('*, profiles:uploaded_by(full_name)')
    .eq('event_id', event.id)
    .order('created_at');

  res.json({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      event_date: event.event_date,
      start_time: event.start_time,
      created_by_name: firstName(event.profiles?.full_name),
      is_mine: event.created_by === req.user.id,
      is_past: event.event_date < today(),
      // Only ever returned to the organiser, who is the only one who can change it.
      share_token: event.created_by === req.user.id ? (event.share_token || null) : null,
    },
    photos: await signPhotos(req.supabase, photos || []),
  });
});

router.post('/', requireAuth, async (req, res) => {
  const { community_id, title, description, location, event_date, start_time } = req.body;
  if (!community_id) return res.status(400).json({ error: 'community_id is required' });
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!event_date) return res.status(400).json({ error: 'Event date is required' });
  if (!await isCommunityMember(req.supabase, community_id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  const { data, error } = await req.supabase
    .from('events')
    .insert({
      community_id, created_by: req.user.id,
      title: title.trim(), description, location, event_date, start_time,
    })
    .select()
    .single();

  if (error) return tableMissing(error) ? notSetUp(res) : res.status(500).json({ error: error.message });
  res.status(201).json({ event: data });
});

// Turn public sharing on or off for one event. Only the organiser decides.
router.post('/:id/share', requireAuth, async (req, res) => {
  const { enabled } = req.body;

  const { data: event, error: findError } = await req.supabase
    .from('events').select('id, community_id, created_by').eq('id', req.params.id).maybeSingle();
  if (findError) return tableMissing(findError) ? notSetUp(res) : res.status(500).json({ error: findError.message });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.created_by !== req.user.id) {
    return res.status(403).json({ error: 'Only whoever added this event can share it' });
  }

  // Revoking sets the token back to NULL, which permanently breaks any link
  // already sent. Re-enabling mints a fresh one rather than restoring the old.
  const share_token = enabled === false ? null : crypto.randomBytes(24).toString('hex');

  const { error } = await req.supabase
    .from('events').update({ share_token }).eq('id', event.id);

  if (error) {
    if (/share_token/i.test(error.message)) {
      return res.status(503).json({
        error: 'Share links are not set up yet. Run event-share-links.sql first.',
        setup_required: true,
      });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ share_token });
});

router.post('/:id/photos', requireAuth, async (req, res) => {
  const { image, media_type, caption } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  const { data: event, error: eventError } = await req.supabase
    .from('events').select('id, community_id').eq('id', req.params.id).maybeSingle();
  if (eventError) return tableMissing(eventError) ? notSetUp(res) : res.status(500).json({ error: eventError.message });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Anyone in the community can add to an album — most photos of an event are
  // taken by people other than whoever created the listing.
  if (!await isCommunityMember(req.supabase, event.community_id, req.user.id)) {
    return res.status(403).json({ error: 'You are not a member of this community' });
  }

  const buffer = Buffer.from(image, 'base64');
  if (buffer.length > MAX_PHOTO_BYTES) {
    return res.status(413).json({ error: 'That photo is too large. Please try a smaller one.' });
  }

  const type = ['image/jpeg', 'image/png', 'image/webp'].includes(media_type) ? media_type : 'image/jpeg';
  const ext = type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${event.community_id}/${event.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await req.supabase.storage
    .from(BUCKET).upload(path, buffer, { contentType: type, upsert: false });
  if (uploadError) return res.status(500).json({ error: uploadError.message });

  const { data, error } = await req.supabase
    .from('event_photos')
    .insert({ event_id: event.id, uploaded_by: req.user.id, storage_path: path, caption: caption || null })
    .select('*, profiles:uploaded_by(full_name)')
    .single();

  if (error) {
    // Do not leave an orphaned object behind if the row fails to insert.
    await req.supabase.storage.from(BUCKET).remove([path]);
    return res.status(500).json({ error: error.message });
  }

  const [photo] = await signPhotos(req.supabase, [data]);
  res.status(201).json({ photo });
});

router.delete('/:id/photos/:photoId', requireAuth, async (req, res) => {
  const { data: photo, error } = await req.supabase
    .from('event_photos')
    .select('*, events!inner(created_by)')
    .eq('id', req.params.photoId)
    .eq('event_id', req.params.id)
    .maybeSingle();

  if (error) return tableMissing(error) ? notSetUp(res) : res.status(500).json({ error: error.message });
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  // Whoever uploaded it, or whoever organised the event, can remove a photo.
  const allowed = photo.uploaded_by === req.user.id || photo.events?.created_by === req.user.id;
  if (!allowed) return res.status(403).json({ error: 'You can only remove photos you added' });

  await req.supabase.storage.from(BUCKET).remove([photo.storage_path]);
  await req.supabase.from('event_photos').delete().eq('id', photo.id);
  res.status(204).end();
});

export default router;
