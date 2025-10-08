import { createResponse } from '../../../../../utils/src/response.utils.js';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves the wallet status using Python service
 * @param {Function} _pythonService - Configured Python service method
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet status data or an error message.
 */
export async function vmGetWalletStatus(_pythonService) {
    try {
        // Use the already configured and initialized Python service
        const accountInfo = await _pythonService('get_account_info');

        return createResponse(
            true,
            'success',
            {
                balance: accountInfo.balance,
                equity: accountInfo.equity,
            },
            'extended.getWalletStatus'
        );
    } catch (error) {
        const message = error.message || 'Failed to get wallet status';
        return createResponse(false, message, null, 'extended.getWalletStatus');
    }
}

/**
 * @async
 * @function vmGetWalletBalance
 * @description Retrieves the wallet balance using Python service
 * @param {Object} _pythonService - Configured Python service method
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet balance data or an error message.
 */
export async function vmGetWalletBalance(_pythonService) {
    try {
        // Use the already configured and initialized Python service
        const accountInfo = await _pythonService.call('get_account_info');

        return createResponse(
            true,
            'success',
            {
                availableForTrade: accountInfo.available_for_trade,
                availableForWithdrawal: accountInfo.available_for_withdrawal,
                unrealisedPnl: accountInfo.unrealised_pnl
            },
            'extended.getWalletBalance'
        );
    } catch (error) {
        const message = error.message || 'Failed to get wallet balance';
        return createResponse(false, message, null, 'extended.getWalletBalance');
    }
}

/**
 * @async
 * @function vmGetMarketData
 * @description Retrieves market data using Python service
 * @param {Object} _pythonService - Configured Python service method
 * @param {string} [_symbol=''] - (Optional) The market symbol to filter the results. If not provided, retrieves all markets.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the filtered market data or an error message.
 */
export async function vmGetMarketData(_pythonService, _symbol = '') {
    try {
        // Use the standardized get_markets method and filter on JavaScript side
        const markets = await _pythonService.call('get_markets');
        
        if (_symbol) {
            // Filter for specific market
            const market = markets.find(m => m.name === _symbol);
            
            if (!market) {
                return createResponse(false, `Market ${_symbol} not found`, null, 'extended.getMarketData');
            }
            
            // Return single market as array for consistency
            return createResponse(true, 'success', [market], 'extended.getMarketData');
        } else {
            // Return all active markets
            const activeMarkets = markets.filter(market => market.active !== false);
            return createResponse(true, 'success', activeMarkets, 'extended.getMarketData');
        }
    } catch (error) {
        const message = error.message || 'Failed to get market data';
        return createResponse(false, message, null, 'extended.getMarketData');
    }
}

/**
 * @async
 * @function vmGetMarketOrderSize
 * @description Retrieves the market order size configuration for a given symbol using Python service
 * @param {Object} _pythonService - Configured Python service method
 * @param {string} _symbol - The market symbol for which to retrieve order size configuration.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing order size configuration or an error message.
 */
export async function vmGetMarketOrderSize(_pythonService, _symbol) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const markets = await _pythonService.call('get_markets');
        const market = markets.find(m => m.name === _symbol);

        if (!market) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'extended.getMarketOrderSize');
        }

        return createResponse(
            true,
            'success',
            {
            symbol: _symbol,
            minQty: market.trading_config.min_order_size,
            qtyStep: market.trading_config.min_order_size_change,
            maxMktQty: market.trading_config.max_market_order_value,
            maxLimQty: market.trading_config.max_limit_order_value,
            priceDecimals: (market.trading_config.min_price_change?.toString().split('.')[1]?.length)
            },
            'extended.getMarketOrderSize'
        );
    } catch (error) {
        const message = error.message || 'Failed to get market order size';
        return createResponse(false, message, null, 'extended.getMarketOrderSize');
    }
}

/**
 * @async
 * @function vmGetFundingRateHour
 * @description Retrieves the hourly funding rate for a given market symbol
 * @param {Function} _pythonService - Configured Python service method
 * @param {string} _symbol - The market symbol for which to retrieve the funding rate.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the funding rate or an error message.
 */
export async function vmGetFundingRateHour(_pythonService, _symbol) {
    try {
        // Use standardized get_markets method and filter
        const markets = await _pythonService.call('get_markets');
        const market = markets.find(m => m.name === _symbol);
        
        if (!market) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'extended.getFundingRateHour');
        }
        
        return createResponse(
            true,
            'success',
            {
            symbol: _symbol,
            fundingRate: ((market.market_stats?.funding_rate * 100) / 8).toString()
            },
            'extended.getFundingRateHour'
        );
    } catch (error) {
        const message = error.message || 'Failed to get funding rate';
        return createResponse(false, message, null, 'extended.getFundingRateHour');
    }
}

/**
 * @async
 * @function vmGetMarketOpenInterest
 * @description Retrieves the open interest for a given market symbol using Python service
 * @param {Function} _pythonService - Configured Python service method
 * @param {string} _symbol - The market symbol for which to retrieve the open interest.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open interest data or an error message.
 */
