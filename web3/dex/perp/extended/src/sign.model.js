import { sign } from '@starkware-industries/starkware-crypto-utils';

export function signOrder(_chainId, _account, _order) {

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