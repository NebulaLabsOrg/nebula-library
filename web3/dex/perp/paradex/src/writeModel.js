import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { vmGetMarketOrderSize, vmGetOpenPositionDetail, vmGetMarketData } from './viewModel.js'
import { signOrder } from './sign.js'
import { paradexEnum } from './enum.js';

/**
 * Submits a new order to the Paradex API after validating and formatting the order parameters.
 *
 * @async
 * @function wmSubmitOrder
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string|number} _chainId - The blockchain chain ID for signing the order.
 * @param {string} _account - The user's account address or identifier.
 * @param {string} _type - The type of order to submit (e.g., 'limit', 'market').
 * @param {string} _symbol - The market symbol (e.g., 'BTC-USD-PERP') for which the order is placed.
 * @param {string} _side - The side of the order ('buy' or 'sell').
 * @param {string} _marketUnit - The unit in which the order quantity is specified (e.g., base or quote currency).
 * @param {string|number} _orderQty - The quantity of the order.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including details such as the symbol and order ID on success, or an error message on failure.
 */
export async function wmSubmitOrder(_instance, _chainId, _account, _type, _symbol, _side, _marketUnit, _orderQty) {
    try {
        const marketSize = await vmGetMarketOrderSize(_instance, _symbol)
        if(!marketSize.success){ return createResponse(false, 'No size found for this market', null, 'paradex.submitOrder'); }

        const marketDetail = await _instance.get(encodeGetUrl('/markets/summary', { market: _symbol }));
        if (
            !marketDetail.data ||
            !marketDetail.data.results ||
            !marketDetail.data.results[0] ||
            marketDetail.data.results[0].mark_price === undefined ||
            marketDetail.data.results[0].mark_price === null
        ) {
            return createResponse(false, 'No price found for this market', null, 'paradex.submitOrder');
        }

        // Parse the order quantity as a float
        let qty = parseFloat(_orderQty);

        // If the market unit is quoted in the secondary coin, convert the quantity to base units using the last price
        if (_marketUnit === paradexEnum.order.quoteOnSecCoin) {
            qty = qty / marketDetail.data.results[0].mark_price;
        }

        // Adjust the quantity to the nearest valid step size
        const qtyStep = parseFloat(marketSize.data.qtyStep);
        qty = Math.floor(qty / qtyStep) * qtyStep;

        // Format the quantity to the correct number of decimal places based on the step size
        const stepDecimals = (marketSize.data.qtyStep.toString().split('.')[1] || '').length;
        qty = qty.toFixed(stepDecimals);

        if (parseFloat(qty) < marketSize.data.minOrderQty)
            return createResponse(false, `Order quantity must be greater than ${marketSize.data.minOrderQty}`, null, 'paradex.submitOrder');

        const instruction = _type === paradexEnum.order.type.limit ? 'GTC': 'IOC'
        const message = {
            instruction: instruction,
            market: _symbol,
            price: Number(marketDetail.data.results[0].mark_price).toFixed(marketSize.data.priceDecimals),
            side: _side,
            size: qty,
            type: _type
        };
        const { signature, timestampMs } = signOrder(_chainId, _account, message);
        const params = {
            ...message,
            signature: signature,
            signature_timestamp: timestampMs,
        };
        const response = await _instance.post('/orders', params);
        return createResponse(true, 'success', {symbol: _symbol, orderId: response.data.id}, 'paradex.submitOrder');
    } catch (error) {
        return createResponse(false, error.message, null, 'paradex.submitOrder');
    }
}

/**
 * Cancels an existing order on the Paradex API.
 *
 * @async
 * @function wmSubmitCancelOrder
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string|number} _orderId - The unique identifier of the order to cancel.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the order ID on success, or an error message on failure.
 */
export async function wmSubmitCancelOrder(_instance, _orderId) {
    try {
        await _instance.delete('/orders/' +  _orderId);
        return createResponse(true, 'success', {orderId: _orderId}, 'paradex.submitCancelOrder')
    } catch (error) {
        return createResponse(false, error.message, null, 'paradex.submitCancelOrder');
    }
}

