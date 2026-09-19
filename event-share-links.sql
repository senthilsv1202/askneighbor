-- ╔══════════════════════════════════════════════════════════════╗
-- ║  EVENT SHARE LINKS — run in Supabase Dashboard → SQL Editor  ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Lets one event's album be opened without an account, via an unguessable URL.
--
-- Why this is needed rather than just nicer login: Supabase's built-in email
-- sender refuses to deliver to anyone who is not a member of the project team,
-- and is capped at 2 messages an hour. Password reset therefore cannot reach any
-- of the community's members at all, so a link that requires signing in is a
-- link most of them cannot follow.
--
-- The privacy trade is deliberate and worth stating: anyone holding the link can
-- open the album and can forward it. These are photographs of people's children.
-- The reason it is still reasonable is that the same photographs already sit in a
-- 24-person WhatsApp group where they can be forwarded with no controls at all —
-- so this is not a downgrade on the status quo. It is off by default, set per
-- event, and can be revoked at any time, which is more control than WhatsApp
-- offers.

ALTER TABLE events ADD COLUMN IF NOT EXISTS share_token TEXT;

-- Unique so a token can identify exactly one album, and indexed because the
-- public endpoint looks events up by it on every request.
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_share_token
  ON events(share_token) WHERE share_token IS NOT NULL;

COMMENT ON COLUMN events.share_token IS
  'Random token for public read-only album access. NULL means not shared. Revoking simply sets it back to NULL, which permanently breaks any link already sent.';
