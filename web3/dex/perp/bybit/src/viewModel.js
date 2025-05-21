import { createResponse } from '../../../../../utils/src/response.utils.js';

/**
 * @async
 * @method getMarketData
 * @description Retrieves market data for a specific symbol or all markets from Bybit's linear category.
 * @param {Object} _restClientV5 - The Bybit API client instance to use for requests.
 * @param {string} [_symbol=''] - The market symbol to query (e.g., 'BTCUSDT'). If empty, returns data for all markets.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing market data or an error message.
 *
 * Example of returns .data.lost:
 * [
 *   {
 *     symbol: 'BIOUSDT',
 *     lastPrice: '0.07086',
 *     indexPrice: '0.07100',
 *     markPrice: '0.07085',
 *     prevPrice24h: '0.07563',
 *     price24hPcnt: '-0.06307',
 *     highPrice24h: '0.07958',
 *     lowPrice24h: '0.06931',
 *     prevPrice1h: '0.07021',
 *     openInterest: '48555802',
 *     openInterestValue: '3440178.57',
 *     turnover24h: '5047510.2564',
 *     volume24h: '68576098.0000',
 *     fundingRate: '-0.00019576',
 *     nextFundingTime: '1747670400000',
 *     predictedDeliveryPrice: '',
 *     basisRate: '',
 *     deliveryFeeRate: '',
 *     deliveryTime: '0',
 *     ask1Size: '85',
 *     bid1Price: '0.07089',
 *     ask1Price: '0.07090',
 *     bid1Size: '1357',
 *     basis: '',
 *     preOpenPrice: '',
 *     preQty: '',
 *     curPreListingPhase: 'Finished'
 *   }
 * ]
 */
export async function vmGetMarketData(_restClientV5, _symbol = '') {
    try {
        const response = await _restClientV5.getTickers({ category: 'linear', symbol: _symbol });
        return response.retCode === 0
            ? createResponse(true, 'success', response.result, 'bybit.getMarketData')
            : createResponse(false, response.retMsg, null, 'bybit.getMarketData');
    } catch (error) {
        return createResponse(false, error.message, null, 'bybit.getMarketData');
    }
}

/**
 * @async
 * @method vmGetMarketOrderSize
 * @description Retrieves order size limits for a given symbol from Bybit's linear perpetual instruments.
 * @param {Object} _restClientV5 - The Bybit API client instance to use for requests.
 * @param {string} [_symbol=''] - The trading symbol (e.g., 'BTCUSDT') for which to fetch order size information.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the order size limits or an error message.
 */
export async function vmGetMaketOrderSize(_restClientV5, _symbol = '') {
    try {
        const response = await _restClientV5.getInstrumentsInfo({ category: 'linear', symbol: _symbol });
        return response.retCode === 0
        ? createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                maxLimQty: response.result.list[0].lotSizeFilter.maxOrderQty,
                minQty: response.result.list[0].lotSizeFilter.minOrderQty,
                qtyStep: response.result.list[0].lotSizeFilter.qtyStep,
                maxMktQty: response.result.list[0].lotSizeFilter.maxMktOrderQty,
            },
            'bybit.getMaketOrderSize'
        )
        : createResponse(false, response.retMsg, null, 'bybit.getMaketOrderSize');
    } catch (error) {
        return createResponse(false, error.message, null, 'bybit.getMaketOrderSize');
    }
}

/**
 * @async
 * @method vmGetFundingRateHour
 * @description Calculates and returns the hourly funding rate for a specific symbol on Bybit (linear category).
 *              Retrieves instrument information and market data, extracts the funding interval and funding rate,
 *              then calculates the hourly funding rate by dividing the funding rate by the number of hours in the funding interval.
 * @param {Object} _restClientV5 - The Bybit API client instance to use for requests.
 * @param {string} _symbol - The trading symbol for which to retrieve the funding rate (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the hourly funding rate,
 *                            or an error message if retrieval fails.
 */
export async function vmGetFundingRateHour(_restClientV5, _symbol) {
    try {
        const marketInfo = await _restClientV5.getInstrumentsInfo({ category: 'linear', _symbol });
        const fundingInterval = marketInfo?.data?.[0]?.fundingInterval;
        if (!fundingInterval) return createResponse(false, 'No funding interval', null, 'bybit.getFundingRateHour');

        const marketData = await vmGetMarketData(_restClientV5, _symbol);
        const fundingRate = marketData?.data?.list?.[0]?.fundingRate;
        if (!fundingRate) return createResponse(false, 'No funding rate', null, 'bybit.getFundingRateHour');

        const hourlyFundingRate = fundingRate / (fundingInterval / (1000 * 60 * 60));
        return createResponse(true, 'success', { symbol: _symbol, fundingRate: hourlyFundingRate }, 'bybit.getFundingRateHour');
    } catch (error) {
        return createResponse(false, error.message || 'Failed to get funding rate', null, 'bybit.getFundingRateHour');
    }
}

