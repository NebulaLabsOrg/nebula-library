import { ec, typedData as starkTypedData, shortString } from 'starknet';
import { buildOrderTypedData } from './utils.js';

/**
 * @function signatureFromTypedData
 * @private
 * @description Signs the provided EIP-712 typed data using the given account's private key and returns the signature as a JSON string.
 * @param {Object} _account - The account object containing the address and privateKey.
 * @param {Object} _typedData - The EIP-712 typed data to sign.
 * @returns {string} The signature as a JSON string array [r, s].
 */
function signatureFromTypedData(_account, _typedData) {
    const msgHash = starkTypedData.getMessageHash(_typedData, _account.address);
    const { r, s } = ec.starkCurve.sign(msgHash, _account.starkKeyPrv);
    return { r: '0x' + r.toString(16), s: '0x' + s.toString(16) };
}

export function signOrder(_chainId, _account, _order) {
    const typedData = buildOrderTypedData(_order, _chainId);
    const signature = signatureFromTypedData(_account, typedData);
    return signature
}