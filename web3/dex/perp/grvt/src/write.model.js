/**
 * GRVT Extended Write Model
 * Following NebulaLabs architecture pattern
 * 
 * Write Layer (wm* functions):
 * - Use Python SDK via _extended._sendCommand()
 * - Call view functions internally for data
 * - Perform BigNumber calculations internally
 * - Embedded WebSocket monitoring for order state
 * - Use spawn/subprocess for isolation when calling Python SDK
 */

import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetMarketData, vmGetOpenPositionDetail } from './view.model.js';
import { 
    formatOrderQuantity, 
    calculateMidPrice, 
    countDecimals, 
    calculateSlippagePrice,
    validateOrderParams,
    roundToTickSize
} from './utils.js';
import { grvtEnum } from './enum.js';
import { 
    MARKET_TIME_IN_FORCE, 
    LIMIT_TIME_IN_FORCE,
    ORDER_MONITOR_INTERVAL_MS,
    ORDER_MONITOR_TIMEOUT_SEC
} from './constant.js';

/**
 * @async
 * @function wmSubmitOrder
 * @description Submits order via Python SDK with embedded WebSocket monitoring
 * @param {Object} _extended - Extended instance
 * @param {number} _slippage - Slippage percentage
 * @param {string} _type - Order type (MARKET or LIMIT)
 * @param {string} _symbol - Market symbol
 * @param {string} _side - Order side (BUY or SELL)
 * @param {string} _marketUnit - Market unit (main or secondary)
 * @param {number|string} _orderQty - Order quantity
 * @returns {Promise<Object>} Response with order ID and status after monitoring
 */
