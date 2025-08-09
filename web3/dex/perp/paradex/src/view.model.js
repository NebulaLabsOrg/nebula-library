import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { calculateMidPrice, fromAPRtoAPY, fromROI30dToAPR } from './utils.js';
import { paradexEnum } from './enum.js';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves the user's wallet status from the Paradex API, including account value, total collateral, free collateral, and margin cushion.
 * @param {Object} _instance - Axios instance configured for Paradex API.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the wallet status information or an error message.
 */
export async function vmGetWalletStatus(_instance) {
    try {
        const responce = await _instance.get('/account');
        return createResponse(
            true,
            'success',
            {
                accountValue: responce.data.account_value,
                totalCollateral: responce.data.total_collateral,
                freeCollateral: responce.data.free_collateral,
                marginCushino: responce.data.margin_cushion
            },
            'paradex.getWalletStatus'
        );
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get wallet status';
        return createResponse(false, message, null, 'paradex.getWalletStatus');
    }
}

/**
 * Retrieves wallet balances from the provided API instance.
 * If a token is specified, returns only the balance for that token.
 *
 * @async
 * @param {Object} _instance - API client instance to retrieve balances from.
 * @param {string} [_token=''] - (Optional) Specific token to filter the results.
 * @returns {Promise<Object>} A Promise that resolves with the response formatted by createResponse.
 */
export async function vmGetWalletBalances(_instance, _token = '') {
  try {
    const response = await _instance.get('/balance');
    if (_token) {
      const filteredResults = response.data.results.filter(
        item => item.token === _token
      );
      return createResponse(true, 'success', filteredResults[0].size, 'paradex.getWalletBalances');
    }
    return createResponse(true, 'success', response.data.results, 'paradex.getWalletBalances');
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to get wallet balances';
    return createResponse(false, message, null, 'paradex.getWalletBalances');
  }
}

/**
 * Retrieves market data from the Paradex API.
 *
 * @async
 * @function vmGetMarketData
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {boolean} [_onlyPerp=false] - If true, filters results to include only perpetual markets.
 * @param {string} [_symbol=''] - Optional market symbol to filter the results.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the market data or an error message.
 */
export async function vmGetMarketData(_instance, _onlyPerp = false, _symbol = '') {
  try {
    const params = _symbol ? { market: _symbol } : {};
    const url = encodeGetUrl('/markets', params)
    const response = await _instance.get(url);
    const markets = _onlyPerp
      ? response.data.results.filter(m => m.asset_kind === paradexEnum.market.type.perp)
      : response.data.results;
    return createResponse(true, 'success', markets, 'paradex.getMarketData');
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to get market data';
    return createResponse(false, message, null, 'paradex.getMarketData');
  }
}

/**
 * Retrieves the minimum, maximum, and step size for market orders for a given symbol from the Paradex API.
 *
 * @async
 * @function vmGetMarketOrderSize
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _symbol - The market symbol for which to retrieve order size information.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the minimum quantity, quantity step, and maximum quantity for market orders, or an error message.
 */
export async function vmGetMarketOrderSize(_instance, _symbol){
    try {
        const marketData = await vmGetMarketData(_instance, false, _symbol);
        if (!marketData.success) {
            return createResponse(false, 'Error getting market data', null, 'paradex.getMarketOrderSize');
        }
        const response = await _instance.get(encodeGetUrl(`/bbo/${_symbol}`));
        const { ask, bid } = response.data;
        const { min_notional, order_size_increment, max_order_size, price_tick_size } = marketData.data[0];
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                minQty: (Number(min_notional) / calculateMidPrice(ask, bid)).toString(),
                qtyStep: order_size_increment,
                maxQty: max_order_size,
                priceDecimals: (price_tick_size.toString().split('.')[1] || '').length
            },
            'paradex.getMarketOpenInterest'
        );
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get market order size';
        return createResponse(false, message, null, 'paradex.getMarketOrderSize');
    }
}

/**
 * Retrieves the hourly funding rate for a given market symbol from the Paradex API.
 *
 * @async
 * @function vmGetFundingRateHour
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _symbol - The market symbol for which to retrieve the funding rate.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the symbol and its hourly funding rate, or an error message.
 */
