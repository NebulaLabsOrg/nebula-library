import { createResponse } from '../../../../utils/src/response.utils.js';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves the wallet status, including total equity and total margin balance, from Bybit's unified account via the provided API client.
 * @param {Object} _restClientV5 - The Bybit API client instance used to perform the wallet balance request.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet status data or an error message.
 */
export async function vmGetWalletStatus(_restClientV5) {
    try {
        const response = await _restClientV5.getWalletBalance({ accountType: 'UNIFIED' });
        if (response.retCode === 0 && response.result && response.result.list && response.result.list[0]) {
            const { totalEquity, totalMarginBalance } = response.result.list[0];
            return createResponse(
                true,
                'success',
                { totalEquity, totalMarginBalance },
                'bybit.getWalletStatus'
            );
        } else {
            return createResponse(false, response.retMsg, null, 'bybit.getWalletStatus');
        }
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to retrieve wallet status';
        return createResponse(false, message, null, 'bybit.getWalletStatus');
    }
}
/**
 * @async
 * @function vmGetWalletBalance
 * @description Retrieves the wallet balance, including transfer balance and wallet balance, for a specified settlement coin from Bybit's unified account using the provided API client.
 * @param {Object} _restClientV5 - The Bybit API client instance used to perform the wallet balance request.
 * @param {string} _settleCoin - The settlement coin symbol (e.g., 'USDT', 'BTC') for which to fetch the wallet balance.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the wallet balance data or an error message.
 */
export async function vmGetWalletBalance(_restClientV5, _settleCoin) {
    try {
        const response = await _restClientV5.getAllCoinsBalance({ accountType: 'UNIFIED', coin: _settleCoin});
        if (response.retCode === 0 && response.result && response.result.balance && response.result.balance[0]) {
            const { transferBalance, walletBalance } = response.result.balance[0];
            return createResponse(
                true,
                'success',
                { transferBalance, walletBalance },
                'bybit.getWalletBalance'
            );
        } else {
            return createResponse(false, response.retMsg, null, 'bybit.getWalletBalance');
        }
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to retrieve wallet balance';
        return createResponse(false, message, null, 'bybit.getWalletBalance');
    }
}
/**
 * @async
 * @function getMarketData
 * @description Retrieves market data for a specific symbol or all markets from Bybit's linear category.
 * @param {Object} _restClientV5 - The Bybit API client instance to use for requests.
 * @param {string} [_symbol=''] - The market symbol to query (e.g., 'BTCUSDT'). If empty, returns data for all markets.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing market data or an error message.
 *
 * Example of returns .data:
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
            ? createResponse(true, 'success', response.result.list, 'bybit.getMarketData')
            : createResponse(false, response.retMsg, null, 'bybit.getMarketData');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to retrieve market data';
        return createResponse(false, message, null, 'bybit.getMarketData');
    }
}
/**
 * @async
 * @function vmGetMarketOrderSize
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
        const message = error.response?.data?.message || error.message || 'Failed to retrieve market order size';
        return createResponse(false, message, null, 'bybit.getMaketOrderSize');
    }
}
/**
 * @async
 * @function vmGetFundingRateHour
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
        const marketInfo = await _restClientV5.getInstrumentsInfo({ category: 'linear', symbol: _symbol });
        const fundingInterval = marketInfo?.result?.list?.[0]?.fundingInterval;
        if (!fundingInterval) return createResponse(false, 'No funding interval', null, 'bybit.getFundingRateHour');

        const marketData = await vmGetMarketData(_restClientV5, _symbol);
        const fundingRate = marketData?.data?.[0]?.fundingRate;
        if (!fundingRate) return createResponse(false, 'No funding rate', null, 'bybit.getFundingRateHour');

        const hourlyFundingRate = (fundingRate * 100) / (fundingInterval / 60);
        return createResponse(true, 'success', { symbol: _symbol, fundingRate: hourlyFundingRate }, 'bybit.getFundingRateHour');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to retrieve funding rate';
        return createResponse(false, message, null, 'bybit.getFundingRateHour');
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
        const lastPrice = marketData?.data?.[0]?.lastPrice;
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
        const message = error.response?.data?.message || error.message || 'Failed to retrieve market open interest';
        return createResponse(false, message, null, 'bybit.getMarketOpenInterest');
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
        const message = error.response?.data?.message || error.message || 'Failed to retrieve open positions';
        return createResponse(false, message, null, 'bybit.getOpenPositions');
    }
}
/**
 * @async
 * @function vmGetOpenPositionDetail
 * @description Retrieves detailed information about an open position for a specific symbol and settlement coin from Bybit using the provided REST client.
 * Calls the Bybit API to fetch position information for the 'linear' category and obtains the latest market price for the symbol.
 * Returns an object containing position details such as symbol, average price, unrealized and realized PnL, side, quantity, and USD value.
 * If no position is found or an error occurs, returns an appropriate error message.
 * @param {Object} _restClientV5 - The Bybit REST client instance with `getPositionInfo` and market data methods.
 * @param {string} _settleCoin - The coin used for settlement (e.g., 'USDT').
 * @param {string} _symbol - The market symbol to retrieve position details for (e.g., 'BTCUSDT').
 * @returns {Promise<Object>} A Promise that resolves to a response object containing the position detail data or an error message.
 */
