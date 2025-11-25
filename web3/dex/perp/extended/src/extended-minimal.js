import { createInstance } from '../../../../../utils/src/http.utils.js';
import { extendedEnum } from './enum.js';
import { MAINNET_API_URL, TESTNET_API_URL } from './constant.js';

export { extendedEnum };

/**
 * @class ExtendedWeb
 * @description Lightweight Extended DEX client for web/serverless environments (Gelato, Lambda, Vercel).
 * Uses ONLY HTTP API endpoints - no Python SDK dependency.
 * For full SDK features (trading, positions), use Extended class instead.
 */
export class ExtendedMinimal {
    /**
     * @constructor
     * @param {Object} config - Configuration object
     * @param {string} config.apiKey - The API key used to authenticate requests
     * @param {Object} [config.throttler={ enqueue: fn => fn() }] - Throttler object to manage API requests
     * @param {string} [config.environment="mainnet"] - Environment: "testnet" or "mainnet"
     */
    constructor(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('ExtendedWeb requires a configuration object');
        }

        if (!config.apiKey) {
            throw new Error('apiKey is required');
        }

        this.environment = config.environment ?? "mainnet";
        this.instance = createInstance(
            this.environment === "mainnet" ? MAINNET_API_URL : TESTNET_API_URL,
            { 'X-Api-Key': config.apiKey }
        );
        this.apiKey = config.apiKey;
        this.throttler = config.throttler ?? { enqueue: fn => fn() };
    }

    /**
     * @async
     * @method getWalletStatus
     * @description Retrieves account information using HTTP API
     * @returns {Promise<Object>} A Promise that resolves with the user's account information or an error response.
     */
    async getWalletStatus() {
        const { vmGetWalletStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWalletStatus(this.instance));
    }

    /**
     * @async
     * @method getOrderStatus
     * @description Retrieves orders using HTTP API
     * @param {string} _orderId - The ID of the order to retrieve the status for (optional - gets all orders if not provided).
     * @returns {Promise<Object>} A Promise that resolves with the response containing the order status data or an error message.
     */
    async getOrderStatus(_orderId) {
        const { vmGetOrderStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOrderStatus(this.instance, _orderId));
    }

    /**
     * @async
     * @method getEarnedPoints
     * @description Retrieves account point earned
     * @returns {Promise<Object>} A Promise that resolves with the response containing account data.
     */
    async getEarnedPoints() {
        const { vmGetEarnedPoints } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetEarnedPoints(this.instance));
    }

    /**
     * @async
     * @method getWithdrawalStatus
     * @description Retrieves withdrawal status using direct HTTP API call.
     * @param {string|number} [_withdrawalId=null] - Specific withdrawal ID to check (when provided, returns only that withdrawal's status)
     * @param {number} [_limit=50] - Maximum number of records to return (only used when no withdrawal ID is specified)
     * @returns {Promise<Object>} A Promise that resolves with withdrawal status data containing transaction details
     */
    async getWithdrawalStatus(_withdrawalId = null, _limit = 50) {
        const { vmGetWithdrawalStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWithdrawalStatus(
            this.instance,
            _withdrawalId,
            _limit
        ));
    }

    /**
     * @async
     * @method getMarketData
     * @description Retrieves market data via HTTP API (limited functionality - use Extended class for full SDK features)
     * @param {string} [_symbol] - The symbol of the market to retrieve data for
     * @returns {Promise<Object>} A Promise that resolves with market data
     */
    async getMarketData(_symbol) {
        const { vmGetMarketDataHttp } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetMarketDataHttp(this.instance, _symbol));
    }

    /**
     * No-op close method for API compatibility with Extended class
     * @public
     */
    async close() {
        // No resources to clean up in web-only mode
    }
}
