import { ethers } from 'ethers';
/**
 * Returns a signer object based on the provided input.
 * If a private key and an RPC provider are provided, it creates a new Wallet signer.
 * If an existing Signer object is provided, it returns it directly.
 * Throws an error if neither a valid private key nor a Signer object is provided.
 *
 * @param {string|ethers.Signer} signerOrKey - A private key string or an ethers Signer object.
 * @param {string|null} rpcProvider - The RPC provider URL (optional, required if using a private key).
 * @returns {ethers.Signer} - An ethers Signer object.
 * @throws {Error} - If the input is invalid.
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