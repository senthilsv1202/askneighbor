-- ╔══════════════════════════════════════════════════════════════╗
-- ║         ASKNEIGHBOR — SUPABASE SQL SCHEMA                   ║
-- ║  Run this in Supabase Dashboard → SQL Editor → Run          ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT,
  email           TEXT,
  avatar_url      TEXT,
  zip_code        TEXT,
  city            TEXT,
  state           TEXT,
  community_name  TEXT,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── CATEGORIES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT NOT NULL DEFAULT 'folder',
  description TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── BUSINESSES / SERVICE PROVIDERS ────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  zip_code        TEXT,
  description     TEXT,
  insurance_accepted TEXT[],
  services        TEXT[],
  hours           JSONB,
  avg_rating      NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  added_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_verified     BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── REVIEWS / RECOMMENDATIONS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, user_id)
);

-- ── FAVORITES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS favorites (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_id)
);

-- ── INDEXES ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_providers_category ON providers(category_id);
CREATE INDEX IF NOT EXISTS idx_providers_city     ON providers(city, state);
CREATE INDEX IF NOT EXISTS idx_providers_zip      ON providers(zip_code);
CREATE INDEX IF NOT EXISTS idx_providers_rating   ON providers(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_provider   ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user       ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user     ON favorites(user_id);

-- ── FULL TEXT SEARCH ──────────────────────────────────────────
ALTER TABLE providers ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_providers_fts ON providers USING gin(fts);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews    ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites  ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: everyone can read
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);

-- Providers: everyone can read, authenticated can insert
CREATE POLICY "providers_read"   ON providers FOR SELECT USING (true);
CREATE POLICY "providers_insert" ON providers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "providers_update" ON providers FOR UPDATE USING (auth.uid() = added_by);

-- Reviews: everyone can read, authenticated can insert/update own
CREATE POLICY "reviews_read"   ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews_delete" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Favorites: own only
CREATE POLICY "favorites_all" ON favorites FOR ALL USING (auth.uid() = user_id);

-- ── TRIGGERS ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reviews_updated_at   BEFORE UPDATE ON reviews   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at  BEFORE UPDATE ON profiles  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles(id, email, full_name)
  VALUES(NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT(id) DO NOTHING;
  RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update provider avg_rating when a review changes
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.provider_id, OLD.provider_id);
  UPDATE providers SET
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE provider_id = target_id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = target_id)
  WHERE id = target_id;
  RETURN NULL;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER reviews_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- ── COMMUNITIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communities (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  city         TEXT,
  state        TEXT,
  zip_code     TEXT,
  created_by   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invite_code  TEXT NOT NULL UNIQUE,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMUNITY MEMBERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  invited_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- ── INVITES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id  UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  code          TEXT NOT NULL UNIQUE,
  created_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  max_uses      INTEGER DEFAULT 10,
  use_count     INTEGER DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_comm ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_invites_code           ON invites(code);

ALTER TABLE communities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communities_read"   ON communities FOR SELECT USING (true);
CREATE POLICY "communities_insert" ON communities FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "communities_update" ON communities FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "members_read"   ON community_members FOR SELECT USING (true);
CREATE POLICY "members_insert" ON community_members FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "invites_read"   ON invites FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "invites_insert" ON invites FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── SEED CATEGORIES ───────────────────────────────────────────
INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
  ('Doctors & Medical',     'doctors',      'stethoscope',   'Pediatricians, dentists, eye doctors, specialists',           1),
  ('Home Services',         'home-services','wrench',        'Handymen, plumbers, electricians, HVAC, painters',            2),
  ('Auto Services',         'auto',         'car',           'Mechanics, body shops, car wash, towing',                     3),
  ('Education & Tutoring',  'education',    'graduation-cap','Tutors, music teachers, test prep, schools',                  4),
  ('Childcare',             'childcare',    'baby',          'Babysitters, daycares, nannies, after-school programs',        5),
  ('Restaurants & Food',    'food',         'utensils',      'Restaurants, grocery stores, catering, bakeries',              6),
  ('Legal & Financial',     'legal',        'scale',         'Lawyers, CPAs, tax consultants, financial advisors',           7),
  ('Beauty & Wellness',     'beauty',       'sparkles',      'Salons, spas, gyms, yoga studios, therapists',                8),
  ('Real Estate',           'real-estate',  'home',          'Realtors, mortgage brokers, movers, storage',                 9),
  ('Pet Services',          'pets',         'paw-print',     'Vets, groomers, pet sitters, trainers',                      10),
  ('Cleaning Services',     'cleaning',     'spray-can',     'House cleaning, carpet cleaning, pressure washing',          11),
  ('Technology',            'technology',   'monitor',       'IT support, computer repair, web designers, phone repair',    12)
ON CONFLICT (slug) DO NOTHING;
