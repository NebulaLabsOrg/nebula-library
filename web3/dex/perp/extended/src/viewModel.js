import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';

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