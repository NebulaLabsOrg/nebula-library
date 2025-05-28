import { shortString } from 'starknet';
import { createInstance } from '../../../../../utils/src/http.utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { amOnboardUser, amAuthenticateUser } from './authModel.js';
import { vmGetAccountInfo } from './viewModel.js';
import { clearParadexHeaders } from './utils.js';
import { PARADEX_CHAIN_ID } from './constants.js';

/**
 * @class paradex
 * @description A class for interacting with the Paradex decentralized exchange. 
 * Provides methods for onboarding, authenticating, and retrieving account information for users.
 */
export class paradex {
    /**
    * @constructor
    * @param {string} _accountAddress - The user's Paradex account address.
    * @param {string} _publicKey - The user's public key.
    * @param {string} _privateKey - The user's private key.
    * @param {string} _ethereumAccount - The user's associated Ethereum account.
    * 
    */
    constructor(_accountAddress, _publicKey, _privateKey, _ethereumAccount) {
        this.account = {
            address: _accountAddress,
            publicKey: _publicKey,
            privateKey: _privateKey,
            ethereumAccount: _ethereumAccount
        };
        this.chainId = shortString.encodeShortString(PARADEX_CHAIN_ID);
        this.instance = createInstance('https://api.prod.paradex.trade/v1');
    }
    /**
     * @async
     * @method #authenticateUser
     * @private
     * @description Authenticates a user with Paradex using their account information.
     * @returns {Promise<Object>} A Promise that resolves with the authentication response object.
     */
    async #authenticateUser() {
        return await amAuthenticateUser(this.instance, this.chainId, this.account);
    }
    /**
     * @async
     * @method onboardUser
     * @description Onboards the current user to Paradex using their account information.
     * @returns {Promise<Object>} A Promise that resolves with the onboarding response object.
     */
    async onboardUser() {
        return await amOnboardUser(this.instance, this.chainId, this.account);
    }
    /**
     * @async
     * @method getAccountInfo
     * @description Authenticates the user and retrieves their account information from Paradex.
     * @returns {Promise<Object>} A Promise that resolves with the user's account information or an error response.
     */
    async getAccountInfo() {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getAccountInfo -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetAccountInfo(this.instance);
    }
}