import { createResponse } from '../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../utils/src/http.utils.js';
import { PAGE_SIZE, ORDER } from './constants.js';
/**
 * Retrieves ERC20 token holders from the Moralis API.
 *
 * @async
 * @function tmGetErc20Holders
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _tokenAddress - The ERC20 token contract address.
 * @param {string} [_chain] - Blockchain network identifier.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the list of holders or an error message.
 */
export async function tmGetErc20Holders(_instance, _tokenAddress, _chain) {
    const holders = [];
    let cursor = null;

    try {
        do {
            const params = {
                chain: _chain,
                order: ORDER,
                limit: PAGE_SIZE,
                ...(cursor && { cursor })
            };

            const url = encodeGetUrl(`/erc20/${_tokenAddress}/owners`, params);
            const response = await _instance.get(url);
            const result = response.data.result;

            holders.push(...result);
            cursor = response.data.cursor || null;
        } while (cursor);

        return createResponse(true, 'success', holders, 'moralis.getErc20Holders');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to retrieve ERC20 holders';
        return createResponse(false, message, holders, 'moralis.getErc20Holders');
    }
}
