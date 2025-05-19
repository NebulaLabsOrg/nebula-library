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
                maxLimQtyUsd: response.result.list[0].lotSizeFilter.maxOrderQty,
                minQtyUsd: response.result.list[0].lotSizeFilter.minOrderQty,
                maxMktQtyUsd: response.result.list[0].lotSizeFilter.maxMktOrderQty,
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