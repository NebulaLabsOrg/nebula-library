import { createInstance } from '../../../../../utils/src/http.utils.js';
import { grvtEnum } from './enum.js';
import {
    getBaseUrl,
    getMarketDataUrl,
    authenticate
} from './helpers.js';

export { grvtEnum };

/**
 * @class GrvtMinimal
 * @description Lightweight GRVT DEX client for web/serverless environments (Gelato, Lambda, Vercel).
 * Uses ONLY HTTP API endpoints - no Python SDK dependency.
 * For full SDK features (trading with orders, transfers), use Grvt class instead.
 * 
 * This minimal version provides:
 * - Wallet status and balance queries
 * - Market data (prices, orderbook, funding rates, etc.)
 * - Position monitoring
 * - Order status checking
 * - Transfer status verification
 * 
 * Not included (requires Python SDK in full Grvt class):
 * - Order submission (market/limit)
 * - Order cancellation
 * - Fund transfers between accounts
 */
export class GrvtMinimal {
    /**
     * @constructor
     * @param {Object} config - Configuration object
     * @param {string} config.apiKey - Trading API key for authentication
     * @param {string} config.accountId - Trading account ID (sub_account_id)
     * @param {Object} [config.throttler={ enqueue: fn => fn() }] - Throttler object to manage API requests
     */
    constructor(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('GrvtMinimal requires a configuration object');
        }

        if (!config.apiKey) {
            throw new Error('apiKey is required');
        }

        if (!config.accountId) {
            throw new Error('accountId is required');
        }

        this.environment = "mainnet"; // Fixed to mainnet
        this.apiKey = config.apiKey;
        this.accountId = config.accountId;
        this.throttler = config.throttler ?? { enqueue: fn => fn() };
        
        // Authentication state
        this.sessionCookie = null;
        this.authenticated = false;
        this.authPromise = null;

        const baseUrl = getBaseUrl(this.environment);
        
        // Initialize HTTP instance for Trading API
        this.instance = createInstance(baseUrl, {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': baseUrl,
            'Referer': baseUrl + '/'
        });
        
