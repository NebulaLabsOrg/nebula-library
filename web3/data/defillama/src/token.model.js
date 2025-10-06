import { createResponse } from '../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../utils/src/http.utils.js';

/**
 * @async
 * @function getTokenPriceByAddress
 * @description Retrieves the price information for a token by its address and chain name using the DefiLlama API.
 * @param {Object} _instance - Axios instance configured for DefiLlama API.
 * @param {string} _chainName - The name of the blockchain network.
 * @param {string} _tokenAddress - The address of the token.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the token price information or an error message.
 */
export async function getTokenPriceByAddress(_instance, _chainName, _tokenAddress) {
    try {
        const response = await _instance.get(encodeGetUrl(`/prices/current/${_chainName}:${_tokenAddress}`));
        const data = response.data.coins[`${_chainName}:${_tokenAddress}`];
        return createResponse(
            true,
            'success',
            {
                symbol: data.symbol,
                price: data.price,
                decimals: data.decimals
            },
            'defillama.getTokenPriceByAddress'
        );
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get token price';
        return createResponse(false, message, null, 'defillama.getTokenPriceByAddress');
    }
}
