import { createInstance } from '../../../../../utils/src/http.utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetWalletStatus } from './viewModel.js';
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

    async test(){
        const response = await this.instance.get('user/balance')
        return response.data
    }
}