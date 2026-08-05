-- ╔══════════════════════════════════════════════════════════════╗
-- ║  NEIGHBOUR SERVICES — run in Supabase Dashboard → SQL Editor ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Until now a provider was implicitly a business. But a large share of what a
-- community group actually asks for is neighbours themselves: mehendi before
-- Diwali, tiffin, Bharatanatyam or music lessons, tailoring, tutoring, event
-- photography, babysitting. None of those are businesses with a storefront, so
-- there was nowhere natural to record them.
--
-- The distinction matters for more than a badge. A plumber's number is public
-- business information; a neighbour's is not. Listing a private person requires
-- their permission, so consent is recorded per row rather than being an
-- unrecorded tick box.
--
-- Note: the existing consent checkbox in the Add form was never stored. The
-- frontend sent "consent" while the API read "consent_acknowledged", and neither
-- was written to the table. listing_consent replaces both.

ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_neighbor BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS listing_consent BOOLEAN NOT NULL DEFAULT FALSE;

-- Everything already in the directory is a business, which is the default.
COMMENT ON COLUMN providers.is_neighbor IS
  'True when this is a neighbour offering a skill, rather than a business.';
COMMENT ON COLUMN providers.listing_consent IS
  'The person adding this confirmed the details are public business information, or that they have the provider''s permission. Required when is_neighbor is true.';

CREATE INDEX IF NOT EXISTS idx_providers_is_neighbor
  ON providers(community_id, is_neighbor) WHERE is_neighbor = TRUE;
