import { createInstance } from '../../../../../utils/src/http.utils.js';
import { 
    vmGetWalletStatus, vmGetWalletBalance, vmGetMarketData, vmGetLatestMarketData, vmGetMarketOrderSize,
    vmGetFundingRateHour, vmGetMarketOpenInterest, vmGetOpenPositions, vmGetOpenPositionDetail, vmGetOrderStatus,
    vmGetEarnedPoints
} from './view.model.js';
import { wmSubmitOrder, wmSubmitCancelOrder, wmSubmitCloseOrder } from './write.model.js';
import { extendedEnum } from './enum.js';

export { extendedEnum };


/**
 * @class Extended
 * @description A class for interacting with the Extended exchange API.
 * Provides methods for onboarding, authenticating, retrieving account information, market data, balances, open positions, order management, and more for users.
 * Utilizza un throttler per gestire la frequenza delle richieste e offre un'interfaccia estesa per operazioni di trading e gestione dell'account.
 */
export class Extended {
    /**
     * @constructor
     * @param {string} _apiKey - The API key used to authenticate requests to the Extended exchange.
     * @param {string} _starkKeyPrv - The user's private Stark key for signing transactions.
     * @param {string} _starkKeyPub - The user's public Stark key for identification.
     * @param {string} _address - The user's wallet address.
     * @param {number} _vaultNr - The vault number associated with the user's account.
     * @param {number} [_slippage=0.1] - Maximum allowed slippage for trades, as a decimal (e.g., 0.1 for 10%).
     * @param {Object} [_throttler={ enqueue: fn => fn() }] - Throttler object to manage and queue API requests.
     */
    constructor(_apiKey, _starkKeyPrv, _starkKeyPub, _address, _vaultNr, _slippage = 0.1, _throttler = { enqueue: fn => fn() }) {
        this.account = {
            address: _address,
            starkKeyPrv: _starkKeyPrv,
            starkKeyPub: _starkKeyPub,
            vaultNr: _vaultNr
        }
        this.instance = createInstance('https://api.extended.exchange/api/v1', { 'X-Api-Key': _apiKey });
        this.slippage = _slippage
        this.throttler = _throttler;
    }

    /**
     * @async
     * @method getWalletStatus
     * @description Authenticates the user and retrieves their account information from Paradex.
     * Utilizes a throttler to manage request rate and calls `vmGetWalletStatus` with the current instance.
     * @returns {Promise<Object>} A Promise that resolves with the user's account information or an error response.
     */
    async getWalletStatus() {
        return this.throttler.enqueue(() => vmGetWalletStatus(this.instance));
    }

    /**
     * Retrieves the wallet balance for the current instance.
     *
     * This function uses a throttler to enqueue the balance retrieval operation,
     * ensuring that requests are rate-limited as needed. It fetches the wallet balance
     * associated with the current instance.
     *
     * @async
     * @method getWalletBalance
     * @returns {Promise<Object>} A promise that resolves to the wallet balance object.
     */
    async getWalletBalance() {
        return this.throttler.enqueue(() => vmGetWalletBalance(this.instance));
    }

    /**
     * Retrieves market data for a specific symbol.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the market data.
     * 
     * @async
     * @method getMarketData
     * @param {string} _symbol - The symbol of the market to retrieve data for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the market data or an error message.
     * 
     * For latest market data, use getLatestMarketData.
     */
    async getMarketData(_symbol) {
        return this.throttler.enqueue(() => vmGetMarketData(this.instance, _symbol));
    }

    /**
     * Retrieves the latest market data for a specific symbol.
     * Uses a throttler to enqueue the request and calls the underlying function to fetch the market data.
     *
     * @async
     * @method getLatestMarketData
     * @param {string} _symbol - The symbol of the market to retrieve the latest data for.
     * @returns {Promise<Object>} A Promise that resolves with the latest market data or an error message.
     */
    async getLatestMarketData(_symbol) {
        return this.throttler.enqueue(() => vmGetLatestMarketData(this.instance, _symbol));
    }

    /**
     * Retrieves the market order size for a given symbol.
     *
     * @async
     * @method getMarketOrderSize
     * @param {string} _symbol - The symbol of the market to query.
     * @returns {Promise<*>} A Promise that resolves to the market order size for the specified symbol.
     */
    async getMarketOrderSize(_symbol) {
        return this.throttler.enqueue(() => vmGetMarketOrderSize(this.instance, _symbol));
    }

    /**
     * Retrieves the funding rate per hour for a specific symbol.
     * Executes the request through a throttler to manage rate limits and calls the underlying function to fetch the funding rate.
     *
     * @async
     * @method getFundingRateHour
     * @param {string} _symbol - The symbol of the market to retrieve the funding rate for.
     * @returns {Promise<Object>} A Promise that resolves with the funding rate data for the specified symbol.
     */
    async getFundingRateHour(_symbol) {
        return this.throttler.enqueue(() => vmGetFundingRateHour(this.instance, _symbol));
    }

