import { calculatePriceBounds } from './calc.js';

/**
 * Selects the best price point (mid or ema) based on confidence ratio and a threshold.
 * Returns the selected price point and metadata about the selection.
 *
 * @param {Object} _priceUpdate - The price update object containing price and optionally ema_price.
 * @param {bigint} _preferEmaAboveBps - Threshold (in bps) above which ema is preferred over mid.
 * @returns {Object} { used, source, sourceReason, mainConfRatioBps, emaConfRatioBps }
 */
export function selectBestPricePointWithMeta(_priceUpdate, _preferEmaAboveBps) {
  // Calculate bounds for the main (mid) price
  const main = calculatePriceBounds(_priceUpdate.price);
  // Calculate bounds for the ema price, if available
  const ema = _priceUpdate.ema_price ? calculatePriceBounds(_priceUpdate.ema_price) : null;

  // Metadata about the selection
  const meta = {
    source: 'mid', // Default to mid
    sourceReason: 'mid selected: confRatioBps <= preferEmaAboveBps',
    mainConfRatioBps: main.confRatioBps,
    emaConfRatioBps: ema ? ema.confRatioBps : null,
  };

  // If mid's confidence ratio is above the threshold and ema is available, use ema
  if (main.confRatioBps > _preferEmaAboveBps && ema) {
    meta.source = 'ema';
    meta.sourceReason = 'ema selected: mid confRatioBps > preferEmaAboveBps';
    return { used: ema, ...meta };
  }

  // Otherwise, use mid
  return { used: main, ...meta };
}