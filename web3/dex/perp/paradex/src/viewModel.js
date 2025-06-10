import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { paradexEnum } from './paradex.enum.js';

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
        return createResponse(false, error.message, null, 'paradex.getWalletStatus');
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
      return createResponse(true, 'success', filteredResults, 'paradex.getWalletBalances');
    }
    return createResponse(true, 'success', response.data.results, 'paradex.getWalletBalances');
  } catch (error) {
    return createResponse(false, error.message, null, 'paradex.getWalletBalances');
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
    return createResponse(false, error.message, null, 'paradex.getMarketData');
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
        const params = { market: _symbol };
        const url = encodeGetUrl('/markets/summary', params)
        const response = await _instance.get(url);
        const { mark_price } = response.data.results[0];
        const { min_notional, order_size_increment, max_order_size } = marketData.data[0];
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                minQty: (Number(min_notional) / Number(mark_price)).toString(),
                qtyStep: order_size_increment,
                maxQty: max_order_size
            },
            'paradex.getMarketOpenInterest'
        );
    } catch (error) {
        return createResponse(false, error.message, null, 'paradex.getMarketOrderSize');
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
    return createResponse(false, error.message, null, 'paradex.getFundingRateHour');
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
export async function vmGetMarketOpenInterest(_instance, _symbol){
    try {
        const params = { market: _symbol };
        const url = encodeGetUrl('/markets/summary', params)
        const response = await _instance.get(url);
    return createResponse(
      true,
      'success',
      {
        symbol: _symbol,
        openInterest: response.data.results[0].open_interest,
        openInterestUsd: (Number(response.data.results[0].open_interest) * Number(response.data.results[0].mark_price)).toString()
      },
      'paradex.getMarketOpenInterest'
    );
    } catch (error) {
        return createResponse(false, error.message, null, 'paradex.getMarketOpenInterest');
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
    return createResponse(false, error.message, null, 'paradex.getOpenPositions');
  }
}

/**
 * Retrieves the status and details of a specific position for a given market symbol from the Paradex API.
 *
 * @async
 * @function vmGetPositionStatus
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _symbol - The market symbol to query the position for.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the position status and details (such as average entry price, PnL, side, quantity, and USD value), or an error message if no position is found or an error occurs.
 */
export async function vmGetPositionStatus(_instance, _symbol) {
  try {
    const marketDetail = await _instance.get(encodeGetUrl('/markets/summary', { market: _symbol }));
    const positions = await _instance.get(encodeGetUrl('/positions', { market: _symbol }));
    const pos = positions.data.results.find(p => p.market === _symbol);

    if (!pos) {
      return createResponse(false, 'No position found', null, 'paradex.getPositionStatus');
    }
    if (pos.status === 'CLOSED') {
      return createResponse(true, 'Position closed', null, 'paradex.getPositionStatus');
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

    const markPrice = Number(marketDetail.data.results[0].mark_price);
    const qty = Math.abs(Number(size));
    const detail = {
      symbol: _symbol,
      avgPrice: average_entry_price,
      unrealizedPnl: (Number(unrealized_pnl) + Number(unrealized_funding_pnl)).toString(),
      cumRealizedPnl: (Number(realized_positional_pnl) + Number(realized_positional_funding_pnl)).toString(),
      side: side.toLowerCase(),
      qty: qty.toString(),
      qtyUsd: (qty * markPrice).toString()
    };
    return createResponse(true, 'success', detail, 'paradex.getPositionStatus');
  } catch (error) {
    return createResponse(false, error.message, null, 'paradex.getPositionStatus');
  }
}

 


export async function test(_instance) {
    try {
        // morde detail on most of the respocnes: https://github.com/issues/assigned?issue=NebulaLabsOrg%7Cnebula-library%7C8
        // account related stuff
        //const response = await _instance.get('/account'); //account balacne and  margins
        //const response = await _instance.get('/balance'); //balances list
        //const response = await _instance.get('/positions'); //position list eeven closed
        // markets related stuff
        //const response = await _instance.get('/markets'); //market data : use a parameter ?market=ARB-USD-PERP tp get data of only a single perp
        //const response = await _instance.get('/markets/summary?market=ARB-USD-PERP'); //market data (openinterest and fundign rate)
        // orders related stuff
        //const response = await _instance.get('/orders'); //get open orders
        //const response = await _instance.post('/orders'); //set order parameters : https://docs.paradex.trade/api/prod/orders/new
        //const response = await _instance.del('/orders'); //delete all orders: or use a parameter ?market=ARB-USD-PERP to delete data of only a single perp
        //const response = await _instance.get('/orders-history'); //get ordere history
        //const response = await _instance.get('/orders/{order_id}'); //get order by order id //only NEW and OPEN will return
        //const response = await _instance.put('/orders/{order_id}'); //modify order by order id parameters : https://docs.paradex.trade/api/prod/orders/modify
        //const response = await _instance.del('/orders/{order_id}'); //delete order by order id

        return createResponse(true, 'success', response.data.results[0], 'paradex.getMarketData');
    } catch (error) {
        return createResponse(false, error.message, null, 'paradex.getMarketData');
    }
}
