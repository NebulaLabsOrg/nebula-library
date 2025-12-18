import { createResponse } from '../../../../../utils/src/response.utils.js';
import { selectBestPricePointWithMeta } from './selection.js';

/**
 * Fetches the latest price for a given price ID from Hermes, applies staleness/confidence checks,
 * and selects the best price point (mid or ema) with metadata.
 *
 * @param {HermesClient} _hermesClient - The Hermes client instance.
 * @param {string} _priceIds - The price ID to fetch.
 * @param {Object} _opts - Options: maxStalenessMs, maxConfRatioBps, preferEmaAboveBps.
 * @returns {Promise<Object>} Response object with price data and selection metadata.
 */
export async function getLatestPriceById(_hermesClient, _priceIds, _opts) {
    // Destructure options for clarity
    const { maxStalenessMs, maxConfRatioBps, preferEmaAboveBps } = _opts;

    try {
        // Fetch latest price update for the given price ID
        const updates = await _hermesClient.getLatestPriceUpdates([_priceIds]);
        const priceUpdate = updates?.parsed?.[0];
        if (!priceUpdate) throw new Error('No price update found');

        // Check if the price is stale
        const nowMs = Date.now();
        const pubMs = priceUpdate.price.publish_time * 1000;
        if ((nowMs - pubMs) > maxStalenessMs) {
            throw new Error(`Price is stale (publish_time=${priceUpdate.price.publish_time})`);
        }

        // Select the best price point (mid or ema) with metadata
        const {
            used,
            source,
            sourceReason,
            mainConfRatioBps,
            emaConfRatioBps
        } = selectBestPricePointWithMeta(priceUpdate, preferEmaAboveBps);

        // Guardrail: check if confidence is too high
        if (used.confRatioBps > maxConfRatioBps) {
            throw new Error(`Confidence too high: ${(Number(used.confRatioBps) / 100).toFixed(2)} bps`);
        }

        // Build the result object with all relevant data and metadata
        const result = {
            mid: used.mu,
            lower: used.lower,
            upper: used.upper,
            confRatioBps: used.confRatioBps,
            feedTimestamp: used.publishTime,
            expo: used.expo,
            // Source selection metadata
            source,                 // 'mid' | 'ema'
            sourceReason,           // string
            mainConfRatioBps,       // BigInt
            emaConfRatioBps,        // BigInt | null
            preferEmaAboveBps,      // BigInt (decision threshold)
        };
        // Return a successful response
        return createResponse(true, 'success', result, 'pyth.getLatestPriceById');
    } catch (error) {
        // Extract error message, preferring API error if available
        const message = error?.response?.data?.message || error?.message || 'Failed to get latest price by ID';
        // Return a failed response
        return createResponse(false, message, null, 'pyth.getLatestPriceById');
    }
}