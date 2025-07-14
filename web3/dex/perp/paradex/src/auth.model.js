import { signOnboarding, signAuth } from './sign.model.js';
import { clearParadexHeaders } from './utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';

/**
 * @async
 * @function amOnboardUser
 * @description Onboards a user to Paradex by sending their public key and authentication signature.
 * @param {Object} _instance - Axios instance configured for Paradex API.
 * @param {string|number} _chainId - The blockchain network chain ID.
 * @param {Object} _account - The user's account object containing Ethereum and StarkNet addresses and public key.
 * @returns {Promise<Object>} A Promise that resolves with a response object indicating the onboarding result.
 */
export async function amOnboardUser(_instance, _chainId, _account) {    
    try{
        clearParadexHeaders(_instance);
        const signature = signOnboarding(_chainId, _account);
        const param = {
            public_key: _account.publicKey,
        };

        _instance.defaults.headers['PARADEX-ETHEREUM-ACCOUNT'] = _account.ethereumAccount;
        _instance.defaults.headers['PARADEX-STARKNET-ACCOUNT'] = _account.address;
        _instance.defaults.headers['PARADEX-STARKNET-SIGNATURE'] = signature;
        await _instance.post('/onboarding', param);
        return createResponse(true, 'User onboarded successfully', null, 'paradex.onboardUser');
    } catch (error) {
        return createResponse(false, error.message || 'Failed to onboard user', null, 'paradex.onboardUser');
    }
}
/**
 * @async
 * @function amAuthenticateUser
 * @description Authenticates a user with Paradex by sending the required authentication signature and headers.
 * @param {Object} _instance - Axios instance configured for Paradex API.
 * @param {string|number} _chainId - The blockchain network chain ID.
 * @param {Object} _account - The user's account object containing Ethereum and StarkNet addresses and public key.
 * @returns {Promise<Object>} A Promise that resolves with a response object indicating the authentication result.
 */
export async function amAuthenticateUser(_instance, _chainId, _account) {
    try {
        clearParadexHeaders(_instance);
        const { signature, timestamp, expiration } = signAuth(_chainId, _account);

        _instance.defaults.headers['PARADEX-ETHEREUM-ACCOUNT'] = _account.ethereumAccount;
        _instance.defaults.headers['PARADEX-STARKNET-ACCOUNT'] = _account.address;
        _instance.defaults.headers['PARADEX-STARKNET-SIGNATURE'] = signature;
        _instance.defaults.headers['PARADEX-TIMESTAMP'] = timestamp;
        _instance.defaults.headers['PARADEX-SIGNATURE-EXPIRATION'] = expiration;

        const response = await _instance.post('/auth');
        return createResponse(true, 'User authenticated successfully', response.data, 'paradex.authenticateUser');
    } catch (error) {
        return createResponse(false, error.message || 'Failed to authenticate user', null, 'paradex.authenticateUser');
    }
}