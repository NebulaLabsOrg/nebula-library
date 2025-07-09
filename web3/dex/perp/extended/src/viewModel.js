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
        return createResponse(false, error.message, null, 'extended.getWalletStatus');
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
        return createResponse(false, error.message, null, 'extended.getWalletBalance');
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
        return createResponse(false, error.message, null, 'extended.getMarketData');
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
        return createResponse(false, error.message, null, 'extended.getLatestMarketData');
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
        return createResponse(false, error.message, null, 'extended.getMarketOrderSize');
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
        return createResponse(false, error.message, null, 'extended.getFundingRateHour');
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
        return createResponse(false, error.message, null, 'extended.getMarketOpenInterest');
    }
}