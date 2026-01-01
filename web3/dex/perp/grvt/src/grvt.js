import { createInstance } from '../../../../../utils/src/http.utils.js';
import { grvtEnum } from './enum.js';
import { vmGetTransferHistory } from './view.model.js';
import { 
    wmSubmitOrder,
    wmSubmitCancelOrder,
    wmSubmitCloseOrder,
    wmSubmitWithdrawal,
    wmCancelAllOrders,
    wmTransferToTrading,
    wmTransferToFunding
} from './write.model.js';
import {
    getBaseUrl,
    getAuthUrl,
    getMarketDataUrl,
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
        
        // Authentication state
        this.sessionCookie = null;
        this.accountId = null;
        this.authenticated = false;
        this.authPromise = null; // Store authentication promise
        
        // Initialize HTTP instance for API calls
        const baseUrl = getBaseUrl(this.environment);
        this.instance = createInstance(baseUrl, {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Origin': baseUrl,
            'Referer': baseUrl + '/'
        });
        
        this.pythonService = null;
        
        // Start authentication (store promise)
        this.authPromise = authenticate(
            this.environment,
            this.trading.apiKey,
            this.trading.accountId,
            this.instance
        ).then(result => {
            this.sessionCookie = result.sessionCookie;
            this.accountId = result.accountId;
            this.authenticated = result.authenticated;
        }).catch(error => {
            console.error('Failed to authenticate:', error);
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
            await ensureAuthenticated(this);
            const { vmGetWalletStatus } = await import('./view.model.js');
            return vmGetWalletStatus(this.instance, this.trading.accountId);
        }, 3);
    }
    
    /**
     * Get wallet balance
     * @returns {Promise<Object>} Wallet balance response
     */
    async getWalletBalance() {
        await ensureAuthenticated(this);
        const { vmGetWalletBalance } = await import('./view.model.js');
        return vmGetWalletBalance(this.instance);
    }
    
    /**
     * Get market data
     * @param {string} [symbol=''] - Optional symbol filter
     * @returns {Promise<Object>} Market data response
     */
    async getMarketData(symbol = '') {
        await ensureAuthenticated(this);
        const { vmGetMarketData } = await import('./view.model.js');
        return vmGetMarketData(this, symbol);
    }
    
    /**
     * Get open positions
     * @returns {Promise<Object>} Open positions response
     */
    async getOpenPositions() {
        await ensureAuthenticated(this);
        const { vmGetOpenPositions } = await import('./view.model.js');
        return vmGetOpenPositions(this);
    }
    
    /**
     * Get open position detail
     * @param {string} symbol - Market symbol
     * @returns {Promise<Object>} Position detail response
     */
    async getOpenPositionDetail(symbol) {
        await ensureAuthenticated(this);
        const { vmGetOpenPositionDetail } = await import('./view.model.js');
        return vmGetOpenPositionDetail(this, symbol);
    }
    
    /**
     * Get order status
     * @param {string} orderId - Order ID
     * @returns {Promise<Object>} Order status response
     */
    async getOrderStatus(orderId) {
        await ensureAuthenticated(this);
        const { vmGetOrderStatus } = await import('./view.model.js');
        return vmGetOrderStatus(this.instance, orderId);
    }
    
    /**
     * Get order history
     * @param {string} [symbol=''] - Optional symbol filter
     * @param {number} [limit=50] - Limit number of orders
     * @returns {Promise<Object>} Order history response
     */
    async getOrderHistory(symbol = '', limit = 50) {
        await ensureAuthenticated(this);
        const { vmGetOrderHistory } = await import('./view.model.js');
        return vmGetOrderHistory(this, symbol, limit);
    }
    
    /**
     * Get account info
     * @returns {Promise<Object>} Account info response
     */
    async getAccountInfo() {
        await ensureAuthenticated(this);
        const { vmGetAccountInfo } = await import('./view.model.js');
        return vmGetAccountInfo(this);
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
     * @returns {Promise<Object>} Order submission response
     */
    async submitOrder(type, symbol, side, marketUnit, orderQty) {
        const { wmSubmitOrder } = await import('./write.model.js');
        return wmSubmitOrder(this, this.slippage, type, symbol, side, marketUnit, orderQty);
    }
    
    /**
     * Submit cancel order
     * @param {string} externalId - Order ID to cancel
     * @returns {Promise<Object>} Cancel confirmation response
     */
    async submitCancelOrder(externalId) {
        const { wmSubmitCancelOrder } = await import('./write.model.js');
        return wmSubmitCancelOrder(this, externalId);
    }
    
    /**
     * Submit close order
     * @param {string} type - Order type
     * @param {string} symbol - Market symbol
     * @param {string} marketUnit - Market unit
     * @param {number} orderQty - Quantity
     * @param {boolean} [closeAll=false] - Close entire position
     * @returns {Promise<Object>} Close order response
     */
    async submitCloseOrder(type, symbol, marketUnit, orderQty, closeAll = false) {
        const { wmSubmitCloseOrder } = await import('./write.model.js');
        return wmSubmitCloseOrder(this, this.slippage, type, symbol, marketUnit, orderQty, closeAll);
    }
    
    /**
     * Submit withdrawal
     * @param {string} amount - Withdrawal amount
     * @param {string} [starkAddress=null] - Recipient address
     * @returns {Promise<Object>} Withdrawal response
     */
    async submitWithdrawal(amount, starkAddress = null) {
        return wmSubmitWithdrawal(this, amount, 'USDC', 'STRK', starkAddress);
    }
    
    /**
     * Cancel all orders
     * @param {string} [symbol=null] - Optional symbol to cancel orders for specific market
     * @returns {Promise<Object>} Cancel all response
     */
    async cancelAllOrders(symbol = null) {
        return wmCancelAllOrders(this, symbol);
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
     * Get transfer history
     * @param {number} [limit=50] - Max records
     * @param {string} [cursor=null] - Pagination cursor
     * @returns {Promise<Object>} Transfer history response
     */
    async getTransferHistory(limit = 50, cursor = null) {
        return vmGetTransferHistory(this, limit, cursor);
    }
}