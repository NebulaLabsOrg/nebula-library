import { createInstance } from '../../../../utils/src/http.utils.js';
import { tmGetErc20Holders } from './token.model.js';
import { getMoralisChainEnum } from './utils.js';

/**
 * @class Moralis
 * @description A class for interacting with the Moralis API. 
 * Provides methods for accessing blockchain data such as ERC20 token holders.
 */
export class Moralis {
    /**
    * @constructor
    * @param {string} _apiKey - The API key for authenticating requests to Moralis.
    * @param {number} _chainId - The chain ID of the blockchain to interact with. Defaults to 1 (Ethereum Mainnet).
    */
    constructor(_apiKey, _chainId = 1) {
        this.chain = getMoralisChainEnum(_chainId);
        if (!this.chain) {
            throw new Error(`Chain name not available on Moralis for chainId: ${_chainId}`);
        }
        this.instance = createInstance(
            'https://deep-index.moralis.io/api/v2.2',
            {
                "x-api-key": _apiKey
            }
        );
    }
    /**
     * @async
     * @method getErc20Holders
     * @description Retrieves the list of holders for a specific ERC20 token.
     * @param {string} _tokenAddress - The address of the ERC20 token contract.
     * @returns {Promise<Object>} A Promise that resolves with the holders data for the specified token.
     */
    async getErc20Holders(_tokenAddress) {
        return await tmGetErc20Holders(this.instance, _tokenAddress, this.chain);
    }
}
