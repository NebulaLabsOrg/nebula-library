import { createInstance } from '../../../../../utils/src/http.utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetWalletStatus, vmGetWalletBalance, vmGetMarketData, vmGetLatestMarketData, vmGetMarketOrderSize, vmGetFundingRateHour, vmGetMarketOpenInterest, vmGetOpenPositions, vmGetOpenPositionDetail, vmGetOrderStatus } from './viewModel.js';
import { extendedEnum } from './enum.js';

export { extendedEnum };

/**
 * @class Extended
 * @description A class for interacting with the Extended Exchange API.
 * @param {string} _apiKey - The API key used for authenticating requests to the Extended Exchange API.
 */
export class Extended {
    constructor(_apiKey) {
        this.instance = createInstance('https://api.extended.exchange/api/v1', { 'X-Api-Key': _apiKey } )
    }

    /**
     * @async
     * @method getWalletStatus
     * @description Retrieves the current status of the connected wallet instance.
     * @returns {Promise<Object>} A Promise that resolves with the wallet status information.
     */
    async getWalletStatus() {
        return await vmGetWalletStatus(this.instance);
    }

    /**
     * @async
     * @method getWalletBalance
     * @description Retrieves the current balance of the connected wallet instance.
     * @returns {Promise<Object>} A Promise that resolves with the wallet balance information.
     */
    async getWalletBalance() {
        return await vmGetWalletBalance(this.instance);
    }

    /**
     * @async
     * @method getMarketData
     * @description Retrieves the market data for all active symbol or a specified symbol. For the latest data, use `getLatestMarketData`.
     * @param {string} _symbol - The symbol of the market to retrieve data for.
     * @returns {Promise<Object>} A Promise that resolves with the market data information.
     */
    async getMarketData(_symbol) {
        return await vmGetMarketData(this.instance, _symbol);
    }

    /**
     * @async
     * @method getLatestMarketData
     * @description Retrieves the latest market data for the specified symbol.
     * @param {string} _symbol - The symbol of the market to retrieve the latest data for.
     * @returns {Promise<Object>} A Promise that resolves with the latest market data information.
     */
    async getLatestMarketData(_symbol) {
        return await vmGetLatestMarketData(this.instance, _symbol);
    }

    /**
     * @async
     * @method getMarketOrderSize
     * @description Retrieves the current market order size for the specified symbol.
     * @param {string} _symbol - The symbol of the market to retrieve the order size for.
     * @returns {Promise<number>} A Promise that resolves with the market order size.
     */
    async getMarketOrderSize(_symbol) {
        return await vmGetMarketOrderSize(this.instance, _symbol);
    }

    /**
     * @async
     * @method getFundingRateHour
     * @description Retrieves the hourly funding rate for the specified symbol.
     * @param {string} _symbol - The symbol of the market to retrieve the funding rate for.
     * @returns {Promise<number>} A Promise that resolves with the hourly funding rate.
     */
    async getFundingRateHour(_symbol) {
        return await vmGetFundingRateHour(this.instance, _symbol);
    }

    /**
     * @async
     * @method getMarketOpenInterest
     * @description Retrieves the open interest for the specified market symbol.
     * @param {string} _symbol - The symbol of the market to retrieve open interest for.
     * @returns {Promise<number>} A Promise that resolves with the open interest value.
     */
    async getMarketOpenInterest(_symbol) {
        return await vmGetMarketOpenInterest(this.instance, _symbol);
    }

    /**
     * @async
     * @method getOpenPositions
     * @description Retrieves the list of open positions for the current instance.
     * @returns {Promise<Array>} A Promise that resolves with an array of open positions.
     */
    async getOpenPositions() {
        return await vmGetOpenPositions(this.instance);
    }

    /**
     * @async
     * @method getOpenPositionDetail
     * @description Retrieves the details of an open position for the specified symbol from the current instance.
     * @param {string} _symbol - The symbol identifier for which to retrieve the open position details.
     * @returns {Promise<Object>} A Promise that resolves with the details of the open position.
     */
    async getOpenPositionDetail(_symbol) {
        return await vmGetOpenPositionDetail(this.instance, _symbol);
    }

    /**
     * @async
     * @method getOrderStatus
     * @description Retrieves the status of an order with the specified order ID from the current instance.
     * @param {string|number} _orderId - The unique identifier of the order whose status is to be retrieved.
     * @returns {Promise<Object>} A Promise that resolves with the status details of the order.
     */
    async getOrderStatus(_orderId) {
        return await vmGetOrderStatus(this.instance, _orderId);
    }

    async test(){
        const response = await this.instance.get('/info/markets')
        return response.data
    }
}