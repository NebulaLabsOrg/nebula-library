import { createInstance } from '../../../../../utils/src/http.utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetWalletStatus, vmGetWalletBalance, vmGetMarketData, vmGetLatestMarketData, vmGetMarketOrderSize } from './viewModel.js';
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

    async test(){
        const response = await this.instance.get('/info/markets')
        return response.data
    }
}