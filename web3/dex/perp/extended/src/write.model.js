import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { vmGetMarketOrderSize, vmGetLatestMarketData } from './view.model.js';
import { formatOrderQuantity, calculateMidPrice, generateNonce } from './utils.js';
import { signSettlement } from './sign.model.js';
import { extendedEnum } from './enum.js';
import { DAY_MS, MARKET_TIME_IN_FORCE, LIMIT_TIME_IN_FORCE } from './constant.js';

/**
 * @async
 * @function wmSubmitOrder
 * @description Submits a new order to the exchange using the provided API client instance. Handles fee retrieval, market size validation, price calculation (including slippage for market orders), quantity formatting, and settlement signing. Returns a standardized response object containing the order ID and symbol on success, or an error message on failure.
 * @param {Object} _instance - The API client instance used to perform HTTP requests.
 * @param {number} _slippage - The allowed slippage percentage for market orders.
 * @param {Object} _account - The user's account object containing vault number and Stark key information.
 * @param {string} _type - The order type (e.g., market or limit).
 * @param {string} _symbol - The market symbol for which to submit the order.
 * @param {string} _side - The order side (e.g., long or short).
 * @param {string} _marketUnit - The unit in which the order quantity is specified.
 * @param {number|string} _orderQty - The quantity of the order to submit.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the order ID and symbol, or an error message.
 */
export async function wmSubmitOrder(_instance, _slippage, _account, _type, _symbol, _side, _marketUnit, _orderQty) {
    try {
        //Get fees
        const feeParams = { market: _symbol };
        const urlFeeData = encodeGetUrl('/user/fees', feeParams);
        const feeDataResponce = await _instance.get(urlFeeData);
        const { makerFeeRate, takerFeeRate } = feeDataResponce.data.data[0];
        const actFeeRate = _type === extendedEnum.order.type.market ? takerFeeRate : makerFeeRate;

        //Get market size
        const marketSize = await vmGetMarketOrderSize(_instance, _symbol);
        if (!marketSize.success) {
            return createResponse(false, marketSize.message, null, 'extended.submitOrder');
        }
        const { qtyStep, minQty, priceDecimals } = marketSize.data;

        //Get latest market price
        const latestMarketData = await vmGetLatestMarketData(_instance, _symbol);
        if (!latestMarketData.success) {
            return createResponse(false, latestMarketData.message, null, 'extended.submitOrder');
        }
        const { askPrice, bidPrice } = latestMarketData.data;
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        const actPrice = (_type === extendedEnum.order.type.market ? _side === extendedEnum.order.long ? midPrice + midPrice * (_slippage / 100) : midPrice - midPrice * (_slippage / 100) : midPrice).toFixed(priceDecimals);

        // Calculate formatted qty
        const qty = formatOrderQuantity(
            _orderQty,
            _marketUnit === extendedEnum.order.quoteOnSecCoin,
            actPrice,
            qtyStep
        );

        if (qty < minQty) {
            return createResponse(false, `Order quantity must be greater than ${minQty}`, null, 'extended.submitOrder');
        }

        const nonce = BigInt(generateNonce());

        // Expiry in secondi per la firma, in ms per il body
        const expiryEpochMillis = Date.now() + DAY_MS;

        // Get signature data
        const settlement = await signSettlement(
            _instance,
            _symbol,
            _side,
            qty,
            actPrice,
            actFeeRate,
            _account.vaultNr,
            nonce,
            expiryEpochMillis,
            _account.starkKeyPrv,
            _account.starkKeyPub
        )

        // Gernerate the body for the order submission
        const body = {
            id: crypto.randomUUID(),
            market: _symbol,
            type: _type,
            side: _side,
            qty: qty.toString(),
            price: actPrice.toString(),
            timeInForce: _type === extendedEnum.order.type.market ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE,
            expiryEpochMillis,
            fee: actFeeRate,
            nonce: nonce.toString(),
            settlement,
            selfTradeProtectionLevel: "ACCOUNT"
        };

        // Submit the order
        const response = await _instance.post('/user/order', body);
        return createResponse(true, 'success', { symbol: _symbol, orderId: response.data.data.id }, 'extended.submitOrder');
    } catch (error) {
        return createResponse(
            false,
            error.response?.data ?? error.message,
            null,
            'extended.submitOrder'
        );
    }
}
