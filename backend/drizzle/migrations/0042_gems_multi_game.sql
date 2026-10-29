ALTER TABLE catalog_products DROP CONSTRAINT frags_public_catalog_scope;
--> statement-breakpoint
ALTER TABLE catalog_products ADD CONSTRAINT gems_public_catalog_scope
CHECK (NOT public_enabled OR (kind='skins' AND lower(coalesce(game,'')) IN ('cs2','rust','tf2')));
