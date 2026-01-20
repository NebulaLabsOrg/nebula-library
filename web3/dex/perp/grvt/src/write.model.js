import { randomUUID } from 'crypto';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetMarketDataPrices, vmGetMarketOrderSize, vmGetOpenPositionDetail, vmGetOrderStatusById } from './view.model.js';
import {
    formatOrderQuantity,
    calculateSlippagePrice,
    validateOrderParams,
    roundToTickSize
} from './utils.js';
import { grvtEnum } from './enum.js';
import {
    MARKET_TIME_IN_FORCE,
    LIMIT_TIME_IN_FORCE
} from './constant.js';

/**
 * @async
 * @function wmSubmitOrder
 * @description Submits order via Python SDK with automatic monitoring and retry logic
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {number} _slippage - Slippage percentage
 * @param {string} _type - Order type (MARKET or LIMIT)
 * @param {string} _symbol - Market symbol
 * @param {string} _side - Order side (BUY or SELL)
 * @param {string} _marketUnit - Market unit (main or secondary)
 * @param {number|string} _orderQty - Order quantity
 * @param {Function} [_onOrderUpdate] - Optional callback for order status updates
 * @param {number} [_retry=0] - Number of retry attempts if order is REJECTED
 * @param {number} [_timeout=60000] - Maximum timeout in milliseconds (resets when qtyExe changes)
 * @returns {Promise<Object>} Response with order ID and final status
 */
