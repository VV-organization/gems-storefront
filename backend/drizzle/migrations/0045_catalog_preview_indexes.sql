-- Keep homepage previews independent of full product JSON and cold heap scans.
CREATE INDEX IF NOT EXISTS catalog_products_public_offer_lookup_idx
ON catalog_products (supplier_provider, supplier_item_id, lower(game))
INCLUDE (id, game, category_id, weapon, price_coin_minor, popularity, created_at)
WHERE public_enabled = true AND kind = 'skins';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS catalog_products_public_weapon_order_idx
ON catalog_products (lower(game), lower(weapon), popularity DESC, created_at DESC, id)
INCLUDE (game, weapon, category_id, supplier_provider, supplier_item_id, price_coin_minor)
WHERE public_enabled = true AND kind = 'skins';
--> statement-breakpoint
CREATE STATISTICS IF NOT EXISTS catalog_products_weapon_visibility_stats
ON (lower(game)), (lower(weapon)), public_enabled, kind
FROM catalog_products;
--> statement-breakpoint
ANALYZE catalog_products;
