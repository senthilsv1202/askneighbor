-- ╔══════════════════════════════════════════════════════════════╗
-- ║  HOUSING LISTINGS — run in Supabase Dashboard → SQL Editor   ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Deliberately NOT modelled as a provider/category. Providers are durable and
-- rated; a listing is perishable and un-rateable. Reusing `providers` would have
-- rendered every house as "0.0 ☆☆☆☆☆ 0 reviews", and the AI search summary
-- ("why neighbors recommend them") is meaningless for a house.
--
-- The main failure mode for a community listings board is staleness: a board of
-- already-rented houses is worse than no board. Hence status + expires_at, with
-- the API lazily expiring rows on read so no scheduler is required.

CREATE TABLE IF NOT EXISTS listings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id   UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  posted_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  listing_type   TEXT NOT NULL CHECK (listing_type IN ('rent', 'sale')),
  title          TEXT NOT NULL,
  description    TEXT,

  price          NUMERIC(12,2),
  bedrooms       NUMERIC(3,1),
  bathrooms      NUMERIC(3,1),

  -- Area/neighbourhood is enough; exact address is optional on purpose since
  -- members may not want a precise address on a searchable page.
  address        TEXT,
  city           TEXT,
  state          TEXT,
  zip_code       TEXT,

  available_from DATE,
  -- Link out to Zillow/Redfin/StreetEasy rather than duplicating listing data
  -- and photos here. They do that better and it keeps this table small.
  external_url   TEXT,
  contact_phone  TEXT,
  contact_email  TEXT,

  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'rented', 'sold', 'withdrawn', 'expired')),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_community ON listings(community_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_expires   ON listings(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_posted_by ON listings(posted_by);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- The API uses the service key and enforces community membership itself; these
-- policies are defence in depth for any direct client access.
CREATE POLICY "listings_read"   ON listings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "listings_insert" ON listings FOR INSERT WITH CHECK (auth.uid() = posted_by);
CREATE POLICY "listings_update" ON listings FOR UPDATE USING (auth.uid() = posted_by);
CREATE POLICY "listings_delete" ON listings FOR DELETE USING (auth.uid() = posted_by);

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
