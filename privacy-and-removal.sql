-- Removal requests table — providers or anyone can request data removal
CREATE TABLE IF NOT EXISTS removal_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  reason          TEXT NOT NULL,
  requester_name  TEXT,
  requester_email TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE removal_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a removal request (no auth needed)
CREATE POLICY "removal_insert" ON removal_requests FOR INSERT WITH CHECK (true);
-- Only service role can read/update (admin)
CREATE POLICY "removal_admin" ON removal_requests FOR ALL USING (false);