export async function wmSubmitOrder(_grvt, _slippage, _type, _symbol, _side, _marketUnit, _orderQty, _onOrderUpdate, _retry = 0, _timeout = 60000) {
    try {
        // 1. Get market prices
        const pricesResponse = await vmGetMarketDataPrices(_grvt.marketDataInstance, _symbol);
        if (!pricesResponse.success) {
            throw new Error(pricesResponse.message);
        }

        const prices = pricesResponse.data;
        const midPrice = parseFloat(prices.midPrice);

        // 2. Get market order size configuration
        const orderSizeResponse = await vmGetMarketOrderSize(_grvt.marketDataInstance, _symbol);
        if (!orderSizeResponse.success) {
            throw new Error(orderSizeResponse.message);
        }

        const orderSizeConfig = orderSizeResponse.data;
        const qtyStep = parseFloat(orderSizeConfig.mainCoin.qtyStep);
        const minQty = parseFloat(orderSizeConfig.mainCoin.minQty);
        const priceDecimals = orderSizeConfig.priceDecimals;

        // Calculate price step from priceDecimals
        const priceStep = parseFloat('0.' + '0'.repeat(priceDecimals - 1) + '1');

        // 3. Calculate order price
        const isBuy = _side === grvtEnum.orderSide.long;
        let actPrice;

        if (_type === grvtEnum.orderType.market) {
            actPrice = calculateSlippagePrice(midPrice, _slippage, isBuy);
        } else {
            // LIMIT order price logic
            const bidPrice = parseFloat(prices.bestBidPrice || 0);
            const askPrice = parseFloat(prices.bestAskPrice || 0);
            const spread = askPrice - bidPrice;

            if (isBuy) {
                // LONG: use BID if BID=ASK or spread > priceStep, otherwise midPrice
                if (bidPrice === askPrice || spread > priceStep) {
                    actPrice = bidPrice;
                } else {
                    actPrice = midPrice;
                }
            } else {
                // SHORT: use ASK if BID=ASK or spread > priceStep, otherwise midPrice
                if (bidPrice === askPrice || spread > priceStep) {
                    actPrice = askPrice;
                } else {
                    actPrice = midPrice;
                }
            }
        }


        // Round to tick size
        const roundedPrice = roundToTickSize(actPrice, priceStep);

        // 4. Format quantity
        const isQuoteOnSecCoin = _marketUnit === grvtEnum.marketUnit.quoteOnSecCoin;
        const qty = formatOrderQuantity(
            _orderQty,
            isQuoteOnSecCoin,
            actPrice,
            qtyStep
        );

        // 5. Validate order parameters
        const validation = validateOrderParams({
            symbol: _symbol,
            side: _side,
            type: _type,
            qty: qty,
            price: roundedPrice,
            minQty: minQty
        });

        if (!validation.success) {
            throw new Error(validation.message);
        }

        // 6. Prepare order parameters
        const sdkSide = _side === grvtEnum.orderSide.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === grvtEnum.orderType.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;

        // 7. Build order parameters - MARKET orders must NOT include price
        const orderParams = {
            market_name: _symbol,
            side: sdkSide,
            amount: qty.toString(),
            order_type: sdkOrderType,
            time_in_force: timeInForce
        };

        // Only add price and post_only for LIMIT orders
        if (sdkOrderType === 'LIMIT') {
            orderParams.price = roundedPrice.toString();
            orderParams.post_only = true;
        }

        // 8. Submit order via SDK
        const orderResult = await _grvt._sendCommand('place_order', orderParams);

        if (orderResult.error) {
            throw new Error(orderResult.error);
        }

        // Use the order_id returned by GRVT as externalId
        const externalId = orderResult.order_id || orderResult.client_order_id;

        if (!externalId) {
            throw new Error('No order_id returned from GRVT');
        }

        // 9. If retry/timeout logic is enabled, monitor the order
        if (_retry > 0 || (_onOrderUpdate && typeof _onOrderUpdate === 'function')) {
            let attemptCount = 0;
            let currentOrderId = externalId;
            let lastQtyExe = '0.0';
            let lastStatus = null;
            let lastAvgPrice = '0.0';
            let timeoutTimestamp = Date.now() + _timeout;

            while (attemptCount <= _retry) {
                try {
                    // Wait a bit before checking status (give server time to process)
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Get order status
                    const statusResponse = await vmGetOrderStatusById(_grvt.instance, _grvt.trading.accountId, currentOrderId);

                    if (!statusResponse.success) {
                        // If we can't get status, break the loop
                        break;
                    }

                    const orderStatus = statusResponse.data;
                    const currentStatus = orderStatus.status;
                    const currentQtyExe = orderStatus.qtyExe || '0.0';
                    const currentAvgPrice = orderStatus.avgPrice || '0.0';

                    // Check if data has changed
                    const dataChanged =
                        currentStatus !== lastStatus ||
                        currentQtyExe !== lastQtyExe ||
                        currentAvgPrice !== lastAvgPrice;

                    // Call callback if provided and data changed
                    if (_onOrderUpdate && typeof _onOrderUpdate === 'function' && dataChanged) {
                        _onOrderUpdate({
                            symbol: _symbol,
                            externalId: currentOrderId,
                            orderId: currentOrderId,
                            status: currentStatus,
                            ...orderStatus
                        });

                        // Update last known values
                        lastStatus = currentStatus;
                        lastAvgPrice = currentAvgPrice;
                    }

                    // Check if qtyExe changed - reset timeout
                    if (currentQtyExe !== lastQtyExe && parseFloat(currentQtyExe) > 0) {
                        lastQtyExe = currentQtyExe;
                        timeoutTimestamp = Date.now() + _timeout;
                    }

                    // Check for final states
                    if (currentStatus === 'FILLED' || currentStatus === 'CANCELLED' || currentStatus === 'EXPIRED') {
                        return createResponse(
                            true,
                            `Order ${currentStatus.toLowerCase()}`,
                            {
                                symbol: _symbol,
                                externalId: currentOrderId,
                                orderId: currentOrderId,
                                qty: qty,
                                price: roundedPrice,
                                side: _side,
                                type: _type,
                                finalStatus: currentStatus,
                                ...orderStatus
                            },
                            'grvt.submitOrder'
                        );
                    }

                    // Check for REJECTED state
                    if (currentStatus === 'REJECTED') {
                        if (attemptCount < _retry) {
                            attemptCount++;

                            // Cancel the rejected order first with retry
                            try {
                                await wmSubmitCancelOrder(_grvt, currentOrderId, 2);
                            } catch (cancelError) {
                                // Ignore cancel errors for rejected orders
                            }

                            // Wait a bit before retrying
                            await new Promise(resolve => setTimeout(resolve, 1000));

                            // Retry placing the order
                            const retryOrderResult = await _grvt._sendCommand('place_order', orderParams);

                            if (retryOrderResult.error) {
                                throw new Error(retryOrderResult.error);
                            }

                            currentOrderId = retryOrderResult.order_id || retryOrderResult.client_order_id;

                            if (!currentOrderId) {
                                throw new Error('No order_id returned from retry');
                            }

                            // Reset timeout for new order
                            timeoutTimestamp = Date.now() + _timeout;
                            lastQtyExe = '0.0';

                            continue;
                        } else {
                            // Max retries reached, return with REJECTED status
                            return createResponse(
                                false,
                                'Order rejected after maximum retry attempts',
                                {
                                    symbol: _symbol,
                                    externalId: currentOrderId,
                                    orderId: currentOrderId,
                                    qty: qty,
                                    price: roundedPrice,
                                    side: _side,
                                    type: _type,
                                    finalStatus: 'REJECTED',
                                    attempts: attemptCount,
                                    ...orderStatus
                                },
                                'grvt.submitOrder'
                            );
                        }
                    }

                    // Check timeout
                    if (Date.now() > timeoutTimestamp) {
                        // Timeout exceeded - cancel order automatically with retry
                        await wmSubmitCancelOrder(_grvt, currentOrderId, 2);

                        // Get final status after cancel
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const finalStatusResponse = await vmGetOrderStatusById(_grvt.instance, _grvt.trading.accountId, currentOrderId);

                        const finalStatus = finalStatusResponse.success ? finalStatusResponse.data : {};

                        return createResponse(
                            true,
                            'Order cancelled due to timeout',
                            {
                                symbol: _symbol,
                                externalId: currentOrderId,
                                orderId: currentOrderId,
                                qty: qty,
                                price: roundedPrice,
                                side: _side,
                                type: _type,
                                finalStatus: 'TIMEOUT_CANCELLED',
                                ...finalStatus
                            },
                            'grvt.submitOrder'
                        );
                    }

                    // Continue monitoring (wait before next check)
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (monitorError) {
                    // If monitoring fails, break the loop
                    console.error('Error during order monitoring:', monitorError.message);
                    break;
                }
            }

            // If we exit the loop (max retries or error), return current state
            return createResponse(
                true,
                'Order monitoring completed',
                {
                    symbol: _symbol,
                    externalId: currentOrderId,
                    orderId: currentOrderId,
                    qty: qty,
                    price: roundedPrice,
                    side: _side,
                    type: _type,
                    attempts: attemptCount
                },
                'grvt.submitOrder'
            );
        }

        // 10. Return order submission result (no monitoring)
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                externalId: externalId,
                orderId: externalId,
                qty: qty,
                price: roundedPrice,
                side: _side,
                type: _type
            },
            'grvt.submitOrder'
        );

    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to submit order';
        return createResponse(false, message, null, 'grvt.submitOrder');
    }
}

