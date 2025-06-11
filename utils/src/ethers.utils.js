import { ethers } from 'ethers';

/**
 * @function resolveSigner
 * @description Returns an ethers.js Signer instance. If a private key and RPC provider are provided, creates a new Wallet; if a Signer object is provided, returns it directly.
 * @param {string|Object} signerOrKey - A private key string or an ethers.js Signer object.
 * @param {string|null} rpcProvider - (Optional) RPC provider URL, required if using a private key.
 * @returns {Object} An ethers.js Signer instance.
 * @throws {Error} If neither a valid private key with provider nor a Signer object is provided.
 */
export function resolveSigner(signerOrKey, rpcProvider = null) {
    if (typeof signerOrKey === 'string' && rpcProvider) {
        return new ethers.Wallet(signerOrKey, new ethers.JsonRpcProvider(rpcProvider));
    } else if (signerOrKey && typeof signerOrKey.getAddress === 'function') {
        return signerOrKey;
    } else {
        throw new Error('You must provide either a private key with a provider or a valid Signer object.');
    }
}