    /**
     * Retrieves the open interest for a specific market symbol.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the market open interest.
     * 
     * @async
     * @method getMarketOpenInterest
     * @param {string} _symbol - The symbol of the market to retrieve the open interest for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open interest data or an error message.
     */
    async getMarketOpenInterest(_symbol) {
        return this.throttler.enqueue(() => vmGetMarketOpenInterest(this.instance, _symbol));
    }

    /**
     * Retrieves the open positions for the authenticated user.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the user's open positions.
     * 
     * @async
     * @method getOpenPositions
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open positions data or an error message.
     */
    async getOpenPositions() {
        return this.throttler.enqueue(() => vmGetOpenPositions(this.instance));
    }

    /**
     * Retrieves the status of a position for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the position status for the specified symbol.
     *
     * @async
     * @method getOpenPositionDetail
     * @param {string} _symbol - The symbol of the position to retrieve the status for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the position status data or an error message.
     */
    async getOpenPositionDetail(_symbol) {
        return this.throttler.enqueue(() => vmGetOpenPositionDetail(this.instance, _symbol), 2);
    }

    /**
     * Retrieves the status of an order for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the order status for the specified order ID.
     * 
     * @async
     * @method getOrderStatus
     * @param {string} _orderId - The ID of the order to retrieve the status for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the order status data or an error message.
     */
    async getOrderStatus(_orderId) {
        return this.throttler.enqueue(() => vmGetOrderStatus(this.instance, _orderId));
    }

    /**
     * Retrieves the earned points for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the earned points.
     *
     * @async
     * @method getEarnedPoints
     * @returns {Promise<Object>} A Promise that resolves with the response containing the earned points data or an error message.
     */
    async getEarnedPoints() {
        return this.throttler.enqueue(() => vmGetEarnedPoints(this.instance));
    }

    /**
     * Submits a new order to the trading system with specified parameters.
     * Utilizes a throttler to limit the rate of order submissions and calls the underlying order submission function.
     *
     * @async
     * @method submitOrder
     * @param {string} _type - The type of the order (e.g., 'limit', 'market').
     * @param {string} _symbol - The trading symbol for the order (e.g., 'BTCUSD').
     * @param {string} _side - The side of the order ('buy' or 'sell').
     * @param {string} _marketUnit - The market unit for the order (e.g., 'contracts', 'coins').
     * @param {number} _orderQty - The quantity for the order.
     * @returns {Promise<Object>} A Promise that resolves with the result of the order submission.
     */
    async submitOrder(_type, _symbol, _side, _marketUnit, _orderQty) {
        return await this.throttler.enqueue(() => wmSubmitOrder(
            this.instance,
            this.slippage,
            this.account,
            _type,
            _symbol,
            _side,
            _marketUnit,
            _orderQty
        ), 5);
    }

    /**
     * Cancella un ordine esistente nel sistema di trading utilizzando l'ID specificato.
     * Utilizza un throttler per limitare la frequenza delle richieste di cancellazione e invoca la funzione sottostante per la cancellazione dell'ordine.
     *
     * @async
     * @method submitCancelOrder
     * @param {string} _orderId - L'ID dell'ordine da cancellare.
     * @returns {Promise<Object>} Una Promise che si risolve con il risultato della cancellazione dell'ordine.
     */
    async submitCancelOrder(_orderId) {
        return this.throttler.enqueue(() => wmSubmitCancelOrder(this.instance, _orderId));
    }

    /**
     * Submits a close order to the trading system with the specified parameters.
     * Uses a throttler to control the rate of close order submissions and invokes the underlying close order function.
     *
     * @async
     * @method submitCloseOrder
     * @param {string} _type - The type of the close order (e.g., 'limit', 'market').
     * @param {string} _symbol - The trading symbol for the close order (e.g., 'BTCUSD').
     * @param {number} _orderQty - The quantity to close.
     * @param {string} _marketUnit - The market unit for the close order (e.g., 'contracts', 'coins').
     * @param {boolean} [_closeAll=false] - Whether to close all positions for the given symbol.
     * @returns {Promise<Object>} A Promise that resolves with the result of the close order submission.
     */
    async submitCloseOrder(_type, _symbol, _orderQty, _marketUnit, _closeAll = false) {
        return this.throttler.enqueue(() => wmSubmitCloseOrder(
            this.instance,
            this.slippage,
            this.account,
            _type,
            _symbol,
            _orderQty,
            _marketUnit,
            _closeAll
        ), 6);
    }
}