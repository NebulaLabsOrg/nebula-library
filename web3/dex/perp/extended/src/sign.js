import { ec, typedData as starkTypedData } from 'starknet';
import { buildOrderTypedData, toQuantums } from './utils.js';

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

function deducePrecision(value) {
    if (typeof value === "string") {
        const parts = value.split(".");
        return parts.length > 1 ? parts[1].length : 0;
    }
    if (typeof value === "number") {
        const str = value.toString();
        const parts = str.split(".");
        return parts.length > 1 ? parts[1].length : 0;
    }
    // Se è BigNumber o altro, gestisci come serve
    return 0;
}

export function signOrder(_chainId, _account, _order) {
    // Deduce la precisione direttamente dal valore in ingresso
    const qtyPrecision = deducePrecision(_order.qty);
    const pricePrecision = deducePrecision(_order.price);
    const feePrecision = deducePrecision(_order.fee);

    // Converte i valori necessari in quantoms prima di firmare
    const orderToSign = {
        ..._order,
        qty: toQuantums(_order.qty, qtyPrecision),
        price: toQuantums(_order.price, pricePrecision),
        fee: toQuantums(_order.fee, feePrecision),
    };

    const typedData = buildOrderTypedData(orderToSign, _chainId);
    const signature = signatureFromTypedData(_account, typedData);
    return signature;
}