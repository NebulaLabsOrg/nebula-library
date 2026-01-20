import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetMarketDataPrices, vmGetMarketOrderSize, vmGetOpenPositionDetail } from './view.model.js';
import { 
    formatOrderQuantity, 
    countDecimals, 
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
 * @description Submits order via Python SDK with WebSocket monitoring
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {number} _slippage - Slippage percentage
 * @param {string} _type - Order type (MARKET or LIMIT)
 * @param {string} _symbol - Market symbol
 * @param {string} _side - Order side (BUY or SELL)
 * @param {string} _marketUnit - Market unit (main or secondary)
 * @param {number|string} _orderQty - Order quantity
 * @param {Function} [_onOrderUpdate] - Optional callback for order status updates
 * @returns {Promise<Object>} Response with order ID and WebSocket control functions
 */
export async function wmSubmitOrder(_grvt, _slippage, _type, _symbol, _side, _marketUnit, _orderQty, _onOrderUpdate) {
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
        
        // 9. Return order submission result
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
 * @description Cancels order via Python SDK using external_id
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string} _externalId - External order ID to cancel
 * @returns {Promise<Object>} Response with cancel confirmation
 */
export async function wmSubmitCancelOrder(_grvt, _externalId) {
    try {
        if (!_externalId) {
            throw new Error('External ID is required');
        }
        
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
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {number} _slippage - Slippage percentage
 * @param {string} _type - Order type
 * @param {string} _symbol - Market symbol
 * @param {string} _marketUnit - Market unit
 * @param {number} _orderQty - Quantity
 * @param {boolean} _closeAll - Close entire position
 * @returns {Promise<Object>} Response with close confirmation
 */
export async function wmSubmitCloseOrder(_grvt, _slippage, _type, _symbol, _marketUnit, _orderQty, _closeAll) {
    try {
        if (!_symbol) {
            throw new Error('Symbol is required');
        }
        
        // 1. Get position details
        const positionResponse = await vmGetOpenPositionDetail(_grvt.instance, _grvt.trading.accountId, _symbol);
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
        const closeSide = side === 'long' ? grvtEnum.orderSide.short : grvtEnum.orderSide.long;
        
        // 4. Get market prices
        const pricesResponse = await vmGetMarketDataPrices(_grvt.marketDataInstance, _symbol);
        if (!pricesResponse.success) {
            throw new Error(pricesResponse.message);
        }
        
        const prices = pricesResponse.data;
        const midPrice = parseFloat(prices.midPrice);
        
        // 5. Get market order size configuration
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
        
        // 6. Calculate order price
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
        
        // 7. Format quantity
        const isQuoteOnSecCoin = (_marketUnit === grvtEnum.marketUnit.quoteOnSecCoin) && !_closeAll;
        const qty = formatOrderQuantity(
            closeQuantity,
            isQuoteOnSecCoin,
            actPrice,
            qtyStep
        );
        
        // 8. Validate
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
        
        // 9. Prepare close order parameters
        const sdkSide = closeSide === grvtEnum.orderSide.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === grvtEnum.orderType.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;
        
        // Generate unique external_id for tracking
        const externalId = randomUUID();
        
        // Build order parameters - MARKET orders must NOT include price
        const orderParams = {
            market_name: _symbol,
            side: sdkSide,
            amount: qty.toString(),
            order_type: sdkOrderType,
            time_in_force: timeInForce,
            reduce_only: true,
            external_id: externalId
        };
        
        // Only add price and post_only for LIMIT orders
        if (sdkOrderType === 'LIMIT') {
            orderParams.price = roundedPrice.toString();
            orderParams.post_only = true;
        }
        
        // 10. Submit close order
        const orderResult = await _grvt._sendCommand('place_order', orderParams);
        
        if (orderResult.error) {
            throw new Error(orderResult.error);
        }
        
        return createResponse(
            true,
            'Close order submitted successfully',
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
 * @function wmSubmitWithdrawal
 * @description Submits withdrawal via Python SDK
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string} _amount - Withdrawal amount
 * @param {string} [_starkAddress] - Recipient address
 * @returns {Promise<Object>} Response with withdrawal ID
 */
export async function wmSubmitWithdrawal(_grvt, _amount, _starkAddress = null) {
    try {
        if (!_amount || parseFloat(_amount) <= 0) {
            throw new Error('Amount must be a positive number');
        }
        
        // Check available balance
        const accountInfo = await _grvt._sendCommand('get_account_info');
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
        
        const withdrawalResult = await _grvt._sendCommand('withdraw', withdrawalParams);
        
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
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string} [_symbol] - Optional symbol to cancel orders for specific market
 * @returns {Promise<Object>} Response with cancel confirmation
 */
export async function wmCancelAllOrders(_grvt, _symbol = null) {
    try {
        const params = {};
        if (_symbol) {
            params.instrument = _symbol;
        }
        
        const cancelResult = await _grvt._sendCommand('cancel_all_orders', params);
        
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
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string|number} _amount - Amount to transfer
 * @param {string} [_currency='USDC'] - Currency to transfer
 * @returns {Promise<Object>} Response with transfer result
 */
export async function wmTransferToTrading(_grvt, _amount, _currency = 'USDC') {
    try {
        const result = await _grvt._sendCommand('transfer', {
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
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string|number} _amount - Amount to transfer
 * @param {string} [_currency='USDC'] - Currency to transfer
 * @returns {Promise<Object>} Response with transfer result
 */
export async function wmTransferToFunding(_grvt, _amount, _currency = 'USDC') {
    try {
        const result = await _grvt._sendCommand('transfer', {
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