/**
 * Submits a close order for an open position on the Paradex API.
 *
 * Retrieves the current open position, determines the appropriate quantity to close (either full or partial),
 * adjusts the quantity to the market's step size, and submits a market or limit close order.
 *
 * @async
 * @function wmSubmitCloseOrder
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string|number} _chainId - The blockchain chain ID for signing the order.
 * @param {string} _account - The user's account address or identifier.
 * @param {string} _type - The order type (e.g., 'limit' or 'market'), typically from paradexEnum.order.type.
 * @param {string} _symbol - The market symbol (e.g., 'BTC-USD') for which to close the position.
 * @param {string|number} _orderQty - The quantity to close (can be in base or quote units).
 * @param {string} _marketUnit - The unit of the order quantity (e.g., base or quote), typically from paradexEnum.order.
 * @param {boolean} _closeAll - Whether to close the entire position (true) or a partial amount (false).
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the symbol and order ID on success, or an error message on failure.
 */
export async function wmSubmitCloseOrder(_instance, _chainId, _account, _type, _symbol, _orderQty, _marketUnit, _closeAll) {
    try {
        // Get current position info using vmGetOpenPositionDetail
        const posRes = await vmGetOpenPositionDetail(_instance, _symbol);
        if (!posRes.success || !posRes.data)
            return createResponse(false, posRes.message || 'No open position found', null, 'paradex.submitCloseMarketOrder');
        const position = posRes.data;
        const positionSide = position.side; // 'Buy' or 'Sell'
        const closeSide = positionSide === 'long' ? paradexEnum.order.short : paradexEnum.order.long;
        const positionQty = Math.abs(parseFloat(position.qty));

        if (positionQty === 0)
            return createResponse(false, 'Position size is zero', null, 'paradex.submitCloseMarketOrder');

        // Get market order size info
        const marketOrderSize = await vmGetMarketOrderSize(_instance, _symbol);
        if (!marketOrderSize.success)
            return createResponse(false, marketOrderSize.message, null, 'paradex.submitCloseMarketOrder');

        const marketDetail = await _instance.get(encodeGetUrl('/markets/summary', { market: _symbol }));
        if (
            !marketDetail.data ||
            !marketDetail.data.results ||
            !marketDetail.data.results[0] ||
            marketDetail.data.results[0].mark_price === undefined ||
            marketDetail.data.results[0].mark_price === null
        ) {
            return createResponse(false, 'No price found for this market', null, 'paradex.submitOrder');
        }

        // Determine qty to close
        let qty;
        if (_closeAll) {
            qty = positionQty;
        } else {
            // Parse the order quantity as a float
            qty = parseFloat(_orderQty);
            // If the market unit is quoted in the secondary coin, convert the quantity to base units using the last price
            if (_marketUnit === paradexEnum.order.quoteOnSecCoin) {
                qty = qty / marketDetail.data.results[0].mark_price;
            }
            if (qty > positionQty) { qty = positionQty };
        }

        // Adjust qty to step size
        const qtyStep = parseFloat(marketOrderSize.data.qtyStep);
        qty = Math.floor(qty / qtyStep) * qtyStep;

        // Format the quantity to the correct number of decimal places based on the step size
        const stepDecimals = (qtyStep.toString().split('.')[1] || '').length;
        qty = qty.toFixed(stepDecimals);

        if (parseFloat(qty) < marketOrderSize.data.minOrderQty)
            return createResponse(false, `Order quantity must be greater than ${marketOrderSize.data.minOrderQty}`, null, 'paradex.submitCloseMarketOrder');

        const instruction = _type === paradexEnum.order.type.limit ? 'GTC': 'IOC'
        const message = {
            instruction: instruction,
            market: _symbol,
            price: Number(marketDetail.data.results[0].mark_price).toFixed(marketOrderSize.data.priceDecimals),
            side: closeSide,
            size: qty,
            type: _type
        };
        const { signature, timestampMs } = signOrder(_chainId, _account, message);
        const params = {
            ...message,
            signature: signature,
            signature_timestamp: timestampMs,
        };
        const response = await _instance.post('/orders', params);
        return createResponse(true, 'success', {symbol: _symbol, orderId: response.data.id}, 'paradex.submitCloseMarketOrder');
    } catch (error) {
        return createResponse(false, error.message, null, 'paradex.submitCloseMarketOrder');
    }
}