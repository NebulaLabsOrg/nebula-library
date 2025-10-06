import { createInstance } from '../../../../utils/src/http.utils.js';
import { getTokenPriceByAddress } from './token.model.js';
import { defillamaEnum } from './enum.js';

export { defillamaEnum };

/**
 * @class Defillama
 * @description A class for interacting with the Defillama API.
 * Provides methods for initializing with a chain name and managing HTTP requests.
 */
export class Defillama {
    /**
    * @constructor
    * @param {string} _chainName - The name of the blockchain network.
    * @param {Object} [throttler={ enqueue: fn => fn() }] - Throttler object to manage request rate.
    */
    constructor(_chainName, throttler = { enqueue: fn => fn() }) {
        this.account = {
            chainName: _chainName,
        };
        this.instance = createInstance('https://coins.llama.fi');
        this.throttler = throttler;
    }

    /**
     * Retrieves the token price for a given address.
     *
     * @async
     * @method getTokenPriceByAddress
     * @param {string} _address - The address of the token to query.
     * @returns {Promise<*>} A Promise that resolves to the token price for the specified address.
     */
    async getTokenPriceByAddress(_address) {
        return this.throttler.enqueue(() => getTokenPriceByAddress(this.instance, this.account.chainName, _address));
    }
}