export async function vmGetFundingRateHour(_instance, _symbol) {
  try {
    const marketData = await vmGetMarketData(_instance, false, _symbol);
    if (!marketData.success) {
      return createResponse(false, 'Error getting market data', null, 'paradex.getFundingRateHour');
    }
    const params = { market: _symbol };
    const url = encodeGetUrl('/markets/summary', params)
    const response = await _instance.get(url);

    const { funding_rate } = response.data.results[0];
    const { funding_period_hours } = marketData.data[0];
    const hourlyFundingRate = ( funding_rate * 100) / funding_period_hours;
    return createResponse(
      true,
      'success',
      { symbol: _symbol, fundingRate: hourlyFundingRate },
      'paradex.getFundingRateHour'
    );
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to get funding rate';
    return createResponse(false, message, null, 'paradex.getFundingRateHour');
  }
}

/**
 * Retrieves the open interest and its USD value for a given market symbol from the Paradex API.
 *
 * @async
 * @function vmGetMarketOpenInterest
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _symbol - The market symbol for which to retrieve the open interest.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the symbol, open interest, and its USD value, or an error message.
 */
export async function vmGetMarketOpenInterest(_instance, _symbol) {
  try {
    const responsePrice = await _instance.get(encodeGetUrl(`/bbo/${_symbol}`));
    const { ask, bid } = responsePrice.data;
    
    const params = { market: _symbol };
    const url = encodeGetUrl('/markets/summary', params)
    const response = await _instance.get(url);
    return createResponse(
      true,
      'success',
      {
        symbol: _symbol,
        openInterest: response.data.results[0].open_interest,
        openInterestUsd: (Number(response.data.results[0].open_interest) * calculateMidPrice(ask, bid)).toString()
      },
      'paradex.getMarketOpenInterest'
    );
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to get market open interest';
    return createResponse(false, message, null, 'paradex.getMarketOpenInterest');
  }
}

/**
 * Retrieves the number of open positions and their associated markets from the Paradex API.
 *
 * @async
 * @function vmGetOpenPositions
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the count of open positions and an array of market identifiers, or an error message.
 */
export async function vmGetOpenPositions(_instance) {
  try {
    const filter = 'CLOSED';
    const response = await _instance.get('/positions');
    const openPositionsData = response.data.results.filter(
      position => position.status !== filter
    );

    const openPositionsCount = openPositionsData.length;
    const markets = openPositionsCount > 0
      ? openPositionsData.map(item => item.market)
      : [];
    return createResponse(true, 'success', { openPositions: openPositionsCount, markets }, 'paradex.getOpenPositions');
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to get open positions';
    return createResponse(false, message, null, 'paradex.getOpenPositions');
  }
}

/**
 * Retrieves the status and details of a specific position for a given market symbol from the Paradex API.
 *
 * @async
 * @function vmGetOpenPositionDetail
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _symbol - The market symbol to query the position for.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the position status and details (such as average entry price, PnL, side, quantity, and USD value), or an error message if no position is found or an error occurs.
 */
export async function vmGetOpenPositionDetail(_instance, _symbol) {
  try {
    const response = await _instance.get(encodeGetUrl(`/bbo/${_symbol}`));
    const { ask, bid } = response.data;

    const positions = await _instance.get(encodeGetUrl('/positions', { market: _symbol }));
    const pos = positions.data.results.find(p => p.market === _symbol);

    if (!pos) {
      return createResponse(false, 'No position found', null, 'paradex.getOpenPositionDetail');
    }
    if (pos.status === 'CLOSED') {
      return createResponse(true, 'Position closed', null, 'paradex.getOpenPositionDetail');
    }

    const {
      average_entry_price,
      unrealized_pnl,
      unrealized_funding_pnl,
      realized_positional_pnl,
      realized_positional_funding_pnl,
      side,
      size
    } = pos;

    const qty = Math.abs(Number(size));
    const detail = {
      symbol: _symbol,
      avgPrice: average_entry_price,
      unrealizedPnl: (Number(unrealized_pnl) + Number(unrealized_funding_pnl)).toString(),
      realizedPnl: (Number(realized_positional_pnl) + Number(realized_positional_funding_pnl)).toString(),
      side: side.toLowerCase(),
      qty: qty.toString(),
      qtyUsd: (qty *  calculateMidPrice(ask, bid)).toString()
    };
    return createResponse(true, 'success', detail, 'paradex.getOpenPositionDetail');
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to get open position detail';
    return createResponse(false, message, null, 'paradex.getOpenPositionDetail');
  }
}

