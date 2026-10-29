-- New storefront policy; preserve the donor's immutable migration history.
WITH previous AS (
  UPDATE pricing_settings SET superseded_at=clock_timestamp()
  WHERE scope='sih-skins' AND source='sih' AND superseded_at IS NULL
  RETURNING *
)
INSERT INTO pricing_settings (id,scope,source,supplier_currency,fiat_currency,
  supplier_to_fiat_rate_minor,coin_rate_numerator,coin_rate_denominator,markup_bps,
  min_price_coin_minor,round_to_coin_minor,valid_from,metadata)
SELECT 'pricing-gems-v1',scope,source,supplier_currency,fiat_currency,
  supplier_to_fiat_rate_minor,2,1,2000,1,1,clock_timestamp(),
  metadata || jsonb_build_object('replaces',id,'reason','Gems: 1 RUB = 2 Gems')
FROM previous ORDER BY valid_from DESC,created_at DESC,id DESC LIMIT 1;
