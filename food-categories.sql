-- Enrich the Restaurants & Food description. It is not only display text:
-- backend/src/routes/search.js matches queries against category name +
-- description, and "butcher", "halal meat", "fish market", "tiffin" and
-- "milk delivery" previously matched no category at all.
UPDATE categories
SET description = 'Restaurants, grocery stores, organic and halal meat, butchers, fish markets, fresh produce, tiffin and meal services, dairy and milk delivery, catering, bakeries and sweets'
WHERE slug = 'food';