        // Initialize HTTP instance for Market Data API
        const marketDataUrl = getMarketDataUrl(this.environment);
        this.marketDataInstance = createInstance(marketDataUrl, {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        // Start authentication
        this.authPromise = authenticate(
            this.environment,
            this.apiKey,
            this.accountId,
            this.instance
        ).then(result => {
            this.sessionCookie = result.sessionCookie;
            this.authenticated = result.authenticated;
            this.authPromise = null;
        }).catch(error => {
            console.error('Failed to authenticate:', error);
            throw error;
        });
    }

    // ========================
    // VIEW METHODS (READ ONLY)
    // ========================

    /**
     * @async
     * @method getWalletStatus
     * @description Get wallet status including balances and account info
     * @returns {Promise<Object>} Wallet status response
     */
    async getWalletStatus() {
        return this.throttler.enqueue(async () => {
            if (this.authPromise) {
                await this.authPromise;
            }
            const { vmGetWalletStatus } = await import('./view.model.js');
            return vmGetWalletStatus(this.instance, this.accountId);
        });
    }

    /**
     * @async
     * @method getWalletBalance
     * @description Get wallet balance with detailed breakdown
     * @returns {Promise<Object>} Wallet balance response
     */
    async getWalletBalance() {
        return this.throttler.enqueue(async () => {
            if (this.authPromise) {
                await this.authPromise;
            }
            const { vmGetWalletBalance } = await import('./view.model.js');
            return vmGetWalletBalance(this.instance);
        }, 2);
    }

    /**
     * @async
     * @method getMarketData
     * @description Get market data for instruments
     * @param {string} [symbol=''] - Optional symbol filter
     * @returns {Promise<Object>} Market data response
     */
    async getMarketData(_symbol = '') {
        return this.throttler.enqueue(async () => {
            const { vmGetMarketData } = await import('./view.model.js');
            return vmGetMarketData(this.marketDataInstance, _symbol);
        });
    }

    /**
     * @async
     * @method getMarketDataPrices
     * @description Get real-time market prices (ticker data)
     * @param {string} _symbol - Market symbol
     * @returns {Promise<Object>} Real-time price data response
     */
    async getMarketDataPrices(_symbol) {
        return this.throttler.enqueue(async () => {
            const { vmGetMarketDataPrices } = await import('./view.model.js');
            return vmGetMarketDataPrices(this.marketDataInstance, _symbol);
        });
    }

    /**
     * @async
     * @method getMarketOrderSize
     * @description Get market order size configuration (min/max, step sizes)
     * @param {string} _symbol - Market symbol
     * @returns {Promise<Object>} Market order size response
     */
    async getMarketOrderSize(_symbol) {
        return this.throttler.enqueue(async () => {
            const { vmGetMarketOrderSize } = await import('./view.model.js');
            return vmGetMarketOrderSize(this.marketDataInstance, _symbol);
        }, 2);
    }

    /**
     * @async
     * @method getFundingRateHour
     * @description Get funding rate for a market
     * @param {string} _symbol - Market symbol
     * @returns {Promise<Object>} Funding rate response
     */
    async getFundingRateHour(_symbol) {
        return this.throttler.enqueue(async () => {
            const { vmGetFundingRateHour } = await import('./view.model.js');
            return vmGetFundingRateHour(this.marketDataInstance, _symbol);
        });
    }

    /**
     * @async
     * @method getMarketOpenInterest
     * @description Get market open interest
     * @param {string} _symbol - Market symbol
     * @returns {Promise<Object>} Market open interest response
     */
    async getMarketOpenInterest(_symbol) {
        return this.throttler.enqueue(async () => {
            const { vmGetMarketOpenInterest } = await import('./view.model.js');
            return vmGetMarketOpenInterest(this.marketDataInstance, _symbol);
        });
    }

    /**
     * @async
     * @method getOpenPositions
     * @description Get all open positions
     * @returns {Promise<Object>} Open positions response
     */
    async getOpenPositions() {
        return this.throttler.enqueue(async () => {
            if (this.authPromise) {
                await this.authPromise;
            }
            const { vmGetOpenPositions } = await import('./view.model.js');
            return vmGetOpenPositions(this.instance, this.accountId);
        }, 2);
    }

    /**
     * @async
     * @method getOpenPositionDetail
     * @description Get detailed information for a specific open position
     * @param {string} _symbol - Market symbol
     * @returns {Promise<Object>} Position detail response
     */
    async getOpenPositionDetail(_symbol) {
        return this.throttler.enqueue(async () => {
            if (this.authPromise) {
                await this.authPromise;
            }
            const { vmGetOpenPositionDetail } = await import('./view.model.js');
            return vmGetOpenPositionDetail(this.instance, this.accountId, _symbol);
        }, 2);
    }

    /**
     * @async
     * @method getOrderStatusById
     * @description Get order status by client order ID
     * @param {string} _clientOrderId - Client order ID
     * @returns {Promise<Object>} Order status response
     */
    async getOrderStatusById(_clientOrderId) {
        return this.throttler.enqueue(async () => {
            if (this.authPromise) {
                await this.authPromise;
            }
            const { vmGetOrderStatusById } = await import('./view.model.js');
            return vmGetOrderStatusById(this.instance, this.accountId, _clientOrderId);
        }, 2);
    }

    /**
     * @async
     * @method getTransferStatusByTxId
     * @description Get transfer status by transaction ID
     * @param {string} _transferId - Transfer transaction ID
     * @param {string} [_currency='USDT'] - Currency to filter
     * @returns {Promise<Object>} Transfer status response
     */
    async getTransferStatusByTxId(_transferId, _currency = 'USDT') {
        return this.throttler.enqueue(async () => {
            if (this.authPromise) {
                await this.authPromise;
            }
            const { vmGetTransferStatusByTxId } = await import('./view.model.js');
            return vmGetTransferStatusByTxId(this.instance, _transferId, _currency);
        }, 2);
    }
}
