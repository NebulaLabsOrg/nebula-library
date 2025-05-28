import { createResponse } from '../../../../../utils/src/response.utils.js';

/**
 * @async
 * @function vmGetAccountInfo
 * @description Retrieves the user's account information from the Paradex API.
 * @param {Object} _instance - Axios instance configured for Paradex API.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the account information or an error message.
 */
export async function vmGetAccountInfo(_instance) {
    try {
        const response = await _instance.get('/account');
        return createResponse(true, 'Account info retrieved successfully', response.data, 'paradex.getAccountInfo');
    } catch (error) {
        return createResponse(false, error.message || 'Failed to get account info', null, 'paradex.getAccountInfo');
    }
}