/**
 * @async
 * @function wmSubmitCancelOrder
 * @description Cancels order via Python SDK using external_id with automatic retry
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string} _externalId - External order ID to cancel
 * @param {number} [_retry=0] - Number of retry attempts if cancel fails
 * @returns {Promise<Object>} Response with cancel confirmation
 */
export async function wmSubmitCancelOrder(_grvt, _externalId, _retry = 0) {
    if (!_externalId) {
        return createResponse(false, 'External ID is required', null, 'grvt.submitCancelOrder');
    }

    let lastError = null;

    for (let attempt = 0; attempt <= _retry; attempt++) {
        try {
            const cancelParams = {
                external_id: _externalId.toString()
            };

            const cancelResult = await _grvt._sendCommand('cancel_order_by_external_id', cancelParams);

            if (cancelResult.error) {
                throw new Error(cancelResult.error);
            }

            return createResponse(
                true,
                'success',
                {
                    externalId: _externalId,
                    attempts: attempt + 1
                },
                'grvt.submitCancelOrder'
            );

        } catch (error) {
            lastError = error;

            // If this is not the last attempt, wait before retrying
            if (attempt < _retry) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
        }
    }

    // All attempts failed
    const message = lastError?.response?.data?.error?.message || lastError?.message || 'Failed to cancel order';
    return createResponse(false, message, { externalId: _externalId, attempts: _retry + 1 }, 'grvt.submitCancelOrder');
}