export async function wmSubmitOrder(_extended, _slippage, _type, _symbol, _side, _marketUnit, _orderQty) {
    try {
        // 1. Get market data
        const marketData = await vmGetMarketData(_extended, _symbol);
        if (!marketData.success) {
            throw new Error(marketData.message);
        }
        
        const market = marketData.data[0];
        const marketStats = market.market_stats || {};
        const tradingConfig = market.trading_config || {};
        
        // 2. Extract parameters
        const askPrice = parseFloat(marketStats.ask_price || market.ask_price || 0);
        const bidPrice = parseFloat(marketStats.bid_price || market.bid_price || 0);
        const qtyStep = parseFloat(tradingConfig.min_order_size_change || tradingConfig.size_step || 0.001);
        const minQty = parseFloat(tradingConfig.min_order_size || tradingConfig.min_size || 0);
        const priceStep = parseFloat(tradingConfig.min_price_change || tradingConfig.price_step || 0.01);
        const priceDecimals = countDecimals(priceStep);
        
        // 3. Calculate price with BigNumber
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        const isBuy = _side === extendedEnum.order.long;
        const actPrice = _type === grvtEnum.orderType.market
            ? calculateSlippagePrice(midPrice, _slippage, isBuy)
            : midPrice;
        
        // Round to tick size
        const roundedPrice = roundToTickSize(actPrice, priceStep);
        
        // 4. Format quantity
        const isQuoteOnSecCoin = _marketUnit === extendedEnum.order.quoteOnSecCoin;
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
        const sdkSide = _side === extendedEnum.order.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === grvtEnum.orderType.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;
        const postOnly = sdkOrderType === 'LIMIT';
        
        // 7. Submit order via SDK
        const orderResult = await _extended._sendCommand('place_order', {
            market_name: _symbol,
            side: sdkSide,
            amount: qty.toString(),
            price: roundedPrice.toString(),
            order_type: sdkOrderType,
            time_in_force: timeInForce,
            post_only: postOnly
        });
        
        if (orderResult.error) {
            throw new Error(orderResult.error);
        }
        
        const orderId = orderResult.external_id || orderResult.order_id;
        
        // 8. EMBEDDED WEBSOCKET MONITORING
        // Monitor order state until terminal status
        const finalState = await _monitorOrderState(
            _extended,
            orderId,
            _symbol,
            ORDER_MONITOR_TIMEOUT_SEC
        );
        
        // 9. Return final state
        return createResponse(
            finalState.success !== false,
            finalState.message || 'Order submitted and monitored',
            {
                symbol: _symbol,
                orderId: orderId,
                status: finalState.status,
                filledQty: finalState.filledQty || '0',
                avgPrice: finalState.avgPrice || actPrice,
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
 * @function _monitorOrderState
 * @description EMBEDDED: Monitor order via WebSocket until terminal state
 * @private
 * @param {Object} _extended - Extended instance
 * @param {string} _orderId - Order ID to monitor
 * @param {string} _symbol - Symbol for filtering
 * @param {number} _timeoutSec - Timeout in seconds
 * @returns {Promise<Object>} Final order state
 */
async function _monitorOrderState(_extended, _orderId, _symbol, _timeoutSec = 120) {
    return new Promise((resolve) => {
        let finalState = null;
        let checkInterval = null;
        
        const checkOrderStatus = async () => {
            try {
                // Get positions to check order status
                const positions = await _extended._sendCommand('get_positions');
                
                if (positions.error) {
                    console.error('Error checking positions:', positions.error);
                    return;
                }
                
                const position = positions.find(p => 
                    p.market === _symbol || p.instrument === _symbol
                );
                
                if (position && position.last_order_id === _orderId) {
                    const orderStatus = position.last_order_status;
                    
                    // Check if terminal state
                    const terminalStates = [
                        grvtEnum.orderState.filled,
                        grvtEnum.orderState.cancelled,
                        grvtEnum.orderState.rejected,
                        grvtEnum.orderState.expired
                    ];
                    
                    if (terminalStates.includes(orderStatus)) {
                        finalState = {
                            success: orderStatus === grvtEnum.orderState.filled,
                            status: orderStatus,
                            filledQty: position.size || '0',
                            avgPrice: position.open_price || position.entry_price || '0',
                            message: `Order ${orderStatus.toLowerCase()}`
                        };
                        
                        clearInterval(checkInterval);
                        resolve(finalState);
                    }
                }
            } catch (error) {
                console.error('Error monitoring order:', error);
            }
        };
        
        // Check every ORDER_MONITOR_INTERVAL_MS (500ms)
        checkInterval = setInterval(checkOrderStatus, ORDER_MONITOR_INTERVAL_MS);
        
        // Timeout after specified seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!finalState) {
                finalState = {
                    success: false,
                    status: 'TIMEOUT',
                    message: `Order monitoring timeout after ${_timeoutSec}s`
                };
                resolve(finalState);
            }
        }, _timeoutSec * 1000);
    });
}

/**
 * @async
 * @function wmSubmitCancelOrder
 * @description Cancels order via Python SDK
 * @param {Object} _extended - Extended instance
 * @param {string} _externalId - Order ID
 * @returns {Promise<Object>} Response with cancel confirmation
 */
export async function wmSubmitCancelOrder(_extended, _externalId) {
    try {
        if (!_externalId) {
            throw new Error('External ID is required');
        }
        
        const cancelResult = await _extended._sendCommand('cancel_order_by_external_id', {
            external_id: _externalId.toString()
        });
        
        if (cancelResult.error) {
            throw new Error(cancelResult.error);
        }
        
        return createResponse(
            true,
            'Order cancelled successfully',
            { 
                externalId: _externalId,
                cancelled: true
            },
            'grvt.submitCancelOrder'
        );
        
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to cancel order';
        return createResponse(false, message, null, 'grvt.submitCancelOrder');
    }
}

/**
 * @async
 * @function wmSubmitCloseOrder
 * @description Closes position via Python SDK with reduce_only
 * @param {Object} _extended - Extended instance
 * @param {number} _slippage - Slippage percentage
 * @param {string} _type - Order type
 * @param {string} _symbol - Market symbol
 * @param {string} _marketUnit - Market unit
 * @param {number} _orderQty - Quantity
 * @param {boolean} _closeAll - Close entire position
 * @returns {Promise<Object>} Response with close confirmation and monitoring
 */
export async function wmSubmitCloseOrder(_extended, _slippage, _type, _symbol, _marketUnit, _orderQty, _closeAll) {
    try {
        if (!_symbol) {
            throw new Error('Symbol is required');
        }
        
        // 1. Get position details
        const positionResponse = await vmGetOpenPositionDetail(_extended, _symbol);
        if (!positionResponse.success) {
            throw new Error(positionResponse.message || `No open position found for ${_symbol}`);
        }
        
        const positionDetail = positionResponse.data;
        const { side, qty: positionQty } = positionDetail;
        
        if (!positionQty || positionQty === 0) {
            throw new Error('Position size is zero');
        }
        
        // 2. Determine close quantity
        const closeQuantity = _closeAll ? positionQty : _orderQty;
        
        if (closeQuantity <= 0) {
            throw new Error('Close quantity must be greater than zero');
        }
        
        // 3. Determine opposite side
        const closeSide = side === 'long' ? extendedEnum.order.short : extendedEnum.order.long;
        
        // 4. Get market data
        const marketData = await vmGetMarketData(_extended, _symbol);
        if (!marketData.success) {
            throw new Error(marketData.message);
        }
        
        const market = marketData.data[0];
        const marketStats = market.market_stats || {};
        const tradingConfig = market.trading_config || {};
        
        // 5. Extract parameters and calculate price
        const askPrice = parseFloat(marketStats.ask_price || market.ask_price || 0);
        const bidPrice = parseFloat(marketStats.bid_price || market.bid_price || 0);
        const qtyStep = parseFloat(tradingConfig.min_order_size_change || tradingConfig.size_step || 0.001);
        const minQty = parseFloat(tradingConfig.min_order_size || tradingConfig.min_size || 0);
        const priceStep = parseFloat(tradingConfig.min_price_change || tradingConfig.price_step || 0.01);
        const priceDecimals = countDecimals(priceStep);
        
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        const isBuy = closeSide === extendedEnum.order.long;
        const actPrice = _type === grvtEnum.orderType.market
            ? calculateSlippagePrice(midPrice, _slippage, isBuy)
            : midPrice;
        
        const roundedPrice = roundToTickSize(actPrice, priceStep);
        
        // 6. Format quantity
        const isQuoteOnSecCoin = (_marketUnit === extendedEnum.order.quoteOnSecCoin) && !_closeAll;
        const qty = formatOrderQuantity(
            closeQuantity,
            isQuoteOnSecCoin,
            actPrice,
            qtyStep
        );
        
        // 7. Validate
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
        
        // 8. Submit close order
        const sdkSide = closeSide === extendedEnum.order.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === grvtEnum.orderType.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;
        const postOnly = sdkOrderType === 'LIMIT';
        
        const orderResult = await _extended._sendCommand('place_order', {
            market_name: _symbol,
            side: sdkSide,
            amount: qty.toString(),
            price: roundedPrice.toString(),
            order_type: sdkOrderType,
            time_in_force: timeInForce,
            post_only: postOnly,
            reduce_only: true
        });
        
        if (orderResult.error) {
            throw new Error(orderResult.error);
        }
        
        const orderId = orderResult.external_id || orderResult.order_id;
        
        // 9. EMBEDDED WEBSOCKET MONITORING
        const finalState = await _monitorOrderState(
            _extended,
            orderId,
            _symbol,
            ORDER_MONITOR_TIMEOUT_SEC
        );
        
        return createResponse(
            finalState.success !== false,
            finalState.message || 'Position closed',
            {
                symbol: _symbol,
                orderId: orderId,
                status: finalState.status,
                closedQty: qty,
                avgPrice: finalState.avgPrice || actPrice
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
 * @function wmSubmitWithdrawal
 * @description Submits withdrawal via Python SDK
 * @param {Object} _extended - Extended instance
 * @param {string} _amount - Withdrawal amount
 * @param {string} [_starkAddress] - Recipient address
 * @returns {Promise<Object>} Response with withdrawal ID
 */
export async function wmSubmitWithdrawal(_extended, _amount, _starkAddress = null) {
    try {
        if (!_amount || parseFloat(_amount) <= 0) {
            throw new Error('Amount must be a positive number');
        }
        
        // Check available balance
        const accountInfo = await _extended._sendCommand('get_account_info');
        if (accountInfo.error) {
            throw new Error(`Failed to get account info: ${accountInfo.error}`);
        }
        
        const availableForWithdrawal = parseFloat(accountInfo.available_for_withdrawal || 0);
        const withdrawalAmount = parseFloat(_amount);
        
        if (withdrawalAmount > availableForWithdrawal) {
            throw new Error(
                `Insufficient balance for withdrawal. Available: ${availableForWithdrawal}, Requested: ${withdrawalAmount}`
            );
        }
        
        // Submit withdrawal
        const withdrawalParams = {
            amount: _amount.toString(),
            currency: 'USDC',
            chain_id: 'STRK'
        };
        
        if (_starkAddress) {
            withdrawalParams.stark_address = _starkAddress;
        }
        
        const withdrawalResult = await _extended._sendCommand('withdraw', withdrawalParams);
        
        if (withdrawalResult.error) {
            throw new Error(withdrawalResult.error);
        }
        
        return createResponse(
            true,
            'Withdrawal submitted successfully',
            {
                withdrawalId: withdrawalResult.withdrawal_id,
                amount: _amount,
                status: 'PENDING'
            },
            'grvt.submitWithdrawal'
        );
        
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to submit withdrawal';
        return createResponse(false, message, null, 'grvt.submitWithdrawal');
    }
}

/**
 * @async
 * @function wmCancelAllOrders
 * @description Cancels all open orders via Python SDK
 * @param {Object} _extended - Extended instance
 * @param {string} [_symbol] - Optional symbol to cancel orders for specific market
 * @returns {Promise<Object>} Response with cancel confirmation
 */
export async function wmCancelAllOrders(_extended, _symbol = null) {
    try {
        const params = {};
        if (_symbol) {
            params.instrument = _symbol;
        }
        
        const cancelResult = await _extended._sendCommand('cancel_all_orders', params);
        
        if (cancelResult.error) {
            throw new Error(cancelResult.error);
        }
        
        return createResponse(
            true,
            _symbol 
                ? `All orders cancelled for ${_symbol}` 
                : 'All orders cancelled',
            {
                symbol: _symbol,
                cancelledCount: cancelResult.cancelled_count || 0
            },
            'grvt.cancelAllOrders'
        );
        
    } catch (error) {
        const message = error.message || 'Failed to cancel all orders';
        return createResponse(false, message, null, 'grvt.cancelAllOrders');
    }
}

/**
 * @async
 * @function wmTransferToTrading
 * @description Transfers funds from Funding account to Trading account
 * @param {Object} _extended - Extended instance
 * @param {string|number} _amount - Amount to transfer
 * @param {string} [_currency='USDC'] - Currency to transfer
 * @returns {Promise<Object>} Response with transfer result
 */
export async function wmTransferToTrading(_extended, _amount, _currency = 'USDC') {
    try {
        const result = await _extended._sendCommand('transfer', {
            params: {
                amount: _amount.toString(),
                currency: _currency,
                direction: 'to_trading'
            }
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
 * @param {Object} _extended - Extended instance
 * @param {string|number} _amount - Amount to transfer
 * @param {string} [_currency='USDC'] - Currency to transfer
 * @returns {Promise<Object>} Response with transfer result
 */
export async function wmTransferToFunding(_extended, _amount, _currency = 'USDC') {
    try {
        const result = await _extended._sendCommand('transfer', {
            params: {
                amount: _amount.toString(),
                currency: _currency,
                direction: 'to_funding'
            }
        });
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return createResponse(true, 'Funds transferred to funding account', result, 'grvt.transferToFunding');
    } catch (error) {
        return createResponse(false, error.message, null, 'grvt.transferToFunding');
    }
}
