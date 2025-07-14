import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { vmGetMarketOrderSize, vmGetLatestMarketData } from './viewModel.js'
import { formatOrderQuantity, calculateMidPrice, generateNonce } from './utils.js';
import { signOrder } from './sign.js';
import { extendedEnum } from './enum.js';
import { DAY_MS, marketTimeInForce, limitTimeInForce } from './constant.js';

export async function wmSubmitOrder(_instance, _chainId, _account, _type, _symbol, _side, _marketUnit, _orderQty) {
    try {
        const feeParams = { market: _symbol };
        const urlFeeData = encodeGetUrl('/user/fees', feeParams)
        const feeDataResponce = await _instance.get(urlFeeData);
        const { makerFeeRate, takerFeeRate } = feeDataResponce.data.data[0];

        const marketSize = await vmGetMarketOrderSize(_instance, _symbol);
        if (!marketSize.success) {
            return createResponse(false, marketSize.message, null, 'extended.submitOrder');
        }

        const latestMarketData = await vmGetLatestMarketData(_instance, _symbol);
        if (!latestMarketData.success) {
            return createResponse(false, latestMarketData.message, null, 'extended.submitOrder');
        }
        const { askPrice, bidPrice } = latestMarketData.data;
        console.log('Latest market data:', latestMarketData.data);
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        console.log('Calculated mid price:', midPrice);

        const qty = formatOrderQuantity(
            _orderQty,
            _marketUnit === extendedEnum.order.quoteOnSecCoin,
            midPrice,
            marketSize.data.qtyStep
        );

        if (parseFloat(qty) < marketSize.data.minQty)
            return createResponse(false, `Order quantity must be greater than ${marketSize.data.minQty}`, null, 'extended.submitOrder');

        // Generate a short UUID for order id
        const order = {
            id: crypto.randomUUID().replace(/-/g, '').substring(0, 16),
            type: _type,
            market: _symbol, // stringa, es: "BTC-USD"
            qty: qty, // qty
            price: midPrice.toString(), // price
            side: _side,
            timeInForce: _type === extendedEnum.order.type.market ? marketTimeInForce : limitTimeInForce,
            expiryEpochMillis: Date.now() + DAY_MS,
            fee: _type === extendedEnum.order.type.market ? takerFeeRate : makerFeeRate, // quantum fee
            nonce: generateNonce().toString()
        };
        
        const signature = signOrder(_chainId, _account, order)

        const body = {
            ...order,
            settlement: {
                signature,
                starkKey: _account.starkKeyPub,
                collateralPosition: _account.vaultNr.toString()
            },
            selfTradeProtectionLevel: 'ACCOUNT'
        };

        console.log('Submitting order:', body);
        const response = await _instance.post('/user/order', body);
        console.log('Response:', response.data);
    } catch (error) {
        return createResponse(
            false,
            error.response?.data ?? error.message,
            null,
            'extended.submitOrder'
        );
    }
}

