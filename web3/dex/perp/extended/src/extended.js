import { createInstance } from '../../../../../utils/src/http.utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetWalletStatus, vmGetWalletBalance, vmGetMarketData, vmGetLatestMarketData, vmGetMarketOrderSize, vmGetFundingRateHour, vmGetMarketOpenInterest, vmGetOpenPositions, vmGetOpenPositionDetail, vmGetOrderStatus } from './view.model.js';
import { wmSubmitOrder } from './write.model.js';
import { EXTENDED_CHAIN_ID } from './constant.js';
import { extendedEnum } from './enum.js';

export { extendedEnum };


export class Extended {
    constructor(_apiKey, _starkKeyPrv, _starkKeyPub, _address, _vaultNr, throttler = { enqueue: fn => fn() }) {
        this.account = {
            address: _address,
            starkKeyPrv: _starkKeyPrv,
            starkKeyPub: _starkKeyPub,
            vaultNr: _vaultNr
        }
        this.instance = createInstance('https://api.extended.exchange/api/v1', { 'X-Api-Key': _apiKey });
        this.chainId = EXTENDED_CHAIN_ID;
        this.throttler = throttler;
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
        return this.throttler.enqueue(() => vmGetOpenPositionDetail(this.instance, _symbol));
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

    async submitOrder(_type, _symbol, _side, _marketUnit, _orderQty) {
        return await this.throttler.enqueue(() => wmSubmitOrder(
            this.instance,
            this.chainId,
            this.account,
            _type,
            _symbol,
            _side,
            _marketUnit,
            _orderQty
        ));
    }

    async test() {
        return this.throttler.enqueue(async () => {
            const response = await this.instance.get('/info/markets');
            return response.data;
        });
    }
}
