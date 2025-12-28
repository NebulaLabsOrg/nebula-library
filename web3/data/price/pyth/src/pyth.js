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
     */
    async getLatestPriceById(_priceIds, _opts = {}) {
        return getLatestPriceById(this.hermesClient, _priceIds, _opts);
    }

}