/**
 * @async
 * @function wmSubmitCloseOrder
 * @description Closes position via Python SDK with reduce_only and automatic monitoring
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {number} _slippage - Slippage percentage
 * @param {string} _type - Order type
 * @param {string} _symbol - Market symbol
 * @param {string} _marketUnit - Market unit
 * @param {number} _orderQty - Quantity
 * @param {boolean} _closeAll - Close entire position
 * @param {Function} [_onOrderUpdate] - Optional callback for order status updates
 * @param {number} [_retry=0] - Number of retry attempts if order is REJECTED
 * @param {number} [_timeout=60000] - Maximum timeout in milliseconds (resets when qtyExe changes)
 * @returns {Promise<Object>} Response with close confirmation and final status
 */
export async function wmSubmitCloseOrder(_grvt, _slippage, _type, _symbol, _marketUnit, _orderQty, _closeAll, _onOrderUpdate, _retry = 0, _timeout = 60000) {
    try {
        if (!_symbol) {
            throw new Error('Symbol is required');
        }

        // Wait for authentication if needed
        if (_grvt.trading && _grvt.trading.authPromise) {
            await _grvt.trading.authPromise;
        }

        let closeSide;
        let closeQuantity;
        let positionSize = '0';
        let positionSide = null;

        const positionResponse = await vmGetOpenPositionDetail(_grvt.instance, _grvt.trading.accountId, _symbol);
        if (!positionResponse.success) {
            throw new Error(positionResponse.message || `No open position found for ${_symbol}`);
        }

        const positionDetail = positionResponse.data;
        positionSide = positionDetail.side;
        positionSize = positionDetail.qty;

        if (!positionSide || !positionSize || parseFloat(positionSize) === 0) {
            throw new Error('Position size is zero or position not found');
        }

        // 2. Determine close quantity and opposite side
        if (_closeAll) {
            closeQuantity = parseFloat(positionSize);
        } else {
            if (!_orderQty || _orderQty <= 0) {
                throw new Error('Order quantity must be greater than zero when closeAll=false');
            }
            closeQuantity = _orderQty;
        }

        closeSide = positionSide === 'long' ? grvtEnum.orderSide.short : grvtEnum.orderSide.long;

        // 2. Get market prices
        const pricesResponse = await vmGetMarketDataPrices(_grvt.marketDataInstance, _symbol);
        if (!pricesResponse.success) {
            throw new Error(pricesResponse.message);
        }

        const prices = pricesResponse.data;
        const midPrice = parseFloat(prices.midPrice);

        // 3. Get market order size configuration
        const orderSizeResponse = await vmGetMarketOrderSize(_grvt.marketDataInstance, _symbol);
        if (!orderSizeResponse.success) {
            throw new Error(orderSizeResponse.message);
        }

        const orderSizeConfig = orderSizeResponse.data;
        const qtyStep = parseFloat(orderSizeConfig.mainCoin.qtyStep);
        const minQty = parseFloat(orderSizeConfig.mainCoin.minQty);
        const priceDecimals = orderSizeConfig.priceDecimals;

        // Calculate price step from priceDecimals
        const priceStep = parseFloat('0.' + '0'.repeat(priceDecimals - 1) + '1');

        // 4. Calculate order price
        const isBuy = closeSide === grvtEnum.orderSide.long;
        let actPrice;

        if (_type === grvtEnum.orderType.market) {
            actPrice = calculateSlippagePrice(midPrice, _slippage, isBuy);
        } else {
            // LIMIT order price logic
            const bidPrice = parseFloat(prices.bestBidPrice || 0);
            const askPrice = parseFloat(prices.bestAskPrice || 0);
            const spread = askPrice - bidPrice;

            if (isBuy) {
                // LONG: use BID if BID=ASK or spread > priceStep, otherwise midPrice
                if (bidPrice === askPrice || spread > priceStep) {
                    actPrice = bidPrice;
                } else {
                    actPrice = midPrice;
                }
            } else {
                // SHORT: use ASK if BID=ASK or spread > priceStep, otherwise midPrice
                if (bidPrice === askPrice || spread > priceStep) {
                    actPrice = askPrice;
                } else {
                    actPrice = midPrice;
                }
            }
        }

        const roundedPrice = roundToTickSize(actPrice, priceStep);

        // 5. Format quantity
        const isQuoteOnSecCoin = (_marketUnit === grvtEnum.marketUnit.quoteOnSecCoin) && !_closeAll;
        const qty = formatOrderQuantity(
            closeQuantity,
            isQuoteOnSecCoin,
            actPrice,
            qtyStep
        );

        // 6. Validate
        const validation = validateOrderParams({
            symbol: _symbol,
            side: closeSide,
            type: _type,
            qty: qty,
            price: roundedPrice,
            minQty: minQty
        });

        if (!validation.success) {
            throw new Error(validation.message);
        }

        // 7. Prepare close order parameters
        const sdkSide = closeSide === grvtEnum.orderSide.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === grvtEnum.orderType.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;

        // Build order parameters - MARKET orders must NOT include price
        const orderParams = {
            market_name: _symbol,
            side: sdkSide,
            amount: qty.toString(),
            order_type: sdkOrderType,
            time_in_force: timeInForce,
            reduce_only: true
        };

        // Only add price and post_only for LIMIT orders
        if (sdkOrderType === 'LIMIT') {
            orderParams.price = roundedPrice.toString();
            orderParams.post_only = true;
        }

        // 8. Submit close order
        const orderResult = await _grvt._sendCommand('place_order', orderParams);

        if (orderResult.error) {
            throw new Error(orderResult.error);
        }

        // Use the order_id returned by GRVT as externalId
        const externalId = orderResult.order_id || orderResult.client_order_id;

        if (!externalId) {
            throw new Error('No order_id returned from GRVT');
        }

        // 9. If retry/timeout logic is enabled, monitor the order
        if (_retry > 0 || (_onOrderUpdate && typeof _onOrderUpdate === 'function')) {
            let attemptCount = 0;
            let currentOrderId = externalId;
            let lastQtyExe = '0.0';
            let lastStatus = null;
            let lastAvgPrice = '0.0';
            let timeoutTimestamp = Date.now() + _timeout;

            while (attemptCount <= _retry) {
                try {
                    // Wait a bit before checking status (give server time to process)
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Get order status
                    const statusResponse = await vmGetOrderStatusById(_grvt.instance, _grvt.trading.accountId, currentOrderId);

                    if (!statusResponse.success) {
                        throw new Error(statusResponse.message || 'Failed to get order status');
                    }

                    const orderStatus = statusResponse.data;
                    const currentStatus = orderStatus.status;
                    const currentQtyExe = orderStatus.qtyExe || '0.0';
                    const currentAvgPrice = orderStatus.avgPrice || '0.0';

                    // Check if data has changed
                    const dataChanged =
                        currentStatus !== lastStatus ||
                        currentQtyExe !== lastQtyExe ||
                        currentAvgPrice !== lastAvgPrice;

                    // Call callback if provided and data changed
                    if (_onOrderUpdate && typeof _onOrderUpdate === 'function' && dataChanged) {
                        _onOrderUpdate({
                            symbol: _symbol,
                            externalId: currentOrderId,
                            orderId: currentOrderId,
                            status: currentStatus,
                            ...orderStatus
                        });

                        // Update last known values
                        lastStatus = currentStatus;
                        lastAvgPrice = currentAvgPrice;
                    }

                    // Check if qtyExe changed - reset timeout
                    if (currentQtyExe !== lastQtyExe && parseFloat(currentQtyExe) > 0) {
                        lastQtyExe = currentQtyExe;
                        timeoutTimestamp = Date.now() + _timeout;
                    }

                    // Check for final states
                    if (currentStatus === 'FILLED' || currentStatus === 'CANCELLED' || currentStatus === 'EXPIRED') {
                        return createResponse(
                            true,
                            `Close order ${currentStatus.toLowerCase()}`,
                            {
                                symbol: _symbol,
                                externalId: currentOrderId,
                                orderId: currentOrderId,
                                closedQty: qty,
                                price: roundedPrice,
                                finalStatus: currentStatus,
                                ...orderStatus
                            },
                            'grvt.submitCloseOrder'
                        );
                    }

                    // Check for REJECTED state
                    if (currentStatus === 'REJECTED') {
                        if (attemptCount < _retry) {
                            attemptCount++;

                            // Cancel the rejected order with retry
                            await wmSubmitCancelOrder(_grvt, currentOrderId, 2);

                            // Re-submit the close order with same parameters (always reduce_only)
                            const retryOrderParams = {
                                market_name: _symbol,
                                side: sdkSide,
                                amount: qty.toString(),
                                order_type: sdkOrderType,
                                time_in_force: timeInForce,
                                reduce_only: true,
                                external_id: randomUUID()
                            };

                            // Only add price and post_only for LIMIT orders
                            if (sdkOrderType === 'LIMIT') {
                                retryOrderParams.price = roundedPrice.toString();
                                retryOrderParams.post_only = true;
                            }

                            const retryResult = await _grvt._sendCommand('place_order', retryOrderParams);
                            currentOrderId = retryResult.order_id || retryResult.client_order_id;

                            if (!currentOrderId) {
                                throw new Error('No order_id returned from retry attempt');
                            }

                            // Reset timeout for new order
                            timeoutTimestamp = Date.now() + _timeout;
                            lastQtyExe = '0.0';

                            continue;
                        } else {
                            // Max retries reached, return with REJECTED status
                            return createResponse(
                                false,
                                'Close order rejected after maximum retry attempts',
                                {
                                    symbol: _symbol,
                                    externalId: currentOrderId,
                                    orderId: currentOrderId,
                                    closedQty: qty,
                                    price: roundedPrice,
                                    finalStatus: 'REJECTED',
                                    attempts: attemptCount,
                                    ...orderStatus
                                },
                                'grvt.submitCloseOrder'
                            );
                        }
                    }

                    // Check timeout
                    if (Date.now() > timeoutTimestamp) {
                        // Timeout exceeded - cancel order automatically with retry
                        await wmSubmitCancelOrder(_grvt, currentOrderId, 2);

                        // Get final status after cancel
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const finalStatusResponse = await vmGetOrderStatusById(_grvt.instance, _grvt.trading.accountId, currentOrderId);

                        const finalStatus = finalStatusResponse.success ? finalStatusResponse.data : {};

                        return createResponse(
                            true,
                            'Close order cancelled due to timeout',
                            {
                                symbol: _symbol,
                                externalId: currentOrderId,
                                orderId: currentOrderId,
                                closedQty: qty,
                                price: roundedPrice,
                                finalStatus: 'TIMEOUT_CANCELLED',
                                ...finalStatus
                            },
                            'grvt.submitCloseOrder'
                        );
                    }

                    // Continue monitoring (wait before next check)
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (monitorError) {
                    // If monitoring fails, break the loop
                    console.error('Error during close order monitoring:', monitorError.message);
                    break;
                }
            }

            // If we exit the loop (max retries or error), return current state
            return createResponse(
                true,
                'Close order monitoring completed',
                {
                    symbol: _symbol,
                    externalId: currentOrderId,
                    orderId: currentOrderId,
                    closedQty: qty,
                    price: roundedPrice,
                    attempts: attemptCount
                },
                'grvt.submitCloseOrder'
            );
        }

        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                orderId: externalId,
                externalId: externalId,
                closedQty: qty,
                price: roundedPrice
            },
            'grvt.submitCloseOrder'
        );

    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to submit close order';
        return createResponse(false, message, null, 'grvt.submitCloseOrder');
    }
}



