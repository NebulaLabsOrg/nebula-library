import { createInstance } from '../../../../../utils/src/http.utils.js';
import { grvtEnum } from './enum.js';
import { 
    wmTransferToTrading,
    wmTransferToFunding,
    wmVaultInvest,
    wmVaultRedeem
} from './write.model.js';
import {
    getBaseUrl,
    getAuthUrl,
    getMarketDataUrl,
    getWebSocketUrl,
    ensureAuthenticated,
    authenticate,
    findPythonPath,
    initPythonService,
    sendCommand
} from './helpers.js';

export { grvtEnum };

/**
 * @class Grvt
 * @description A class for interacting with the Grvt DEX.
 * Provides methods for onboarding, authenticating, trading, and retrieving account and market information using the internal x10-python-trading-starknet SDK.
 * Trade detail: limit orders have post-only and market orders use slippage protection. Close orders use reduce-only.
 * 
 * Funding Account: The funding account is used for deposits, withdrawals, and transfers to/from the trading account. It holds the main wallet funds.
 * Trading Account: The trading account is the Starknet-based account used for placing orders, managing positions, and trading on the DEX. It requires an account ID for identification.
 */
export class Grvt {
    /**
     * @constructor
     * @param {Object} config - Configuration object
     * @param {Object} config.funding - Funding account credentials
     * @param {string} config.funding.address - Funding wallet address
     * @param {string} config.funding.privateKey - Funding private key
     * @param {string} config.funding.apiKey - Funding API key
     * @param {Object} config.trading - Trading account credentials
     * @param {string} config.trading.address - Trading wallet address
     * @param {string} config.trading.accountId - Trading account ID (decimal/hex)
     * @param {string} config.trading.privateKey - Trading private key
     * @param {string} config.trading.apiKey - Trading API key
     * @param {number} [config.slippage=0.5] - Default slippage percent
     * @param {Object} [config.throttler=null] - Optional throttler instance
     * @param {string} [config.environment="testnet"] - Environment (mainnet/testnet/staging)
     * @param {boolean} [config.usePython=true] - Enable Python SDK
     */
    constructor(config) {
        // Validate funding account
        if (!config.funding?.address) throw new Error('funding.address is required');
        if (!config.funding?.privateKey) throw new Error('funding.privateKey is required');
        if (!config.funding?.apiKey) throw new Error('funding.apiKey is required');
        
        // Validate trading account
        if (!config.trading?.address) throw new Error('trading.address is required');
        if (!config.trading?.accountId) throw new Error('trading.accountId is required');
        if (!config.trading?.privateKey) throw new Error('trading.privateKey is required');
        if (!config.trading?.apiKey) throw new Error('trading.apiKey is required');
        
        // Store funding credentials
        this.funding = {
            address: config.funding.address,
            privateKey: config.funding.privateKey,
            apiKey: config.funding.apiKey
        };
        
        // Store trading credentials
        this.trading = {
            address: config.trading.address,
            accountId: config.trading.accountId,
            privateKey: config.trading.privateKey,
            apiKey: config.trading.apiKey
        };
        
        this.slippage = config.slippage ?? 0.5;
        this.throttler = config.throttler ?? { enqueue: fn => fn() };
        this.environment = config.environment ?? 'mainnet';
        this.usePython = config.usePython ?? false; // Default false - most ops use HTTP API
        this.pythonPath = 'python3'; // Default, will be updated in _initPythonService
        
        // Authentication state for trading account
        this.trading.sessionCookie = null;
        this.trading.authenticated = false;
        this.trading.authPromise = null;
        
        // Authentication state for funding account
        this.funding.sessionCookie = null;
        this.funding.authenticated = false;
        this.funding.authPromise = null;
        
        // Backward compatibility (uses trading by default)
        this.sessionCookie = null;
        this.accountId = null;
        this.authenticated = false;
        this.authPromise = null;
        
        const baseUrl = getBaseUrl(this.environment);
        
        // Initialize HTTP instance for Trading API with trading account
        // Used for: positions, orders (requires trading auth)
        this.tradingInstance = createInstance(baseUrl, {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': baseUrl,
            'Referer': baseUrl + '/'
        });
        
        // Initialize HTTP instance for Trading API with funding account
        // Used for: withdrawals, transfers (requires funding auth)
        this.fundingInstance = createInstance(baseUrl, {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': baseUrl,
            'Referer': baseUrl + '/'
        });
        
        // Alias for backward compatibility (uses trading by default)
        this.instance = this.tradingInstance;
        
        // Initialize HTTP instance for Market Data API (market-data.grvt.io)
        // Used for: instruments, ticker, orderbook, candles (public, no auth)
        const marketDataUrl = getMarketDataUrl(this.environment);
        this.marketDataInstance = createInstance(marketDataUrl, {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        this.pythonService = null;
        
        // WebSocket URL based on environment
        this.wsUrl = getWebSocketUrl(this.environment);
        
        // Start authentication for trading account
        this.trading.authPromise = authenticate(
            this.environment,
            this.trading.apiKey,
            this.trading.accountId,
            this.tradingInstance
        ).then(result => {
            this.trading.sessionCookie = result.sessionCookie;
            // DON'T overwrite trading.accountId - keep the original numeric sub_account_id from config
            // result.accountId contains the API key, not the numeric account ID
            this.trading.authenticated = result.authenticated;
            // Backward compatibility
            this.sessionCookie = result.sessionCookie;
            this.accountId = result.accountId; // This may contain API key for legacy code
            this.authenticated = result.authenticated;
            this.authPromise = null; // Mark as complete
        }).catch(error => {
            console.error('Failed to authenticate trading account:', error);
            throw error;
        });
        
        // Start authentication for funding account
        this.funding.authPromise = authenticate(
            this.environment,
            this.funding.apiKey,
            null, // Funding doesn't need accountId for auth
            this.fundingInstance
        ).then(result => {
            this.funding.sessionCookie = result.sessionCookie;
            this.funding.authenticated = result.authenticated;
        }).catch(error => {
            console.error('Failed to authenticate funding account:', error);
            throw error;
        });
        
        if (this.usePython) {
            // Initialize Python service asynchronously
            findPythonPath().then(pythonPath => {
                this.pythonPath = pythonPath;
                return initPythonService(pythonPath);
            }).then(service => {
                this.pythonService = service;
            }).catch(error => {
                console.error('Failed to initialize Python service:', error);
            });
        }
    }
    
    /**
     * Send command to Python SDK
     * Wrapper for sendCommand from helpers.js with credential injection
     * @param {string} command - Command name
     * @param {Object} [params={}] - Command parameters
     * @returns {Promise<Object>} Command result
     */
    async _sendCommand(command, params = {}) {
        // Inject credentials into params
        const enrichedParams = {
            ...params,
            // For trading operations, use trading credentials
            trading_api_key: this.trading.apiKey,
            trading_private_key: this.trading.privateKey,
            trading_account_id: this.trading.accountId,
            trading_address: this.trading.address,
            // For funding/transfer operations, use funding credentials
            funding_api_key: this.funding.apiKey,
            funding_private_key: this.funding.privateKey,
            funding_address: this.funding.address,
            environment: this.environment
        };
        
        return sendCommand(this.pythonService, command, enrichedParams);
    }
    
    /**
     * Close Python service
     */
    close() {
        if (this.pythonService) {
            this.pythonService.kill();
            this.pythonService = null;
        }
    }
    
    // ========================
    // VIEW METHODS (READ ONLY)
    // ========================
    
    /**
     * Get wallet status
     * @returns {Promise<Object>} Wallet status response
     */
    async getWalletStatus() {
        return this.throttler.enqueue(async () => {
            // Wait for trading authentication to complete
            if (this.trading.authPromise) {
                await this.trading.authPromise;
            }
            const { vmGetWalletStatus } = await import('./view.model.js');
            return vmGetWalletStatus(this.instance, this.trading.accountId);
        }, 3);
    }
    
    /**
     * Get wallet balance
     * @returns {Promise<Object>} Wallet balance response
     */
    async getWalletBalance() {
        if (this.trading.authPromise) {
            await this.trading.authPromise;
        }
        const { vmGetWalletBalance } = await import('./view.model.js');
        return vmGetWalletBalance(this.instance);
    }
    
    /**
     * Get market data
     * @param {string} [symbol=''] - Optional symbol filter
     * @returns {Promise<Object>} Market data response
     */
    async getMarketData(symbol = '') {
        const { vmGetMarketData } = await import('./view.model.js');
        return vmGetMarketData(this.marketDataInstance, symbol);
    }

    /**
     * Get market data prices (real-time ticker data)
     * @param {string} symbol - Market symbol
     * @returns {Promise<Object>} Real-time price data response
     */
    async getMarketDataPrices(symbol) {
        const { vmGetMarketDataPrices } = await import('./view.model.js');
        return vmGetMarketDataPrices(this.marketDataInstance, symbol);
    }

    /**
     * Get market order size
     * @param {string} symbol - Market symbol
     * @returns {Promise<Object>} Market order size response
     */
    async getMarketOrderSize(symbol) {
        const { vmGetMarketOrderSize } = await import('./view.model.js');
        return vmGetMarketOrderSize(this.marketDataInstance, symbol);
    }

    /**
     * Get funding rate hour
     * @param {string} symbol - Market symbol
     * @returns {Promise<Object>} Funding rate response
     */
    async getFundingRateHour(symbol) {
        const { vmGetFundingRateHour } = await import('./view.model.js');
        return vmGetFundingRateHour(this.marketDataInstance, symbol);
    }

    /**
     * Get market open interest
     * @param {string} symbol - Market symbol
     * @returns {Promise<Object>} Market open interest response
     */
    async getMarketOpenInterest(symbol) {
        const { vmGetMarketOpenInterest } = await import('./view.model.js');
        return vmGetMarketOpenInterest(this.marketDataInstance, symbol);
    }

    /**
     * Get open positions
     * @returns {Promise<Object>} Open positions response
     */
    async getOpenPositions() {
        if (this.trading.authPromise) {
            await this.trading.authPromise;
        }
        const { vmGetOpenPositions } = await import('./view.model.js');
        return vmGetOpenPositions(this.instance, this.trading.accountId);
    }
    
    /**
     * Get open position detail
     * @param {string} symbol - Market symbol
     * @returns {Promise<Object>} Position detail response
     */
    async getOpenPositionDetail(symbol) {
        if (this.trading.authPromise) {
            await this.trading.authPromise;
        }
        const { vmGetOpenPositionDetail } = await import('./view.model.js');
        return vmGetOpenPositionDetail(this.instance, this.trading.accountId, symbol);
    }
    
    /**
     * Get order status by client order ID (HTTP API)
     * @param {string} clientOrderId - Client order ID
     * @returns {Promise<Object>} Order status response
     */
    async getOrderStatusById(clientOrderId) {
        if (this.trading.authPromise) {
            await this.trading.authPromise;
        }
        
        const { vmGetOrderStatusById } = await import('./view.model.js');
        return vmGetOrderStatusById(this.instance, this.trading.accountId, clientOrderId);
    }
    
    
    // =========================
    // WRITE METHODS (SDK CALLS)
    // =========================
    
    /**
     * Submit order
     * @param {string} type - Order type (MARKET or LIMIT)
     * @param {string} symbol - Market symbol
     * @param {string} side - Order side (BUY or SELL)
     * @param {string} marketUnit - Market unit (main or secondary)
     * @param {number|string} orderQty - Order quantity
     * @param {Function} [onOrderUpdate] - Optional callback for order status updates
     * @param {number} [retry=0] - Number of retry attempts if order is REJECTED
     * @param {number} [timeout=60000] - Maximum timeout in milliseconds (resets when qtyExe changes)
     * @returns {Promise<Object>} Order submission response with monitoring
     */
    async submitOrder(type, symbol, side, marketUnit, orderQty, onOrderUpdate, retry = 0, timeout = 60000) {
        const { wmSubmitOrder } = await import('./write.model.js');
        return wmSubmitOrder(this, this.slippage, type, symbol, side, marketUnit, orderQty, onOrderUpdate, retry, timeout);
    }
    
    /**
     * Submit cancel order
     * @param {string} externalId - Order ID to cancel
     * @param {number} [retry=0] - Number of retry attempts if cancel fails
     * @returns {Promise<Object>} Cancel confirmation response
     */
    async submitCancelOrder(externalId, retry = 0) {
        const { wmSubmitCancelOrder } = await import('./write.model.js');
        return wmSubmitCancelOrder(this, externalId, retry);
    }
    
    /**
     * Submit close order with automatic monitoring
     * @param {string} type - Order type
     * @param {string} symbol - Market symbol
     * @param {string} marketUnit - Market unit
     * @param {number} orderQty - Quantity
     * @param {boolean} [closeAll=false] - Close entire position
     * @param {Function} [onOrderUpdate=null] - Optional callback for order status updates
     * @param {number} [retry=0] - Number of retry attempts if order is REJECTED
     * @param {number} [timeout=60000] - Maximum timeout in milliseconds (resets when qtyExe changes)
     * @returns {Promise<Object>} Close order response with final status
     */
    async submitCloseOrder(type, symbol, marketUnit, orderQty, closeAll = false, onOrderUpdate = null, retry = 0, timeout = 60000) {
        const { wmSubmitCloseOrder } = await import('./write.model.js');
        return wmSubmitCloseOrder(this, this.slippage, type, symbol, marketUnit, orderQty, closeAll, onOrderUpdate, retry, timeout);
    }
    
    /**
     * Transfer funds from Funding to Trading account
     * @param {string|number} amount - Amount to transfer
     * @param {string} [currency='USDC'] - Currency
     * @returns {Promise<Object>} Transfer response
     */
    async transferToTrading(amount, currency = 'USDC') {
        return wmTransferToTrading(this, amount, currency);
    }
    
    /**
     * Transfer funds from Trading to Funding account (before withdrawal)
     * @param {string|number} amount - Amount to transfer
     * @param {string} [currency='USDC'] - Currency
     * @returns {Promise<Object>} Transfer response
     */
    async transferToFunding(amount, currency = 'USDC') {
        return wmTransferToFunding(this, amount, currency);
    }
    
    /**
     * Invest funds in a vault
     * @param {string} vaultId - Vault ID to invest in
     * @param {string|number} amount - Amount to invest
     * @param {string} [currency='USDC'] - Currency
     * @returns {Promise<Object>} Investment response
     */
    async vaultInvest(vaultId, amount, currency = 'USDC') {
        return wmVaultInvest(this, vaultId, amount, currency);
    }
    
    /**
     * Redeem LP tokens from a vault
     * @param {string} vaultId - Vault ID to redeem from
     * @param {string|number} amount - Amount of LP tokens to redeem
     * @param {string} [currency='USDC'] - Currency
     * @returns {Promise<Object>} Redemption response
     */
    async vaultRedeem(vaultId, amount, currency = 'USDC') {
        return wmVaultRedeem(this, vaultId, amount, currency);
    }
}