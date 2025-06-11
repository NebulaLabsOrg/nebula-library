import { ethers } from 'ethers';

/**
 * @function resolveSigner
 * @description Returns an ethers.js Signer instance. If a private key and RPC provider are provided, creates a new Wallet; if a Signer object is provided, returns it directly.
 * @param {string|Object} _signerOrKey - A private key string or an ethers.js Signer object.
 * @param {string|null} _rpcProvider - (Optional) RPC provider URL, required if using a private key.
 * @returns {Object} An ethers.js Signer instance.
 * @throws {Error} If neither a valid private key with provider nor a Signer object is provided.
 */
export function resolveSigner(_signerOrKey, _rpcProvider = null) {
    if (typeof _signerOrKey === 'string' && _rpcProvider) {
        return new ethers.Wallet(_signerOrKey, new ethers.JsonRpcProvider(_rpcProvider));
    } else if (_signerOrKey && typeof _signerOrKey.getAddress === 'function') {
        return _signerOrKey;
    } else {
        throw new Error('You must provide either a private key with a provider or a valid Signer object.');
    }
}