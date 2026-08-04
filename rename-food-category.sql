-- Rename Restaurants & Food -> Restaurants & Groceries.
-- "Restaurants & Food" read as eating out, so people looking for a butcher,
-- grocery or tiffin service did not think to look there.
--
-- The slug stays 'food', so existing URLs and provider rows are unaffected.
-- IMPORTANT: the display name is also hardcoded in backend/src/routes/parse.js.
-- Claude returns the category by NAME when reading a screenshot or pasted
-- message, and AddProvider maps that name back to an id — if the two drift
-- apart, parsing silently stops filling in the category.
UPDATE categories
SET name = 'Restaurants & Groceries'
WHERE slug = 'food';
