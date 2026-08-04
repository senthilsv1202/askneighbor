-- Add a dedicated Driving Schools category.
--
-- Why its own category rather than folding into an existing one: driving
-- instruction routed inconsistently depending on how a neighbor phrased the ask.
-- "a driving school for my teenager" and "driving instructor for road test prep"
-- resolved to Education & Tutoring, while "someone to teach me to drive" and
-- "behind the wheel lessons" resolved to Auto Services. A provider filed under one
-- was therefore invisible to anyone browsing the other.
--
-- The description is deliberately synonym-rich. It is not just display text:
-- backend/src/routes/search.js matches the query against category name +
-- description in its keyword fallback, and the AI filter-extraction prompt is
-- built from the same list. Before this, "driving instructor" and "behind the
-- wheel lessons" matched no category at all.

INSERT INTO categories (name, slug, icon, description, sort_order) VALUES
  ('Driving Schools', 'driving-schools', 'traffic-cone',
   'Driving instructors, behind the wheel training, road test prep, permit classes, defensive driving',
   13)
ON CONFLICT (slug) DO UPDATE
  SET name        = EXCLUDED.name,
      icon        = EXCLUDED.icon,
      description = EXCLUDED.description,
      sort_order  = EXCLUDED.sort_order;
