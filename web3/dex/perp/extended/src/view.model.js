import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { calculateMidPrice, countDecimals } from './utils.js';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves the wallet status using API instance
 * @param {Object} _instance - The API client instance used to perform the request
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet status data or an error message.
 */
export async function vmGetWalletStatus(_instance) {
    try {
        const response = await _instance.get('/user/balance');
        const data = response.data.data;
        console.log(data);
        return createResponse(
            true,
            'success',
            {
                balance: data.balance,
                equity: data.equity,
                leverage: data.leverage,
                updatedTime: data.updatedTime
            },
            'extended.getWalletStatus'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get wallet status';
        return createResponse(false, message, null, 'extended.getWalletStatus');
    }
}

/**
 * @async
 * @function vmGetWalletBalance
 * @description Retrieves the wallet balance using Python service
 * @param {Object} _extended - Extended instance with Python service
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet balance data or an error message.
 */
export async function vmGetWalletBalance(_extended) {
    try {
        // Use the already configured and initialized Python service
        const accountInfo = await _extended._sendCommand('get_account_info');

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
 * @param {Object} _extended - Extended instance with Python service
 * @param {string} [_symbol=''] - (Optional) The market symbol to filter the results. If not provided, retrieves all markets.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the filtered market data or an error message.
 */
export async function vmGetMarketData(_extended, _symbol = '') {
    try {
        // Use the standardized get_markets method and filter on JavaScript side
        const markets = await _extended._sendCommand('get_markets');
        
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
 * @description Retrieves market order size information for a given symbol
 * @param {Object} _extended - Extended instance with Python service
 * @param {string} _symbol - The market symbol for which to retrieve order size information.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the minimum quantity, quantity step, and maximum quantity for market orders, or an error message.
 */
export async function vmGetMarketOrderSize(_extended, _symbol){
    try {
        // Use the standardized get_markets method and filter on JavaScript side
        const markets = await _extended._sendCommand('get_markets');
        
        // Filter for specific market
        const market = markets.find(m => m.name === _symbol);
        
        if (!market) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'extended.getMarketOrderSize');
        }

        const midPrice = calculateMidPrice(market.market_stats.ask_price, market.market_stats.bid_price);

        const priceDecimals = countDecimals(market.trading_config.min_price_change);

        const tokenDecimals = countDecimals(market.trading_config.min_order_size_change);
        
        // Return single market as array for consistency
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                mainCoin: {
                    minQty: market.trading_config.min_order_size,
                    qtyStep: market.trading_config.min_order_size_change,
                    maxMktQty: (market.trading_config.max_market_order_value / midPrice).toFixed(tokenDecimals),
                    maxLimQty: (market.trading_config.max_limit_order_value / midPrice).toFixed(tokenDecimals)
                },
                secCoin: {
                    minQty: (market.trading_config.min_order_size * midPrice).toFixed(priceDecimals),
                    qtyStep: (market.trading_config.min_order_size_change * midPrice).toFixed(priceDecimals),
                    maxMktQty: market.trading_config.max_market_order_value,
                    maxLimQty: market.trading_config.max_limit_order_value
                },
                priceDecimals: priceDecimals
            },
            'extended.getMarketOrderSize'
        );
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get market order size';
        return createResponse(false, message, null, 'paradex.getMarketOrderSize');
    }
}

/**
 * @async
 * @function vmGetFundingRateHour
 * @description Retrieves the hourly funding rate for a given market symbol
 * @param {Object} _extended - Extended instance with Python service
 * @param {string} _symbol - The market symbol for which to retrieve the funding rate.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the funding rate or an error message.
 */
export async function vmGetFundingRateHour(_extended, _symbol) {
    try {
        // Use standardized get_markets method and filter
        const markets = await _extended._sendCommand('get_markets');
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
 * @param {Object} _extended - Extended instance with Python service
 * @param {string} _symbol - The market symbol for which to retrieve the open interest.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open interest data or an error message.
 */
export async function vmGetMarketOpenInterest(_extended, _symbol){
    try {
        // Use standardized get_markets method and filter
        const markets = await _extended._sendCommand('get_markets');
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
 * @param {Object} _extended - Extended instance with Python service
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open positions data or an error message.
 */
export async function vmGetOpenPositions(_extended) {
    try {
        const positions = await _extended._sendCommand('get_positions');
        
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
 * @param {Object} _extended - Extended instance with Python service
 * @param {string} _symbol - The market symbol for which to retrieve the open position details.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open position details or an error message.
 */
export async function vmGetOpenPositionDetail(_extended, _symbol) {
    try {
        const positions = await _extended._sendCommand('get_positions');
        const position = positions.find(p => p.market === _symbol);

        if (!position || !position.size || parseFloat(position.size) === 0) {
            return createResponse(false, 'No position found', null, 'extended.getOpenPositionDetail');
        }

        const detail = {
            symbol: _symbol,
            avgPrice: position.open_price,
            markPrice: position.mark_price,
            liquidationPrice: position.liquidation_price,
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

/**
 * @async
 * @function vmGetOrderStatus
 * @description Retrieves the status and details of a specific order by its ID using the provided API client instance. Returns a standardized response object containing order details such as symbol, order type, status, quantity, executed quantity, executed value in USD, and average price, or an error message if no order is found.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @param {string|number} _orderId - The unique identifier of the order to retrieve.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the order details or an error message.
 */
export async function vmGetOrderStatus(_instance, _orderId) {
    try {
        const url = encodeGetUrl('/user/orders/external/' + _orderId)
        const response = await _instance.get(url);
        const order = response.data.data[0];
        if (!order) {
            return createResponse(false, 'No order found', null, 'extended.getOrderStatus');
        }
        const { market, type, status, qty, filledQty, averagePrice } = order;
        const detail = {
            symbol: market,
            orderType: type,
            status: status,
            qty: qty,
            qtyExe: filledQty,
            qtyExeUsd: filledQty * averagePrice,
            avgPrice: averagePrice,
        }
        return createResponse(true, 'success', detail, 'extended.getOrderStatus');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get order status';
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
        
        // Calculate total points from all seasons
        rewards.forEach(season => {
            season.epochRewards.forEach(reward => {
                total += Number(reward.pointsReward);
            });
        });
        
        // Find the latest season (highest seasonId or last in array)
        const latestSeason = rewards.reduce((latest, season) => {
            if (!latest || season.seasonId > latest.seasonId) {
                return season;
            }
            return latest;
        }, null);
        
        // Find epoch with highest epochId in the latest season
        let latestEpoch = latestSeason.epochRewards.reduce((latest, reward) => {
            if (!latest || reward.epochId > latest.epochId) {
                return reward;
            }
            return latest;
        }, null);
        
        return createResponse(true, 'success', { 
            total: total.toString(),
            latest: {
                epochId: latestEpoch.epochId,
                amount: latestEpoch.pointsReward,
                startPeriod: latestEpoch.startDate.replace(/-/g, '/'),
                endPeriod: latestEpoch.endDate.replace(/-/g, '/')
            }
        }, 'extended.getEarnedPoints');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get earned points';
        return createResponse(false, message, null, 'extended.getEarnedPoints');
    }
}

/**
 * @async
 * @function vmGetWithdrawalStatus
 * @description Retrieves withdrawal status using direct API call (like vmGetEarnedPoints)
 * @param {Object} _instance - The API client instance used to perform the request
 * @param {string|number} [_withdrawalId] - Specific withdrawal ID to check (when provided, returns only that withdrawal's status)
 * @param {number} [_limit=50] - Maximum number of records to return (only used when no withdrawal ID is specified)
 * @returns {Promise<Object>} A Promise that resolves with withdrawal status data or error message
 */
export async function vmGetWithdrawalStatus(_instance, _withdrawalId = null, _limit = 50) {
    try {
        const params = { limit: _withdrawalId ? 100 : _limit };
        const url = encodeGetUrl('/user/assetOperations', params);
        const response = await _instance.get(url);
        const operations = response.data.data;

        // Filter for withdrawal operations (type: WITHDRAWAL, FAST_WITHDRAWAL, SLOW_WITHDRAWAL)
        const withdrawalOperations = operations.filter(op => 
            op.type === 'WITHDRAWAL' || 
            op.type === 'FAST_WITHDRAWAL' || 
            op.type === 'SLOW_WITHDRAWAL'
        );

        // If specific withdrawal ID was requested
        if (_withdrawalId) {
            // First try exact match
            let withdrawal = withdrawalOperations.find(op => op.id.toString() === _withdrawalId.toString());
            
            // If not found, try to find a close match (Extended might use different IDs for submission vs final operation)
            if (!withdrawal) {
                const submissionId = parseInt(_withdrawalId);
                const closeMatches = withdrawalOperations.filter(op => {
                    const opId = parseInt(op.id);
                    const diff = Math.abs(opId - submissionId);
                    return diff < 100; // Within 100 of the submission ID
                }).sort((a, b) => {
                    // Sort by closest ID match
                    const diffA = Math.abs(parseInt(a.id) - submissionId);
                    const diffB = Math.abs(parseInt(b.id) - submissionId);
                    return diffA - diffB;
                });
                
                if (closeMatches.length > 0) {
                    withdrawal = closeMatches[0];
                    // Add note about ID difference
                    withdrawal._note = `Found close match: submitted ID ${_withdrawalId}, operation ID ${withdrawal.id}`;
                }
            }
            
            return createResponse(
                true,
                'success',
                {
                    status: withdrawal.status,
                    amount: Math.abs(parseFloat(withdrawal.amount)),
                    createdTime: withdrawal.time,
                    txHash: withdrawal.transactionHash,
                    note: withdrawal._note ? withdrawal._note : undefined
                },
                'extended.getWithdrawalStatus'
            );
        }

        // Return all withdrawal history if no specific ID requested
        return createResponse(
            true,
            'success',
            withdrawalOperations.slice(0, _limit),
            'extended.getWithdrawalStatus'
        );
        
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get withdrawal status';
        return createResponse(false, message, null, 'extended.getWithdrawalStatus');
    }
}