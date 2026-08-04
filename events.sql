-- ╔══════════════════════════════════════════════════════════════╗
-- ║  COMMUNITY EVENTS — run in Supabase Dashboard → SQL Editor   ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Two different lifecycles, deliberately not merged:
--
--   The announcement is perishable. "Diwali celebration this Saturday" is noise
--   by Sunday, so an event drops out of Upcoming on its own once the date passes.
--   That is done by comparing event_date on read — there is no delete and no
--   scheduler, so nothing can silently destroy data.
--
--   The photos are the opposite. They get MORE valuable with age: last year's
--   carnival pictures are a reason to come back, and in WhatsApp they scroll away
--   and are gone forever. Albums therefore never expire — that would recreate the
--   exact problem this app exists to solve.
--
-- Photos live in the private "event-photos" storage bucket. Only the object path
-- is stored here; the API mints short-lived signed URLs after checking community
-- membership, so a copied link cannot be shared outside the community. That
-- matters because most of these are photographs of people's children.

CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  title         TEXT NOT NULL,
  description   TEXT,
  location      TEXT,
  -- Date only: nobody needs minute precision for a community potluck, and it
  -- keeps "is this still upcoming?" a trivial comparison.
  event_date    DATE NOT NULL,
  start_time    TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Object path inside the private bucket, never a public URL.
  storage_path  TEXT NOT NULL,
  caption       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_community ON events(community_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_event_photos_event ON event_photos(event_id, created_at);

ALTER TABLE events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_photos ENABLE ROW LEVEL SECURITY;

-- The API uses the service key and enforces community membership itself; these
-- are defence in depth for any direct client access.
CREATE POLICY "events_read"   ON events FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "events_insert" ON events FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "events_update" ON events FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "events_delete" ON events FOR DELETE USING (auth.uid() = created_by);

CREATE POLICY "event_photos_read"   ON event_photos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "event_photos_insert" ON event_photos FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "event_photos_delete" ON event_photos FOR DELETE USING (auth.uid() = uploaded_by);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
