import { sGetVaultPerformance } from './scrape.model.js';

/**
 * @class DefxScraper
 * @description A class for scraping data from the Defx exchange.
 * Provides methods to retrieve vault performance data from the Defx exchange.
 * Useful for scraping and analyzing liquidity pool metrics for users.
 */
export class DefxScraper {
    constructor() {
        this.url = {
            vault: 'https://app.defx.com/liquidity-pools'
        };
    }

    /**
     * @async
     * @method getVaultPerformance
     * @description Fetches the performance metrics for a specific vault by calling `sGetVaultPerformance` with the vault URL.
     * Useful for obtaining analytics and performance data related to the vault.
     * @returns {Promise<Object>} A Promise that resolves to the vault performance data.
     */
    async getVaultPerformance() {
        return sGetVaultPerformance(this.url.vault);
    }
}