/**
 * @async
 * @function vmGetMarketOpenInterest
 * @description Retrieves the open interest and its USD value for a given trading symbol from Bybit's linear market.
 * Fetches the latest market data to obtain the last traded price, then queries the open interest for the specified symbol.
 * Calculates the open interest in USD by multiplying the open interest by the last price.
 * @param {Object} _restClientV5 - The Bybit REST client instance used to make API requests.
 * @param {string} [_symbol=''] - The trading symbol to retrieve open interest for (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} A Promise that resolves to a response object containing the open interest data or an error message.
 */
export async function vmGetMarketOpenInterest(_restClientV5, _symbol = '') {
    try {
        const marketData = await vmGetMarketData(_restClientV5, _symbol);
        const lastPrice = marketData?.data?.list?.[0]?.lastPrice;
        if (!lastPrice) return createResponse(false, 'No last price', null, 'bybit.getMarketOpenInterest');
        const response = await _restClientV5.getOpenInterest({symbol: _symbol, category: 'linear', intervalTime: '1h',limit: 1});
        return response.retCode === 0
            ? createResponse(
                true,
                'success',
                {
                    symbol: _symbol,
                    openInterest: response.result.list[0].openInterest,
                    openInterestUsd: (Number(response.result.list[0].openInterest) * Number(lastPrice)).toString(),
                },
                'bybit.getMarketOpenInterest'
                )
            : createResponse(false, response.retMsg, null, 'bybit.getMarketOpenInterest');
    } catch (error) {
        return createResponse(false, error.message, null, 'bybit.getMarketOpenInterest');
    }
}

/**
 * @async
 * @function vmGetOpenPositions
 * @description Retrieves the number of open positions and their corresponding market symbols from Bybit using the provided REST client.
 * Calls the Bybit API to fetch open positions for the 'linear' category settled in the specified coin.
 * Returns the count of open positions and a list of market symbols if any positions are open.
 * In case of an error or unsuccessful response, it returns an appropriate error message.
 * @param {Object} _restClientV5 - The Bybit REST client instance with a `getPositionInfo` method.
 * @param {string} _settleCoin - The coin used for settlement (e.g., 'USDT').
 * @returns {Promise<Object>} A Promise that resolves to a response object containing the open positions data or an error message.
 */
export async function vmGetOpenPositions(_restClientV5, _settleCoin) {
    try {
        const response = await _restClientV5.getPositionInfo({ category: 'linear', settleCoin: _settleCoin });
        const openPositions = response.result.list.length;
        const markets = openPositions > 0 ? response.result.list.map(item => item.symbol) : [];
        return response.retCode === 0
            ? createResponse(true, 'success', { openPositions: openPositions, markets: markets }, 'bybit.getOpenPositions')
            : createResponse(false, response.retMsg, null, 'bybit.getOpenPositions');
    } catch (error) {
        return createResponse(false, error.message, null, 'bybit.getOpenPositions');
    }
}

/**
 * @async
 * @function vmGetOutWithdrawableAmount
 * @description Retrieves the withdrawable amount and total balance for a specified settlement coin from Bybit using the provided REST client.
 * Calls the Bybit API to fetch withdrawable amount details for the given coin.
 * Returns the coin, withdrawable amount, and total balance if the API call is successful.
 * In case of an error or unsuccessful response, it returns an appropriate error message.
 * @param {Object} _restClientV5 - The Bybit REST client instance with a `getWithdrawableAmount` method.
 * @param {string} _settleCoin - The settlement coin symbol (e.g., 'USDT', 'BTC') for which to retrieve withdrawable amount information.
 * @returns {Promise<Object>} A Promise that resolves to a response object containing withdrawable amount data or an error message.
 */
export async function vmGetOutWithdrawableAmount(_restClientV5, _settleCoin) {
    try {
        const response = await _restClientV5.getWithdrawableAmount({ coin: _settleCoin });
        return response.retCode === 0
            ? createResponse(
                true,
                'success',
                {
                    coin: response.result.withdrawableAmount.FUND.coin,
                    withdrawableAmount: response.result.withdrawableAmount.FUND.withdrawableAmount,
                    totalBalance: response.result.withdrawableAmount.FUND.availableBalance,
                },
                'bybit.getOutWithdrawableAmount'
            )
            : createResponse(false, response.retMsg, null, 'bybit.getOutWithdrawableAmount');
    } catch (error) {
        return createResponse(false, error.message, null, 'bybit.getOutWithdrawableAmount');
    }
}

export async function vmGetOrderStatus(_restClientV5, _orderId) {
    try {
        const response = await _restClientV5.getActiveOrders({
            category: 'linear',
            orderId: _orderId,
            openOnly: 0,
            limit: 1
        });
        return response.retCode === 0
            ? createResponse(
                true,
                'success',
                {
                    symbol: response.result.list[0].symbol,
                    orderType: response.result.list[0].orderType,
                    status: response.result.list[0].orderStatus,
                    side: response.result.list[0].side === 'Buy' ? 'long' : 'short',
                    qty: response.result.list[0].qty,
                    qtyExe: response.result.list[0].cumExecQty,
                    qtyExeUsd: response.result.list[0].cumExecValue,
                    avgPrice: response.result.list[0].avgPrice
                },
                'bybit.getOrderStatus'
            )
            : createResponse(false, response.retMsg, null, 'bybit.getOrderStatus');
    } catch (error) {
        return createResponse(false, error.message, null, 'bybit.getOrderStatus');
    }
}