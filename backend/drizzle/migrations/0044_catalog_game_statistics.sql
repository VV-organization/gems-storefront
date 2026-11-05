-- Partial expression indexes do not supply global selectivity for lower(game).
-- Accurate estimates let LIMIT queries use the ordered index instead of sorting all games.
CREATE STATISTICS catalog_products_game_visibility_stats
ON (lower(game)), public_enabled, kind
FROM catalog_products;
--> statement-breakpoint
ANALYZE catalog_products;
