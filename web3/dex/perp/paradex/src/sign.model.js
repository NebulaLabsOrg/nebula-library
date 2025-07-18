import { ec, shortString, typedData as starkTypedData } from 'starknet';
import { buildOnboardingTypedData, buildAuthTypedData, buildOrderTypedData, generateParadexTimestamps, toQuantums } from './utils.js';

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
    const { r, s } = ec.starkCurve.sign(msgHash, _account.privateKey);
    return JSON.stringify([r.toString(), s.toString()]);
}
/**
 * @function signOnboarding
 * @description Signs the onboarding EIP-712 typed data for the given chain ID using the provided account's private key and returns the signature as a JSON string.
 * @param {string|number} _chainId - The chain ID for which to build the onboarding typed data.
 * @param {Object} _account - The account object containing the address and privateKey.
 * @returns {string} The signature as a JSON string array [r, s].
 */
export function signOnboarding(_chainId, _account){
    const typedData = buildOnboardingTypedData(_chainId);
    const signature = signatureFromTypedData(_account, typedData);
    return signature;
}
/**
 * @function signAuth
 * @description Signs the authentication EIP-712 typed data for the given chain ID and request parameters using the provided account's private key. Returns the signature as a JSON string along with the generated timestamp and expiration.
 * @param {string|number} _chainId - The chain ID for which to build the authentication typed data.
 * @param {Object} account - The account object containing the address and privateKey.
 * @returns {Object} An object containing the signature as a JSON string array [r, s], and the generated timestamp and expiration.
 */
export function signAuth(_chainId, _account) {
    const { timestamp, expiration } = generateParadexTimestamps();
    const request = {
        method: 'POST',
        path: '/v1/auth',
        body: '',
        timestamp,
        expiration,
    };

    const typedData = buildAuthTypedData(request, _chainId);
    const signature = signatureFromTypedData(_account, typedData);

    return { signature, timestamp, expiration };
}
/**
 * @function signOrder
 * @description Signs the Paradex order EIP-712 typed data for the given chain ID, account, and order details. Returns the signature as a JSON string along with the generated timestamp.
 * @param {string|number} _chainId - The chain ID for which to build the order typed data.
 * @param {Object} _account - The account object containing the address and privateKey used for signing.
 * @param {Object} _orderDetails - The order details including side, price, size, type, and market.
 * @returns {Object} An object containing the signature as a JSON string array [r, s], and the generated timestamp (timestampMs).
 */
export function signOrder(_chainId, _account, _orderDetails) {
    const { timestampMs } = generateParadexTimestamps();
    const sideForSigning = _orderDetails.side === "BUY" ? "1" : "2";

    const priceForSigning = toQuantums(_orderDetails.price ?? "0", 8);
    const sizeForSigning = toQuantums(_orderDetails.size, 8);
    const orderTypeForSigning = shortString.encodeShortString(_orderDetails.type);
    const marketForSigning = shortString.encodeShortString(_orderDetails.market);

    const message = {
        timestamp: timestampMs,
        market: marketForSigning,
        side: sideForSigning,
        orderType: orderTypeForSigning,
        size: sizeForSigning,
        price: priceForSigning,
    };

    const typedData = buildOrderTypedData(message, _chainId);
    const signature = signatureFromTypedData(_account, typedData);

    return { signature, timestampMs };
}