/**
 * Retrieves the status and details of a specific order by its ID from the Paradex API.
 *
 * @async
 * @function vmGetOrderStatus
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _orderId - The unique identifier of the order to query.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the order status and details (such as symbol, order type, status, executed quantity, executed USD value, and average price), or an error message if the order is not found or an error occurs.
 */
export async function vmGetOrderStatus(_instance, _orderId) {
    try {
        const responseOpenOrders = await _instance.get('/orders/' + _orderId);
        if (responseOpenOrders.data && Object.keys(responseOpenOrders.data).length > 0) {
            const detail = {
              symbol: responseOpenOrders.data.market,
              orderType: responseOpenOrders.data.type,
              status: responseOpenOrders.data.status,
              qty: responseOpenOrders.data.size,
              qtyExe: (Number(responseOpenOrders.data.size) - Number(responseOpenOrders.data.remaining_size)).toString(),
              qtyExeUsd: ((Number(responseOpenOrders.data.size) - Number(responseOpenOrders.data.remaining_size)) * Number(responseOpenOrders.data.avg_fill_price)).toString(),
              avgPrice: responseOpenOrders.data.avg_fill_price
            }
            return createResponse(true, 'success', detail, 'paradex.getOrderStatus');
        } else {
            // If not found in open orders, throw to trigger catch and check history
            throw new Error('Order not found in open orders');
        }
    } catch (error) {
      try {
        const responseClosedOrders = await _instance.get('/orders-history');
        if (!responseClosedOrders.data || !responseClosedOrders.data.results || responseClosedOrders.data.results.length === 0) {
            return createResponse(false, 'No order found', null, 'paradex.getOrderStatus');
        }

        for (let i = 0; i < responseClosedOrders.data.results.length; i++) {
            if (responseClosedOrders.data.results[i].id === _orderId) {
                const detail = {
                    symbol: responseClosedOrders.data.results[i].market,
                    orderType: responseClosedOrders.data.results[i].type,
                    status: responseClosedOrders.data.results[i].cancel_reason === '' ? responseClosedOrders.data.results[i].status : responseClosedOrders.data.results[i].cancel_reason,
                    qty: responseClosedOrders.data.results[i].size,
                    qtyExe: (Number(responseClosedOrders.data.results[i].size) - Number(responseClosedOrders.data.results[i].remaining_size)).toString(),
                    qtyExeUsd: ((Number(responseClosedOrders.data.results[i].size) - Number(responseClosedOrders.data.results[i].remaining_size)) * Number(responseClosedOrders.data.results[i].avg_fill_price)).toString(),
                    avgPrice: responseClosedOrders.data.results[i].avg_fill_price
                }
                return createResponse(true, 'success', detail, 'paradex.getOrderStatus');
            }
        }
        return createResponse(false, 'Order not found', null, 'paradex.getOrderStatus');
      } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get order status';
        return createResponse(false, message, null, 'paradex.getOrderStatus');
      }
    }
}

/**
 * Retrieves the performance metrics of a specific vault from the Paradex API, including ROI, APR, and APY.
 *
 * @async
 * @function vmGetVaultPerformance
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _vaultAddress - The address of the vault to retrieve performance data for.
 * @returns {Promise<Object>} A promise that resolves to a response object containing vault performance metrics or an error message.
 */
export async function vmGetVaultPerformance(_instance, _vaultAddress){
  try {
    const params = { address: _vaultAddress }; // if not working the vault address try the token address for the vault
    const url = encodeGetUrl('/vaults/summary', params);
    const responce = await _instance.get(url);
    const apr = fromROI30dToAPR(responce.data.results[0].roi_30d);
    const apy = fromAPRtoAPY(apr, 365);
    return createResponse(
        true,
        'success',
        {
          vault: '-',
          address: responce.data.results[0].address,
          roi30d: Number(responce.data.results[0].roi_30d),
          apr: apr,
          apy: apy,
          tokenPrice: Number(responce.data.results[0].vtoken_price),
        },
        'paradex.getVaultPerformance'
    );
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Failed to get vault performance';
    return createResponse(false, message, null, 'paradex.getVaultPerformance');
  }
}