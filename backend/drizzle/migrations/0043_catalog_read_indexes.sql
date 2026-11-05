-- Small homepage selections must stop after LIMIT instead of sorting the full catalog.
CREATE INDEX catalog_products_public_order_idx
ON catalog_products (popularity DESC, created_at DESC, id)
INCLUDE (game, category_id, supplier_provider, supplier_item_id)
WHERE public_enabled = true AND kind = 'skins';
--> statement-breakpoint
CREATE INDEX catalog_products_public_category_order_idx
ON catalog_products (lower(game), COALESCE(category_id, 'other'), popularity DESC, created_at DESC, id)
INCLUDE (supplier_provider, supplier_item_id)
WHERE public_enabled = true AND kind = 'skins';
--> statement-breakpoint
-- Supplier facets use the same market-name condition as catalog projection, without reading JSON.
CREATE INDEX catalog_products_public_facets_idx
ON catalog_products (lower(game), supplier_provider)
INCLUDE (game, product_type, supplier_item_id, category_id, weapon, stattrak)
WHERE public_enabled = true AND kind = 'skins';
--> statement-breakpoint
ANALYZE catalog_products;
