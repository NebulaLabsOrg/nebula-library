/**
 * GRVT Write Model
 * Following NebulaLabs architecture pattern
 * 
 * Write Layer (wm* functions):
 * - Use Python SDK via _grvt._sendCommand()
 * - Call view functions internally for data
 * - Perform BigNumber calculations internally
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
    LIMIT_TIME_IN_FORCE
} from './constant.js';

/**
 * @async
 * @function wmSubmitOrder
 * @description Submits order via Python SDK
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {number} _slippage - Slippage percentage
 * @param {string} _type - Order type (MARKET or LIMIT)
 * @param {string} _symbol - Market symbol
 * @param {string} _side - Order side (BUY or SELL)
 * @param {string} _marketUnit - Market unit (main or secondary)
 * @param {number|string} _orderQty - Order quantity
 * @returns {Promise<Object>} Response with order ID
 */
export async function wmSubmitOrder(_grvt, _slippage, _type, _symbol, _side, _marketUnit, _orderQty) {
    try {
        // 1. Get market data
        const marketData = await vmGetMarketData(_grvt.marketDataInstance, _symbol);
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
        
        // 3. Calculate price
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        const isBuy = _side === grvtEnum.orderSide.long;
        const actPrice = _type === grvtEnum.orderType.market
            ? calculateSlippagePrice(midPrice, _slippage, isBuy)
            : midPrice;
        
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
        const postOnly = sdkOrderType === 'LIMIT';
        
        // 7. Submit order via SDK
        const orderResult = await _grvt._sendCommand('place_order', {
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
        
        // 8. Return order submission result
        return createResponse(
            true,
            'Order submitted successfully',
            {
                symbol: _symbol,
                orderId: orderId,
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
 * @description Cancels order via Python SDK
 * @param {Object} _grvt - Grvt instance (for Python SDK access)
 * @param {string} _externalId - Order ID
 * @returns {Promise<Object>} Response with cancel confirmation
 */
export async function wmSubmitCancelOrder(_grvt, _externalId) {
    try {
        if (!_externalId) {
            throw new Error('External ID is required');
        }
        
        const cancelResult = await _grvt._sendCommand('cancel_order_by_external_id', {
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
        
        // 4. Get market data
        const marketData = await vmGetMarketData(_grvt.marketDataInstance, _symbol);
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
        const isBuy = closeSide === grvtEnum.orderSide.long;
        const actPrice = _type === grvtEnum.orderType.market
            ? calculateSlippagePrice(midPrice, _slippage, isBuy)
            : midPrice;
        
        const roundedPrice = roundToTickSize(actPrice, priceStep);
        
        // 6. Format quantity
        const isQuoteOnSecCoin = (_marketUnit === grvtEnum.marketUnit.quoteOnSecCoin) && !_closeAll;
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
        const sdkSide = closeSide === grvtEnum.orderSide.long ? 'BUY' : 'SELL';
        const sdkOrderType = _type === grvtEnum.orderType.market ? 'MARKET' : 'LIMIT';
        const timeInForce = sdkOrderType === 'MARKET' ? MARKET_TIME_IN_FORCE : LIMIT_TIME_IN_FORCE;
        const postOnly = sdkOrderType === 'LIMIT';
        
        const orderResult = await _grvt._sendCommand('place_order', {
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
        
        return createResponse(
            true,
            'Close order submitted successfully',
            {
                symbol: _symbol,
                orderId: orderId,
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
