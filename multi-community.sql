-- Add community_id to providers so recommendations are scoped per community
ALTER TABLE providers ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_providers_community ON providers(community_id);

-- Update existing providers to belong to the first community (if any exist)
UPDATE providers SET community_id = (SELECT id FROM communities LIMIT 1) WHERE community_id IS NULL;