/**
 * @async
 * @function wmTransferToTrading
 * @description Transfers funds from Funding account to Trading account
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string|number} _amount - Amount to transfer
 * @param {string} [_currency='USDC'] - Currency to transfer
 * @returns {Promise<Object>} Response with transfer result
 */
export async function wmTransferToTrading(_grvt, _amount, _currency = 'USDC') {
    try {
        // Wait for Python service to initialize (max 5 seconds)
        for (let i = 0; i < 50 && !_grvt.pythonService; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!_grvt.pythonService) {
            throw new Error('Python service failed to initialize');
        }
        
        const result = await _grvt._sendCommand('transfer', {
            amount: _amount.toString(),
            currency: _currency,
            direction: 'to_trading',
            funding_address: _grvt.funding.address,
            funding_private_key: _grvt.funding.privateKey,
            funding_api_key: _grvt.funding.apiKey,
            trading_address: _grvt.trading.address,
            trading_account_id: _grvt.trading.accountId,
            trading_private_key: _grvt.trading.privateKey,
            trading_api_key: _grvt.trading.apiKey,
            environment: _grvt.environment
        });

        if (result.error) {
            throw new Error(result.error);
        }

        return createResponse(true, 'Funds transferred to trading account', result, 'grvt.transferToTrading');
    } catch (error) {
        return createResponse(false, error.message, null, 'grvt.transferToTrading');
    }
}

