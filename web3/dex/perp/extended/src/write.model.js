import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { vmGetMarketOrderSize, vmGetLatestMarketData, vmGetOpenPositionDetail } from './view.model.js';
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
            postOnly: _type === extendedEnum.order.type.limit,
            selfTradeProtectionLevel: "ACCOUNT"
        };

        // Submit the order
        const response = await _instance.post('/user/order', body);
        console.log('Order response:', response.data);
        return createResponse(true, 'success', { symbol: _symbol, orderId: response.data.data.externalId }, 'extended.submitOrder');
    } catch (error) {
        return createResponse(
            false,
            error.response?.data ?? error.message,
            null,
            'extended.submitOrder'
        );
    }
}

/**
 * Cancels an existing order on the Extended API.
 *
 * @async
 * @function wmSubmitCancelOrder
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string|number} _orderId - The unique identifier of the order to cancel.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the order ID on success, or an error message on failure.
 */
export async function wmSubmitCancelOrder(_instance, _orderId) {
    try {
        const params = { externalId: _orderId };
        const url = encodeGetUrl('/user/order', params);
        await _instance.delete(url);
        return createResponse(true, 'success', { orderId: _orderId }, 'extended.submitCancelOrder');
    } catch (error) {
        console.error('Error in wmSubmitCancelOrder:', error);
        return createResponse(false, error.response?.data ?? error.message, null, 'extended.submitCancelOrder');
    }
}

/**
 * Submits a close order for an open position on the Extended API.
 *
 * This function retrieves the open position details, calculates the appropriate quantity and price for closing the position,
 * applies slippage if required, fetches fee rates, market size, and latest market price, and signs the settlement before submitting the close order.
 * Handles both full and partial close scenarios, and ensures order quantity is within allowed limits.
 *
 * @async
 * @function wmSubmitCloseOrder
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {number} _slippage - Allowed slippage percentage for market orders.
 * @param {Object} _account - User account object containing vault number and Stark key information.
 * @param {string} _type - Order type (e.g., market or limit).
 * @param {string} _symbol - Market symbol for the order (e.g., 'BTC-USD').
 * @param {number} _orderQty - Quantity to close (ignored if _closeAll is true).
 * @param {string} _marketUnit - Unit type for the market (e.g., base or quote).
 * @param {boolean} _closeAll - If true, closes the entire position; otherwise, closes the specified quantity.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the symbol and order ID on success, or an error message on failure.
 */
export async function wmSubmitCloseOrder(_instance, _slippage, _account, _type, _symbol, _orderQty, _marketUnit, _closeAll) {
    try {

        const posRes = await vmGetOpenPositionDetail(_instance, _symbol);
        if (!posRes.success || !posRes.data)
            return createResponse(false, posRes.message || 'No open position found', null, 'extended.submitCloseOrder');
        const position = posRes.data; 
        const positionSide = position.side; // 'Buy' or 'Sell'
        const closeSide = positionSide === 'long' ? extendedEnum.order.short : extendedEnum.order.long;
        const positionQty = Math.abs(parseFloat(position.qty));

        if (positionQty === 0)
            return createResponse(false, 'Position size is zero', null, 'extended.submitCloseOrder');

        //Get fees
        const feeParams = { market: _symbol };
        const urlFeeData = encodeGetUrl('/user/fees', feeParams);
        const feeDataResponce = await _instance.get(urlFeeData);
        const { makerFeeRate, takerFeeRate } = feeDataResponce.data.data[0];
        const actFeeRate = _type === extendedEnum.order.type.market ? takerFeeRate : makerFeeRate;

        //Get market size
        const marketSize = await vmGetMarketOrderSize(_instance, _symbol);
        if (!marketSize.success) {
            return createResponse(false, marketSize.message, null, 'extended.submitCloseOrder');
        }
        const { qtyStep, minQty, priceDecimals } = marketSize.data;

        //Get latest market price
        const latestMarketData = await vmGetLatestMarketData(_instance, _symbol);
        if (!latestMarketData.success) {
            return createResponse(false, latestMarketData.message, null, 'extended.submitCloseOrder');
        }
        const { askPrice, bidPrice } = latestMarketData.data;
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        const actPrice = (_type === extendedEnum.order.type.market ? closeSide === extendedEnum.order.long ? midPrice + midPrice * (_slippage / 100) : midPrice - midPrice * (_slippage / 100) : midPrice).toFixed(priceDecimals);

        // Determine qty to close
        let qty = _closeAll ? positionQty : _orderQty;
        qty = formatOrderQuantity(
            qty,
            _marketUnit === extendedEnum.order.quoteOnSecCoin,
            actPrice,
            qtyStep
        );
        if (qty > positionQty) { 
            qty = formatOrderQuantity(
                positionQty,
                _marketUnit === extendedEnum.order.quoteOnSecCoin,
                actPrice,
                qtyStep
            );
        };

        if (qty < minQty) {
            return createResponse(false, `Order quantity must be greater than ${minQty}`, null, 'extended.submitCloseOrder');
        }

        const nonce = BigInt(generateNonce());

        // Expiry in secondi per la firma, in ms per il body
        const expiryEpochMillis = Date.now() + DAY_MS;

        // Get signature data
        const settlement = await signSettlement(
            _instance,
            _symbol,
            closeSide,
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
            side: closeSide,
            qty: qty.toString(),
            price: actPrice.toString(),
            timeInForce: _type === extendedEnum.order.type.market ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE,
            expiryEpochMillis,
            fee: actFeeRate,
            nonce: nonce.toString(),
            settlement,
            postOnly: _type === extendedEnum.order.type.limit,
            selfTradeProtectionLevel: "ACCOUNT"
        };

        // Submit the order
        const response = await _instance.post('/user/order', body);
        return createResponse(true, 'success', { symbol: _symbol, orderId: response.data.data.externalId }, 'extended.submitCloseOrder');
    } catch (error) {
        return createResponse(
            false,
            error.response?.data ?? error.message,
            null,
            'extended.submitCloseOrder'
        );
    }
}