import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetMarketData, vmGetOpenPositionDetail } from './view.model.js';
import { formatOrderQuantity, calculateMidPrice, countDecimals } from './utils.js';
import { extendedEnum } from './enum.js';
import { MARKET_TIME_IN_FORCE, LIMIT_TIME_IN_FORCE } from './constant.js';

/**
 * @async
 * @function wmSubmitOrder
 * @description Submits a new order using Python SDK internally with centralized error handling.
 * NOTE: Fee calculation is handled automatically by the Extended SDK - no need to pass fee parameters.
 * The SDK uses account.trading_fee or DEFAULT_FEES (maker: 0.02%, taker: 0.05%) automatically.
 * @param {Object} _pythonService - The Extended client instance with configured Python service
 * @param {number} _slippage - The allowed slippage percentage for market orders.
 * @param {string} _type - The order type (e.g., market or limit).
 * @param {string} _symbol - The market symbol for which to submit the order.
 * @param {string} _side - The order side (e.g., long or short).
 * @param {string} _marketUnit - The unit in which the order quantity is specified.
 * @param {number|string} _orderQty - The quantity of the order to submit.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the order ID and symbol, or an error message.
 */
export async function wmSubmitOrder(_pythonService, _slippage, _type, _symbol, _side, _marketUnit, _orderQty) {
    try {
        // 1. Get market data (single call for all necessary data)
        const marketData = await vmGetMarketData(_pythonService, _symbol);
        if (!marketData.success) {
            throw new Error(marketData.message);
        }
        
        const market = marketData.data[0];
        if (!market) {
            throw new Error(`Market ${_symbol} not found`);
        }
        
        const { market_stats, trading_config } = market;
        if (!market_stats || !trading_config) {
            throw new Error(`Invalid market data for ${_symbol}`);
        }
        
        // 2. Extract market parameters (NO FEE CALL NEEDED - SDK handles fees automatically)
        const askPrice = parseFloat(market_stats.ask_price);
        const bidPrice = parseFloat(market_stats.bid_price);
        const qtyStep = parseFloat(trading_config.min_order_size_change);
        const minQty = parseFloat(trading_config.min_order_size);
        const priceDecimals = countDecimals(trading_config.min_price_change);
        
        if (isNaN(askPrice) || isNaN(bidPrice)) {
            throw new Error('Invalid market prices received');
        }
        
        // 3. Calcoli locali (mantieni logica esistente)
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        const actPrice = (_type === extendedEnum.order.type.market 
            ? _side === extendedEnum.order.long 
                ? midPrice + midPrice * (_slippage / 100) 
                : midPrice - midPrice * (_slippage / 100) 
            : midPrice
        ).toFixed(priceDecimals);
        
        // 4. Format quantity (mantieni logica esistente)
        const qty = formatOrderQuantity(
            _orderQty,
            _marketUnit === extendedEnum.order.quoteOnSecCoin,
            actPrice,
            qtyStep
        );
        
        // 5. Validazioni
        if (qty < minQty) {
            throw new Error(`Order quantity ${qty} must be greater than ${minQty}`);
        }
        
        // 6. Map parameters for SDK (NO FEE PARAMETERS - SDK handles automatically)
        const sdkSide = _side === extendedEnum.order.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === extendedEnum.order.type.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;
        
        // Set post_only for LIMIT orders (recommended for better fills and maker fees)
        const postOnly = sdkOrderType === 'LIMIT';
        
        // 7. Place order via SDK with proper post_only for LIMIT orders
        const orderResult = await _pythonService.call('place_order', {
            market_name: _symbol,
            side: sdkSide,
            amount: qty.toString(),
            price: actPrice.toString(),
            order_type: sdkOrderType,
            time_in_force: timeInForce,
            post_only: postOnly
        });

        return createResponse(true, 'success', { 
            symbol: _symbol, 
            orderId: orderResult.external_id 
        }, 'extended.submitOrder');
        
    } catch (error) {
        // Tutti gli errori arrivano qui - gestione centralizzata
        const message = error.response?.data?.error?.message || error.message || 'Failed to submit order';
        return createResponse(false, message, null, 'extended.submitOrder');
    }
}

/**
 * @async
 * @function wmSubmitCancelOrder
 * @description Cancels an existing order using Python SDK with centralized error handling
 * @param {Object} _pythonService - Configured Python service method
 * @param {string} _externalId - The external ID of the order to cancel.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the external ID on success, or an error message on failure.
 */
export async function wmSubmitCancelOrder(_pythonService, _externalId) {
    try {
        if (!_externalId) {
            throw new Error('External ID is required');
        }
        
        // Use Python service with real SDK method: trading_client.orders.cancel_order_by_external_id()
        const cancelResult = await _pythonService.call('cancel_order_by_external_id', {
            external_id: _externalId.toString()
        });
        
        if (cancelResult.error) {
            throw new Error(cancelResult.error);
        }
        
        return createResponse(true, 'success', { externalId: _externalId }, 'extended.submitCancelOrder');
        
    } catch (error) {
        // Centralized error handling
        const message = error.response?.data?.error?.message || error.message || 'Failed to cancel order';
        return createResponse(false, message, null, 'extended.submitCancelOrder');
    }
}