/**
 * @async
 * @function wmTransferToFunding
 * @description Transfers funds from Trading account to Funding account (required before withdrawal)
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string|number} _amount - Amount to transfer
 * @param {string} [_currency='USDC'] - Currency to transfer
 * @returns {Promise<Object>} Response with transfer result
 */
export async function wmTransferToFunding(_grvt, _amount, _currency = 'USDC') {
    try {
        // Wait for Python service to initialize (max 5 seconds)
        for (let i = 0; i < 50 && !_grvt.pythonService; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!_grvt.pythonService) {
            throw new Error('Python service failed to initialize');
        }
        
        const result = await _grvt._sendCommand('transfer', {
            amount: _amount.toString(),
            currency: _currency,
            direction: 'to_funding',
            funding_address: _grvt.funding.address,
            funding_private_key: _grvt.funding.privateKey,
            funding_api_key: _grvt.funding.apiKey,
            trading_address: _grvt.trading.address,
            trading_account_id: _grvt.trading.accountId,
            trading_private_key: _grvt.trading.privateKey,
            trading_api_key: _grvt.trading.apiKey,
            environment: _grvt.environment
        });

        if (result.error) {
            throw new Error(result.error);
        }

        return createResponse(true, 'Funds transferred to funding account', result, 'grvt.transferToFunding');
    } catch (error) {
        return createResponse(false, error.message, null, 'grvt.transferToFunding');
    }
}
/**
 * @async
 * @function wmVaultInvest
 * @description Invests funds in a vault with automatic EIP712 signing
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string} _vaultId - Vault ID to invest in
 * @param {string|number} _amount - Amount to invest
 * @param {string} [_currency='USDT'] - Currency to invest
 * @returns {Promise<Object>} Response with investment result
 */
