import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { calculateMidPrice } from './utils.js';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves the wallet status, including balance and equity, from the user's account using the provided API instance.
 * @param {Object} _instance - The API client instance used to perform the wallet balance request.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet status data or an error message.
 */
export async function vmGetWalletStatus(_instance) {
    try {
        const responce = await _instance.get('/user/balance');
        return createResponse(
            true,
            'success',
            {
                balance: responce.data.data.balance,
                equity: responce.data.data.equity,
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
 * @description Retrieves the wallet balance, including available funds for trade, withdrawal, and unrealised PnL, from the user's account using the provided API instance.
 * @param {Object} _instance - The API client instance used to perform the wallet balance request.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet balance data or an error message.
 */
export async function vmGetWalletBalance(_instance) {
    try {
        const responce = await _instance.get('/user/balance');
        return createResponse(
            true,
            'success',
            {
                availableForTrade: responce.data.data.availableForTrade,
                availableForWithdrawal: responce.data.data.availableForWithdrawal,
                unrealisedPnl: responce.data.data.unrealisedPnl
            },
            'extended.getWalletBalance'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get wallet balance';
        return createResponse(false, message, null, 'extended.getWalletBalance');
    }
}

/**
 * @async
 * @function vmGetMarketData
 * @description Retrieves the list of active markets from the API using the provided instance. Filters for markets with status 'ACTIVE' and active flag set to true. Adds a 'symbol' property for consistency with other APIs. For the latest market data, use the `getLatestMarketData` function.
 * @param {Object} _instance - The API client instance used to perform the market data request.
 * @param {string} [_symbol=''] - (Optional) The market symbol to filter the results. If not provided, retrieves all markets.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the filtered market data or an error message.
 */
export async function vmGetMarketData(_instance, _symbol = '') {
    try {
        const params = _symbol ? { market: _symbol } : {};
        const url = encodeGetUrl('/info/markets', params)
        const response = await _instance.get(url);
        const marketsData = response.data.data;
        const markets = Array.isArray(marketsData)
            ? marketsData
                    .filter(market => market.status === 'ACTIVE' && market.active === true)
                    .map(market => ({
                            ...market,
                            symbol: market.name,
                            // adding symbol to maintain consistency with other APIs
                    }))
            : [];
        return createResponse(true, 'success', markets, 'extended.getMarketData');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get market data';
        return createResponse(false, message, null, 'extended.getMarketData');
    }
}

/**
 * @async
 * @function vmGetLatestMarketData
 * @description Retrieves the latest market statistics for a given symbol from the API using the provided instance. Returns a standardized response object containing the market data or an error message.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @param {string} [_symbol] - The market symbol for which to retrieve the latest statistics.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the latest market data or an error message.
 */
export async function vmGetLatestMarketData(_instance, _symbol) {
    try {
        const url = encodeGetUrl(`/info/markets/${_symbol}/stats`);
        const response = await _instance.get(url);
        return createResponse(true, 'success', response.data.data, 'extended.getLatestMarketData');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get latest market data';
        return createResponse(false, message, null, 'extended.getLatestMarketData');
    }
}

/**
 * @async
 * @function vmGetMarketOrderSize
 * @description Retrieves the market order size configuration for a given symbol using the provided API client instance. Returns a standardized response object containing minimum and maximum order sizes, quantity steps, and price decimals, or an error message.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @param {string} _symbol - The market symbol for which to retrieve order size configuration.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing order size configuration or an error message.
 */
export async function vmGetMarketOrderSize(_instance, _symbol){
    try {
        const marketData = await vmGetMarketData(_instance, _symbol);
        if (!marketData.success) {
            return createResponse(false, marketData.message, null, 'extended.getMarketOrderSize');
        }
        const { minOrderSize, minOrderSizeChange, minPriceChange, maxMarketOrderValue, maxLimitOrderValue } = marketData.data[0].tradingConfig;
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                minQty: minOrderSize,
                qtyStep: minOrderSizeChange,
                maxMktQty: maxMarketOrderValue,
                maxLimQty: maxLimitOrderValue,
                priceDecimals: (minPriceChange.toString().split('.')[1] || '').length
            },
            'extended.getMarketOpenInterest'
        );
    }catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get market order size';
        return createResponse(false, message, null, 'extended.getMarketOrderSize');
    }
}

/**
 * @async
 * @function vmGetFundingRateHour
 * @description Retrieves the hourly funding rate for a given symbol using the provided API client instance. Returns a standardized response object containing the symbol and its funding rate (as a percentage), or an error message.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @param {string} _symbol - The market symbol for which to retrieve the funding rate.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the funding rate or an error message.
 */
export async function vmGetFundingRateHour(_instance, _symbol) {
    try {
        const latestMarketData = await vmGetLatestMarketData(_instance, _symbol);
        if (!latestMarketData.success) {
            return createResponse(false, latestMarketData.message, null, 'extended.getFundingRateHour');
        }
        const { fundingRate } = latestMarketData.data;
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                fundingRate: fundingRate * 100
            },
            'extended.getFundingRateHour'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get funding rate';
        return createResponse(false, message, null, 'extended.getFundingRateHour');
    }
}

/**
 * @async
 * @function vmGetMarketOpenInterest
 * @description Retrieves the open interest for a given market symbol using the provided API client instance. Returns a standardized response object containing the symbol, open interest (normalized by the mid price), and open interest in USD, or an error message.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @param {string} _symbol - The market symbol for which to retrieve the open interest.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open interest data or an error message.
 */
export async function vmGetMarketOpenInterest(_instance, _symbol){
    try {
        const latestMarketData = await vmGetLatestMarketData(_instance, _symbol);
        if (!latestMarketData.success) {
            return createResponse(false, latestMarketData.message, null, 'extended.getMarketOpenInterest');
        }
        const { openInterest, askPrice, bidPrice } = latestMarketData.data;
        const midPrice = calculateMidPrice(askPrice, bidPrice);
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                openInterest: openInterest / midPrice,
                openInterestUsd: openInterest
            },
            'extended.getMarketOpenInterest'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get market open interest';
        return createResponse(false, message, null, 'extended.getMarketOpenInterest');
    }
}