export async function vmGetOpenPositionDetail(_restClientV5, _settleCoin, _symbol) {
    try {
        const response = await _restClientV5.getPositionInfo({ category: 'linear', symbol: _symbol, settleCoin: _settleCoin });
        if (response.retCode !== 0 || !response.result.list || response.result.list.length === 0) {
            return createResponse(false, response.retMsg || 'No position found', null, 'bybit.getOpenPositionDetail');
        }
        const pos = response.result.list[0];

        // Calcola lastPrice usando vmGetMarketData
        const marketData = await vmGetMarketData(_restClientV5, _symbol);
        const lastPrice = parseFloat(marketData?.data?.[0]?.lastPrice);
        if (!lastPrice) {
            return createResponse(false, 'No last price', null, 'bybit.getOpenPositionDetail');
        }
        const detail = {
            symbol: pos.symbol,
            avgPrice: pos.avgPrice,
            unrealizedPnl: pos.unrealisedPnl,
            realizedPnl: pos.curRealisedPnl,
            side: pos.side,
            qty: pos.size,
            qtyUsd: (Number(pos.size) * lastPrice).toString(),
        };
        return createResponse(true, 'success', detail, 'bybit.getOpenPositionDetail');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to retrieve open position detail';
        return createResponse(false, message, null, 'bybit.getOpenPositionDetail');
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
        const message = error.response?.data?.message || error.message || 'Failed to retrieve withdrawable amount';
        return createResponse(false, message, null, 'bybit.getOutWithdrawableAmount');
    }
}
/**
 * @async
 * @function vmGetOrderStatus
 * @description Retrieves the status and details of a specific order from Bybit using the provided REST client and order ID.
 * Calls the Bybit API to fetch active order information for the given order ID.
 * Returns order details such as symbol, order type, status, side, quantity, executed quantity, executed value in USD, and average price if the API call is successful.
 * In case of an error or unsuccessful response, it returns an appropriate error message.
 * @param {Object} _restClientV5 - The Bybit REST client instance with a `getActiveOrders` method.
 * @param {string} _orderId - The unique identifier of the order to retrieve status for.
 * @returns {Promise<Object>} A Promise that resolves to a response object containing order status data or an error message.
 */
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
        const message = error.response?.data?.message || error.message || 'Failed to retrieve order status';
        return createResponse(false, message, null, 'bybit.getOrderStatus');
    }
}
/**
 * @async
 * @function vmGetWithdrawStatus
 * @description Retrieves the status and details of a specific withdrawal from Bybit using the provided REST client and withdrawal ID.
 * Calls the Bybit API to fetch withdrawal records for the given withdrawal ID.
 * Returns withdrawal details if found, otherwise returns an appropriate error message.
 * @param {Object} _restClientV5 - The Bybit REST client instance with a `getWithdrawRecords` method.
 * @param {string} _withdrawId - The unique identifier of the withdrawal to retrieve status for.
 * @returns {Promise<Object>} A Promise that resolves to a response object containing withdrawal status data or an error message.
 *
 * Example of returns .data:
 * {
 *   coin: 'USDC',
 *   chain: 'BASE',
 *   amount: '9.5',
 *   txID: '0xebe9d164708ae2ef55f953d08e76e121143abd03fe9b231e153d22b8dedb6d4f',
 *   status: 'success',
 *   toAddress: '0x970669124ce6381386aaea27aff4a37fc579b992',
 *   tag: '',
 *   withdrawFee: '0.5',
 *   createTime: '1748327868000',
 *   updateTime: '1748328072000',
 *   withdrawId: '146615430',
 *   withdrawType: 0
 * }
 */
export async function vmGetWithdrawStatus(_restClientV5, _withdrawId) {
    try {
        const response = await _restClientV5.getWithdrawalRecords({
            withdrawId: _withdrawId
        });
        if (response.retCode === 0 && response.result && Array.isArray(response.result.rows)) {
            const withdraw = response.result.rows.find(item => item.withdrawId === _withdrawId);
            if (withdraw) {
                return createResponse(true, 'success', withdraw, 'bybit.getWithdrawStatus');
            } else {
                return createResponse(false, 'Withdraw ID not found', null, 'bybit.getWithdrawStatus');
            }
        } else {
            return createResponse(false, response.retMsg || 'No withdraw records found', null, 'bybit.getWithdrawStatus');
        }
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to retrieve withdraw status';
        return createResponse(false, message, null, 'bybit.getWithdrawStatus');
    }
}