export async function wmVaultInvest(_grvt, _vaultId, _amount, _currency = 'USDT') {
    try {
        // Wait for Python service to initialize (max 5 seconds)
        for (let i = 0; i < 50 && !_grvt.pythonService; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!_grvt.pythonService) {
            throw new Error('Python service failed to initialize');
        }
        
        const result = await _grvt._sendCommand('vault_invest', {
            vault_id: _vaultId,
            amount: _amount.toString(),
            currency: _currency,
            funding_address: _grvt.funding.address,
            funding_private_key: _grvt.funding.privateKey,
            funding_api_key: _grvt.funding.apiKey,
            trading_account_id: _grvt.trading.accountId,
            environment: _grvt.environment
        });

        if (result.error) {
            throw new Error(result.error);
        }

        return createResponse(true, 'Successfully invested in vault', result, 'grvt.vaultInvest');
    } catch (error) {
        return createResponse(false, error.message, null, 'grvt.vaultInvest');
    }
}

/**
 * @async
 * @function wmVaultRedeem
 * @description Redeems LP tokens from a vault with automatic EIP712 signing
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string} _vaultId - Vault ID to redeem from
 * @param {string|number} _amount - Amount of LP tokens to redeem
 * @param {string} [_currency='USDT'] - Currency of the vault
 * @returns {Promise<Object>} Response with redemption result
 */
export async function wmVaultRedeem(_grvt, _vaultId, _amount, _currency = 'USDT') {
    try {
        // Wait for Python service to initialize (max 5 seconds)
        for (let i = 0; i < 50 && !_grvt.pythonService; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!_grvt.pythonService) {
            throw new Error('Python service failed to initialize');
        }
        
        const result = await _grvt._sendCommand('vault_redeem', {
            vault_id: _vaultId,
            amount: _amount.toString(),
            currency: _currency,
            funding_address: _grvt.funding.address,
            funding_private_key: _grvt.funding.privateKey,
            funding_api_key: _grvt.funding.apiKey,
            trading_account_id: _grvt.trading.accountId,
            environment: _grvt.environment
        });

        if (result.error) {
            throw new Error(result.error);
        }

        return createResponse(true, 'Successfully redeemed from vault', result, 'grvt.vaultRedeem');
    } catch (error) {
        return createResponse(false, error.message, null, 'grvt.vaultRedeem');
    }
}