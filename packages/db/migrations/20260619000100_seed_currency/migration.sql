INSERT INTO "currency" ("code", "name", "symbol", "decimal_places", "active")
VALUES
  ('INR', 'Indian Rupee', '₹', 2, true),
  ('USD', 'US Dollar', '$', 2, true),
  ('EUR', 'Euro', '€', 2, true),
  ('GBP', 'Pound Sterling', '£', 2, true)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "symbol" = EXCLUDED."symbol",
  "decimal_places" = EXCLUDED."decimal_places",
  "active" = EXCLUDED."active";
