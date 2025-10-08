import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { calculateMidPrice } from './utils.js';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves the wallet status using Python service
 * @param {Function} callPythonService - Configured Python service method
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet status data or an error message.
 */
export async function vmGetWalletStatus(callPythonService) {
    try {
        // Usa il servizio Python già configurato
        const accountInfo = await callPythonService('get_account_info');
        
        // Mappiamo i dati del Python SDK al formato Extended originale
        return createResponse(
            true,
            'success',
            {
                balance: accountInfo.available_balance || accountInfo.balance || 0,
                equity: accountInfo.equity || accountInfo.total_balance || accountInfo.balance || 0,
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
 * @param {Object} pythonService - Configured Python service with all parameters
 * @returns {Promise<Object>} A Promise that resolves with a response object containing wallet balance data or an error message.
 */
export async function vmGetWalletBalance(pythonService) {
    try {
        // Usa il servizio Python già configurato e inizializzato
        const accountInfo = await pythonService.call('get_account_info');
        console.log(accountInfo)
        // Mappiamo i dati del Python SDK al formato Extended originale
        return createResponse(
            true,
            'success',
            {
                availableForTrade: accountInfo.available_for_trade || 0,
                availableForWithdrawal: accountInfo.available_for_withdrawal || 0,
                unrealisedPnl: accountInfo.unrealised_pnl || 0
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
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string} [_symbol=''] - (Optional) The market symbol to filter the results. If not provided, retrieves all markets.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the filtered market data or an error message.
 */
export async function vmGetMarketData(callPythonService, _symbol = '') {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        if (_symbol) {
            // Singolo mercato
            const marketData = await callPythonService('get_market_data', {
                market_name: _symbol
            });
            
            // Mappiamo al formato Extended originale
            const market = {
                name: _symbol,
                symbol: _symbol,
                status: 'ACTIVE',
                active: true,
                ...marketData
            };
            
            return createResponse(true, 'success', [market], 'extended.getMarketData');
        } else {
            // Tutti i mercati
            const markets = await callPythonService('get_markets');
            
            // Mappiamo al formato Extended originale
            const formattedMarkets = markets
                .filter(market => market.active !== false)
                .map(market => ({
                    name: market.name,
                    symbol: market.name,
                    status: 'ACTIVE',
                    active: true,
                    ...market
                }));
                
            return createResponse(true, 'success', formattedMarkets, 'extended.getMarketData');
        }
    } catch (error) {
        const message = error.message || 'Failed to get market data';
        return createResponse(false, message, null, 'extended.getMarketData');
    }
}

/**
 * @async
 * @function vmGetLatestMarketData
 * @description Retrieves the latest market statistics for a given symbol using Python service
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string} [_symbol] - The market symbol for which to retrieve the latest statistics.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the latest market data or an error message.
 */
export async function vmGetLatestMarketData(callPythonService, _symbol) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const marketData = await callPythonService('get_market_data', {
            market_name: _symbol
        });
        
        // Mappiamo al formato Extended originale
        return createResponse(true, 'success', marketData, 'extended.getLatestMarketData');
    } catch (error) {
        const message = error.message || 'Failed to get latest market data';
        return createResponse(false, message, null, 'extended.getLatestMarketData');
    }
}

/**
 * @async
 * @function vmGetMarketOrderSize
 * @description Retrieves the market order size configuration for a given symbol using Python service
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string} _symbol - The market symbol for which to retrieve order size configuration.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing order size configuration or an error message.
 */
export async function vmGetMarketOrderSize(callPythonService, _symbol){
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const markets = await callPythonService('get_markets');
        const market = markets.find(m => m.name === _symbol);
        
        if (!market) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'extended.getMarketOrderSize');
        }

        // Mappiamo al formato Extended originale con valori di default
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                minQty: market.min_order_size || 0.001,
                qtyStep: market.qty_step || 0.001,
                maxMktQty: market.max_market_order || 1000000,
                maxLimQty: market.max_limit_order || 1000000,
                priceDecimals: market.price_decimals || 2
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
 * @description Retrieves the hourly funding rate for a given symbol using Python service
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string} _symbol - The market symbol for which to retrieve the funding rate.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the funding rate or an error message.
 */
export async function vmGetFundingRateHour(callPythonService, _symbol) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const marketData = await callPythonService('get_market_data', {
            market_name: _symbol
        });
        
        // Mappiamo al formato Extended originale
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                fundingRate: (marketData.funding_rate || 0) * 100
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
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string} _symbol - The market symbol for which to retrieve the open interest.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open interest data or an error message.
 */
export async function vmGetMarketOpenInterest(callPythonService, _symbol){
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const marketData = await callPythonService('get_market_data', {
            market_name: _symbol
        });
        
        const midPrice = marketData.mark_price || marketData.last_price || 1;
        const openInterest = marketData.open_interest || 0;
        
        // Mappiamo al formato Extended originale
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
        const message = error.message || 'Failed to get market open interest';
        return createResponse(false, message, null, 'extended.getMarketOpenInterest');
    }
}

/**
 * @async
 * @function vmGetOpenPositions
 * @description Retrieves the user's open positions using Python service
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open positions data or an error message.
 */
export async function vmGetOpenPositions(callPythonService) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const positions = await callPythonService('get_positions');
        
        // Mappiamo al formato Extended originale
        const openPositions = positions.filter(pos => pos.size && parseFloat(pos.size) !== 0);
        const markets = openPositions.map(pos => pos.market_name);
        
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
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string} _symbol - The market symbol for which to retrieve the open position details.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open position details or an error message.
 */
export async function vmGetOpenPositionDetail(callPythonService, _symbol) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const positions = await callPythonService('get_positions');
        const position = positions.find(p => p.market_name === _symbol);
        
        if (!position || !position.size || parseFloat(position.size) === 0) {
            return createResponse(false, 'No position found', null, 'extended.getOpenPositionDetail');
        }

        // Mappiamo al formato Extended originale
        const detail = {
            symbol: _symbol,
            avgPrice: position.entry_price || position.avg_price || 0,
            unrealisedPnl: position.unrealized_pnl || position.pnl || 0,
            realisedPnl: position.realized_pnl || 0,
            side: position.side === "BUY" ? "long" : "short",
            qty: Math.abs(parseFloat(position.size)),
            qtyUsd: position.notional || (Math.abs(parseFloat(position.size)) * (position.entry_price || 0))
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
 * @description Retrieves the total earned points using Python service account info
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the total earned points, latest point details, or an error message.
 */
export async function vmGetEarnedPoints(callPythonService) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const accountInfo = await callPythonService('get_account_info');
        
        // Mappiamo al formato Extended originale
        return createResponse(true, 'success', { 
            total: (accountInfo.points || 0).toString(),
            latest: {
                amount: accountInfo.latest_points || 0,
                period: new Date().toISOString().split('T')[0].replace(/-/g, '/') + '-' + new Date().toISOString().split('T')[0].replace(/-/g, '/')
            }
        }, 'extended.getEarnedPoints');
    } catch (error) {
        const message = error.message || 'Failed to get earned points';
        return createResponse(false, message, null, 'extended.getEarnedPoints');
    }
}