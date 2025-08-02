import { createInstance } from '../../../../../utils/src/http.utils.js';
import { vmGetEarnedRewards } from './view.model.js';
import { defxEnum } from './enum.js';

export { defxEnum };

/**
 * @class Defx
 * @description A class for interacting with the Defx exchange API.
 * Provides methods for authentication, account management, retrieving market data, balances, open positions, order management, and more for users.
 * Uses a throttler to manage request frequency and offers an extended interface for trading operations and account management.
 */
export class Defx {
    /**
     * @constructor
     * @param {string} _apyKey - The API key for authentication.
     * @param {string} _secretApiKey - The secret API key for authentication.
     * @param {object} [_throttler] - An optional throttler instance to manage request frequency.
     */
    constructor(_apyKey, _secretApiKey, _throttler = { enqueue: fn => fn() }) {
        this.account = {
            secretApiKey: _secretApiKey,
        },
        this.instance = createInstance('https://api.defx.com/v1', { 'X-DEFX-APIKEY': _apyKey });
        this.throttler = _throttler;
    }

    /**
     * Retrieves the earned rewards for the authenticated user on Paradex.
     * Uses a throttler to enqueue the request, ensuring rate limits are respected.
     * Calls the underlying function to fetch the earned rewards using the user's secret API key.
     *
     * @async
     * @method getEarnedRewards
     * @returns {Promise<Object>} A Promise that resolves with the response containing the earned rewards data or an error message.
     */
    getEarnedRewards(){
        return this.throttler.enqueue(() => vmGetEarnedRewards(this.instance, this.account.secretApiKey), 2);
    }

}