/**
 * @async
 * @function vmGetOpenPositions
 * @description Retrieves the user's open positions using the provided API client instance. Returns a standardized response object containing the number of open positions and the list of markets, or an error message.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open positions data or an error message.
 */
export async function vmGetOpenPositions(_instance) {
    try {
        const response = await _instance.get('/user/positions');
        const openPositionsData = response.data.data || [];
        const openPositionsCount = openPositionsData.length;
        const markets = openPositionsCount > 0
            ? openPositionsData.map(item => item.market)
            : [];
        return createResponse(
            true,
            'success',
            { openPositions: openPositionsCount, markets },
            'extended.getOpenPositions'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get open positions';
        return createResponse(false, message, null, 'extended.getOpenPositions');
    }
}

/**
 * @async
 * @function vmGetOpenPositionDetail
 * @description Retrieves the details of the user's open position for a specific market symbol using the provided API client instance. Returns a standardized response object containing position details such as average price, unrealised and realised PnL, side, size, and value, or an error message if no position is found.
 * @param {Object} _instance - The API client instance used to perform the request.
 * @param {string} _symbol - The market symbol for which to retrieve the open position details.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open position details or an error message.
 */
export async function vmGetOpenPositionDetail(_instance, _symbol) {
    try {
        const params = { market: _symbol }
        const url = encodeGetUrl('/user/positions', params)
        const response = await _instance.get(url);
        const positionData = response.data.data;
        if (!Array.isArray(positionData) || positionData.length === 0) {
            const params = { market: _symbol};
            const url = encodeGetUrl('/user/positions/history', params);
            const historyResponse = await _instance.get(url);
            if (!Array.isArray(historyResponse.data.data) || historyResponse.data.data.length === 0) {
                return createResponse(false, 'No position found', null, 'extended.getOpenPositionDetail');
            }else{
                return createResponse(true, 'Position closed', null, 'extended.getOpenPositionDetail');
            }
        }
        const { openPrice, unrealisedPnl, realisedPnl, side, size, value } = positionData[0];
        const detail = {
            symbol: _symbol,
            avgPrice: openPrice,
            unrealisedPnl: unrealisedPnl,
            realisedPnl: realisedPnl,
            side: side.toLowerCase(),
            qty: size,
            qtyUsd: value
        };
        return createResponse(true, 'success', detail, 'extended.getOpenPositionDetail');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get open position detail';
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