export async function vmGetMarketOpenInterest(_pythonService, _symbol){
    try {
        // Use standardized get_markets method and filter
        const markets = await _pythonService.call('get_markets');
        const market = markets.find(m => m.name === _symbol);
        
        if (!market) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'extended.getMarketOpenInterest');
        }
        
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                openInterest: market.market_stats.open_interest_base,
                openInterestUsd: market.market_stats.open_interest
            },
            'extended.getMarketOpenInterest'
        );
    } catch (error) {
        const message = error.message || 'Failed to get market open interest';
        return createResponse(false, message, null, 'extended.getMarketOpenInterest');
    }
}

/**
 * @async
 * @function vmGetOpenPositions
 * @description Retrieves the user's open positions using Python service
 * @param {Object} _pythonService - Configured Python service method
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open positions data or an error message.
 */
export async function vmGetOpenPositions(_pythonService) {
    try {
        const positions = await _pythonService.call('get_positions');
        
        const openPositions = positions.filter(pos => pos.size && parseFloat(pos.size) !== 0);
        const markets = openPositions.map(pos => pos.market);
        
        return createResponse(
            true,
            'success',
            { 
                openPositions: openPositions.length, 
                markets 
            },
            'extended.getOpenPositions'
        );
    } catch (error) {
        const message = error.message || 'Failed to get open positions';
        return createResponse(false, message, null, 'extended.getOpenPositions');
    }
}

/**
 * @async
 * @function vmGetOpenPositionDetail
 * @description Retrieves the details of the user's open position for a specific market symbol using Python service
 * @param {Object} _pythonService - Configured Python service method
 * @param {string} _symbol - The market symbol for which to retrieve the open position details.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open position details or an error message.
 */
export async function vmGetOpenPositionDetail(_pythonService, _symbol) {
    try {
        const positions = await _pythonService.call('get_positions');
        const position = positions.find(p => p.market === _symbol);

        if (!position || !position.size || parseFloat(position.size) === 0) {
            return createResponse(false, 'No position found', null, 'extended.getOpenPositionDetail');
        }

        const detail = {
            symbol: _symbol,
            avgPrice: position.open_price,
            unrealisedPnl: position.unrealised_pnl,
            realisedPnl: position.realised_pnl,
            side: position.side.toLowerCase(),
            qty: Math.abs(position.size),
            qtyUsd: position.value
        };
        
        return createResponse(true, 'success', detail, 'extended.getOpenPositionDetail');
    } catch (error) {
        const message = error.message || 'Failed to get open position detail';
        return createResponse(false, message, null, 'extended.getOpenPositionDetail');
    }
}

/** TO UPDATE
 * @async
 * @function vmGetOrderStatus
 * @description Retrieves the status and details of a specific order by its ID using Python service
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string|number} _orderId - The unique identifier of the order to retrieve.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the order details or an error message.
 */
export async function vmGetOrderStatus(callPythonService, _orderId) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const orders = await callPythonService('get_orders');
        const order = orders.find(o => o.id === _orderId || o.client_order_id === _orderId);
        
        if (!order) {
            return createResponse(false, 'No order found', null, 'extended.getOrderStatus');
        }

        // Mappiamo al formato Extended originale
        const detail = {
            symbol: order.market_name || order.symbol,
            orderType: order.type || order.order_type,
            status: order.status,
            qty: parseFloat(order.amount || order.quantity || 0),
            qtyExe: parseFloat(order.filled_amount || order.executed_quantity || 0),
            qtyExeUsd: parseFloat(order.filled_amount || 0) * parseFloat(order.average_price || order.price || 0),
            avgPrice: parseFloat(order.average_price || order.price || 0),
        };
        
        return createResponse(true, 'success', detail, 'extended.getOrderStatus');
    } catch (error) {
        const message = error.message || 'Failed to get order status';
        return createResponse(false, message, null, 'extended.getOrderStatus');
    }
}

/**
 * @async
 * @function vmGetEarnedPoints
 * @description Retrieves the total earned points and the latest point details for a user by making a request to the API using the provided client instance. Returns a standardized response object containing the total points earned and the latest epoch's point amount and date, or an error message if the request fails.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the total earned points, latest point details, or an error message.
 */
export async function vmGetEarnedPoints(_instance){
    try {
        const response = await _instance.get('/user/rewards/earned');
        const rewards = response.data.data;
        let total = 0;
        rewards.forEach(season => {
            season.epochRewards.forEach(reward => {
                total += Number(reward.pointsReward);
            });
        });
        const latestSeason = rewards[rewards.length - 1];
        const latestEpoch = latestSeason.epochRewards[latestSeason.epochRewards.length - 1];
        return createResponse(true, 'success', { 
            total: total.toString(),
            latest: {
                amount: latestEpoch.pointsReward,
                period: (latestEpoch.startDate).replace(/-/g, '/') + '-' + (latestEpoch.endDate).replace(/-/g, '/')
            }
        }, 'extended.getEarnedPoints');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get earned points';
        return createResponse(false, message, null, 'extended.getEarnedPoints');
    }
}