/**
 * @async
 * @function wmSubmitCloseOrder
 * @description Closes an existing position by submitting an opposite order using Python SDK.
 * @param {Object} _pythonService - The Extended client instance with configured Python service
 * @param {number} _slippage - Allowed slippage percentage for market orders.
 * @param {string} _type - Order type (e.g., market or limit).
 * @param {string} _symbol - Market symbol for the order (e.g., 'BTC-USD').
 * @param {string} _marketUnit - Unit type for the market (e.g., base or quote).
 * @param {number} _orderQty - Quantity to close (ignored if _closeAll is true).
 * @param {boolean} _closeAll - If true, closes the entire position; otherwise, closes the specified quantity.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the symbol and order ID on success, or an error message on failure.
 */
export async function wmSubmitCloseOrder(_pythonService, _slippage, _type, _symbol, _marketUnit, _orderQty, _closeAll) {
    try {
        if (!_symbol) {
            throw new Error('Symbol is required');
        }
        
        // 1. Get position details using vmGetOpenPositionDetail
        const positionResponse = await vmGetOpenPositionDetail(_pythonService, _symbol);
        if (!positionResponse.success) {
            throw new Error(positionResponse.message || `No open position found for ${_symbol}`);
        }
        
        const positionDetail = positionResponse.data;
        const { side, qty: positionQty } = positionDetail;
        
        if (!positionQty || positionQty === 0) {
            throw new Error('Position size is zero');
        }

        // 2. Determine quantity to close
        let closeQuantity;
        if (_closeAll) {
            closeQuantity = positionQty;
        } else {
            closeQuantity = _orderQty;
        }
        
        if (closeQuantity <= 0) {
            throw new Error('Close quantity must be greater than zero');
        }

        // 3. Determine opposite side to close the position
        const closeSide = side === 'long' ? extendedEnum.order.short : extendedEnum.order.long;
        
        // 4. Get market data for order parameters
        const marketData = await vmGetMarketData(_pythonService, _symbol);
        if (!marketData.success) {
            throw new Error(marketData.message);
        }
        
        const market = marketData.data[0];
        if (!market) {
            throw new Error(`Market ${_symbol} not found`);
        }
        
        const { market_stats, trading_config } = market;
        if (!market_stats || !trading_config) {
            throw new Error(`Invalid market data for ${_symbol}`);
        }
        
        // 5. Extract market parameters
        const askPrice = parseFloat(market_stats.ask_price);
        const bidPrice = parseFloat(market_stats.bid_price);
        const qtyStep = parseFloat(trading_config.min_order_size_change);
        const minQty = parseFloat(trading_config.min_order_size);
        const priceDecimals = countDecimals(trading_config.min_price_change);
        
        if (isNaN(askPrice) || isNaN(bidPrice)) {
            throw new Error('Invalid market prices received');
        }
        
        // 6. Calculate execution price
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        const actPrice = (_type === extendedEnum.order.type.market 
            ? closeSide === extendedEnum.order.long 
                ? midPrice + midPrice * (_slippage / 100) 
                : midPrice - midPrice * (_slippage / 100) 
            : midPrice
        ).toFixed(priceDecimals);
        
        // 7. Format quantity
        const qty = formatOrderQuantity(
            closeQuantity,
            (_marketUnit === extendedEnum.order.quoteOnSecCoin) && !_closeAll,
            actPrice,
            qtyStep
        );
        
        // 8. Validations
        if (qty < minQty) {
            throw new Error(`Close quantity ${qty} must be greater than ${minQty}`);
        }
        
        // 9. Map parameters for SDK
        const sdkSide = closeSide === extendedEnum.order.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === extendedEnum.order.type.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;
        
        // Set post_only for LIMIT orders and always set reduce_only for close orders
        const postOnly = sdkOrderType === 'LIMIT';
        const reduceOnly = true; // Always true for close orders
        
        // 10. Place close order via SDK with reduce_only and post_only for LIMIT orders
        const orderResult = await _pythonService.call('place_order', {
            market_name: _symbol,
            side: sdkSide,
            amount: qty.toString(),
            price: actPrice.toString(),
            order_type: sdkOrderType,
            time_in_force: timeInForce,
            post_only: postOnly,
            reduce_only: reduceOnly
        });

        return createResponse(true, 'success', { 
            symbol: _symbol, 
            orderId: orderResult.external_id,
        }, 'extended.submitCloseOrder');
        
    } catch (error) {
        // Centralized error handling
        const message = error.response?.data?.error?.message || error.message || 'Failed to submit close order';
        return createResponse(false, message, null, 'extended.submitCloseOrder');
    }
}
