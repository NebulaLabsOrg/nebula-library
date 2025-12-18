import { HermesClient } from '@pythnetwork/hermes-client';
import { getLatestPriceById } from './price-model.js';

/**
 * Pyth class provides a simple interface to fetch price data from the Pyth Hermes network.
 */
export class Pyth {

    /**
     * Creates a new Pyth instance.
     * @param {string|null} _endpoint - Optional endpoint URL for Hermes. Defaults to official endpoint.
     */
    constructor(_endpoint = null) {
        this.endpoint = _endpoint || 'https://hermes.pyth.network';
        this.hermesClient = new HermesClient(this.endpoint, {});
    }

    /**
     * Fetches the latest price for the given price ID(s) with options.
     * @param {string|string[]} _priceIds - Price ID or array of IDs to fetch.
     * @param {Object} _opts - Options for staleness/confidence/ema selection.
     * @returns {Promise<Object>} Response object with price data and metadata.
     *
     * @example
     * // Example return value:
     * {
     *   success: true,
     *   message: 'success',
     *   data: {
     *     mid: 123456789n,           // Mid price (BigInt)
     *     lower: 123450000n,         // Lower bound (BigInt)
     *     upper: 123460000n,         // Upper bound (BigInt)
     *     confRatioBps: 12n,         // Confidence ratio (BigInt, basis points)
     *     feedTimestamp: 1700000000, // Publish timestamp (seconds)
     *     expo: -8,                  // Exponent (int)
     *     source: 'mid',             // 'mid' or 'ema'
     *     sourceReason: 'mid selected: confRatioBps <= preferEmaAboveBps',
     *     mainConfRatioBps: 12n,     // Main confidence ratio (BigInt)
     *     emaConfRatioBps: null,     // EMA confidence ratio (BigInt|null)
     *     preferEmaAboveBps: 30n     // Decision threshold (BigInt)
     *   },
     *   source: 'pyth.getLatestPriceById'
     * }
     */
    async getLatestPriceById(_priceIds, _opts = {}) {
        return getLatestPriceById(this.hermesClient, _priceIds, _opts);
    }

}