import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves the wallet status, including balance and equity, from the user's account using the provided API instance.
 * @param {Object} _instance - The API client instance used to perform the wallet balance request.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet status data or an error message.
 */
export async function vmGetWalletStatus(_instance) {
    try {
        const responce = await _instance.get('/user/balance');
        return createResponse(
            true,
            'success',
            {
                balance: responce.data.data.balance,
                equity: responce.data.data.equity,
            },
            'extended.getWalletStatus'
        );
    } catch (error) {
        return createResponse(false, error.message, null, 'extended.getWalletStatus');
    }
}