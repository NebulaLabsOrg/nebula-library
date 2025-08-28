import { sGetVaultPerformance } from './scrape.model.js';


/**
 * @class ExtendedScraper
 * @description A class for scraping data from the Extended exchange.
 * Provides methods to retrieve vault performance data from the Extended exchange.
 * Useful for scraping and analyzing vault-related metrics for users.
 */
export class ExtendedScraper {
    constructor() {
        this.url = {
            vault: 'https://app.extended.exchange/vault'
        };
    }

    /**
     * @async
     * @method getVaultPerformance
     * @description Retrieves the performance metrics of the vault using the provided vault URL.
     * Calls `sGetVaultPerformance` with the vault URL to fetch relevant data.
     * @returns {Promise<Object>} A Promise that resolves with the vault performance data or an error response.
     */
    async getVaultPerformance() {
        return sGetVaultPerformance(this.url.vault);
    }
}
