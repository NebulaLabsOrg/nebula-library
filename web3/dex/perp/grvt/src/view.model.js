import { createResponse } from '../../../../../utils/src/response.utils.js';
import { ethers } from 'ethers';

/**
 * @async
 * @function vmGetWalletStatus
 * @description Retrieves wallet status via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _subAccountId - Sub account ID
 * @returns {Promise<Object>} Response with balance, equity, leverage
 */
export async function vmGetWalletStatus(_instance, _subAccountId) {
    try {
        // Get aggregated account summary
        const aggregatedResponse = await _instance.post('/full/v1/aggregated_account_summary', {});
        
        if (!aggregatedResponse.data || !aggregatedResponse.data.result) {
            throw new Error('Invalid response from aggregated_account_summary');
        }
        
        const aggregated = aggregatedResponse.data.result;
        
        // Get sub account summary for leverage calculation
        const accountResponse = await _instance.post('/full/v1/account_summary', {
            sub_account_id: _subAccountId
        });
        
        if (!accountResponse.data || !accountResponse.data.result) {
            throw new Error('Invalid response from account_summary');
        }
        
        const account = accountResponse.data.result;
        
        // Calculate leverage using ethers v6: leverage = initial_margin / total_equity
        let leverage = '0';
        try {
            const totalEquity = account.total_equity || '0';
            const initialMargin = account.positions[0]?.notional || '0';
            if (parseFloat(initialMargin) > 0 && parseFloat(totalEquity) > 0) {
                // Use ethers v6 BigNumber for precise calculation
                const marginBN = ethers.parseUnits(initialMargin, 18);
                const equityBN = ethers.parseUnits(totalEquity, 18);
                // leverage = margin / equity, scaled by 1e18 for precision, then format to 2 decimals
                const leverageBN = marginBN * ethers.parseUnits('1', 18) / equityBN;
                leverage = parseFloat(ethers.formatUnits(leverageBN, 18)).toFixed(2);
            }
        } catch (calcError) {
            console.error('Leverage calculation error:', calcError);
            leverage = '0';
        }
        
        // Convert updatedTime to readable format (assuming nanosecond timestamp)
        let updatedTime = account.event_time || aggregatedResponse.data.event_time;
        if (updatedTime) {
            const timestamp = parseInt(updatedTime);
            updatedTime = new Date(timestamp / 1000000).toISOString();
        }
        
        return createResponse(
            true,
            'success',
            {
                equity: aggregated.total_equity || '0',
                vault: aggregated.total_vault_investments_balance || '0',
                leverage: leverage,
                updatedTime: updatedTime
            },
            'grvt.getWalletStatus'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get wallet status';
        return createResponse(false, message, null, 'grvt.getWalletStatus');
    }
}

/**
 * @async
 * @function vmGetWalletBalance
 * @description Retrieves aggregated account summary via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @returns {Promise<Object>} Response with available balance, PnL
 */
export async function vmGetWalletBalance(_instance) {
    try {
        const response = await _instance.post('/full/v1/aggregated_account_summary', {});
        
        const data = response.data;
        
        if (!data || !data.result) {
            throw new Error('Invalid response from API');
        }
        
        const result = data.result;

        // Calculate available for withdrawal using BigNumber: total_equity - total_sub_account_equity
        let availableForWithdrawal = '0';
        try {
            const totalEquity = result.total_equity || '0';
            const totalSubAccountEquity = result.total_sub_account_equity || '0';
            const equityBN = ethers.parseUnits(totalEquity, 18);
            const subEquityBN = ethers.parseUnits(totalSubAccountEquity, 18);
            const withdrawalBN = equityBN - subEquityBN;
            availableForWithdrawal = ethers.formatUnits(withdrawalBN, 18);
        } catch (calcError) {
            console.error('Available for withdrawal calculation error:', calcError);
            availableForWithdrawal = '0';
        }
        
        return createResponse(
            true,
            'success',
            {
                availableTradingAccount: result.total_sub_account_equity, //in trading account
                availableFundingAccount: availableForWithdrawal //in funding account
            },
            'grvt.getWalletBalance'
        );
    } catch (error) {
        console.error('Aggregated account summary error:', error.response?.status, error.response?.data);
        const message = error.response?.data?.error?.message || error.message || 'Failed to get wallet balance';
        return createResponse(false, message, null, 'grvt.getWalletBalance');
    }
}

/**
 * @async
 * @function vmGetMarketData
 * @description Retrieves market data for all or specific symbol via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} [_symbol=''] - Optional symbol filter
 * @returns {Promise<Object>} Response with market data
 */
export async function vmGetMarketData(_instance, _symbol = '') {
    try {
        // If specific symbol requested
        if (_symbol) {
            const response = await _instance.post('/full/v1/instrument', {
                instrument: _symbol
            });
            
            if (!response.data || !response.data.result) {
                return createResponse(false, `Market ${_symbol} not found`, null, 'grvt.getMarketData');
            }
            
            return createResponse(true, 'success', [response.data.result], 'grvt.getMarketData');
        }
        
        // Return all active markets
        const response = await _instance.post('/full/v1/all_instruments', {
            is_active: true
        });
        
        if (!response.data || !response.data.result) {
            throw new Error('Invalid response from API');
        }
        
        return createResponse(true, 'success', response.data.result, 'grvt.getMarketData');
        
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get market data';
        return createResponse(false, message, null, 'grvt.getMarketData');
    }
}

/**
 * @async
 * @function vmGetMarketOrderSize
 * @description Retrieves market order size information for a given symbol via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _symbol - The market symbol for which to retrieve order size information
 * @returns {Promise<Object>} A promise that resolves to a response object containing the minimum quantity, quantity step, and tick size information, or an error message
 */
export async function vmGetMarketOrderSize(_instance, _symbol) {
    try {
        const response = await _instance.post('/full/v1/instrument', {
            instrument: _symbol
        });
        
        if (!response.data || !response.data.result) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'grvt.getMarketOrderSize');
        }
        
        const instrument = response.data.result;
        
        // Get ticker for current price
        const tickerResponse = await _instance.post('/full/v1/ticker', {
            instrument: _symbol
        });
        
        const ticker = tickerResponse.data?.result;
        const markPriceStr = ticker?.mark_price || '1';
        
        // Calculate decimals from min_size and tick_size
        const countDecimals = (value) => {
            if (!value) return 0;
            const str = value.toString();
            if (str.includes('.')) {
                return str.split('.')[1].length;
            }
            return 0;
        };
        
        const tickSize = parseFloat(instrument.tick_size);
        const tokenDecimals = countDecimals(instrument.min_size);
        const priceDecimals = countDecimals(instrument.tick_size);
        
        // Use ethers BigNumber for precise calculations
        const PRECISION = 18;
        const minSizeBN = ethers.parseUnits(instrument.min_size, PRECISION);
        const maxPosSizeBN = ethers.parseUnits(instrument.max_position_size, PRECISION);
        const markPriceBN = ethers.parseUnits(markPriceStr, PRECISION);
        
        // Calculate secCoin values: value * markPrice
        const minQtySecBN = (minSizeBN * markPriceBN) / ethers.parseUnits('1', PRECISION);
        const maxQtySecBN = (maxPosSizeBN * markPriceBN) / ethers.parseUnits('1', PRECISION);
        
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                mainCoin: {
                    minQty: instrument.min_size,
                    qtyStep: instrument.min_size,
                    maxMktQty: instrument.max_position_size,
                    maxLimQty: instrument.max_position_size
                },
                secCoin: {
                    minQty: Math.round(parseFloat(ethers.formatUnits(minQtySecBN, PRECISION))).toString(),
                    qtyStep: Math.round(parseFloat(ethers.formatUnits(minQtySecBN, PRECISION))).toString(),
                    maxMktQty: Math.round(parseFloat(ethers.formatUnits(maxQtySecBN, PRECISION))).toString(),
                    maxLimQty: Math.round(parseFloat(ethers.formatUnits(maxQtySecBN, PRECISION))).toString()
                },
                priceDecimals: priceDecimals
            },
            'grvt.getMarketOrderSize'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get market order size';
        return createResponse(false, message, null, 'grvt.getMarketOrderSize');
    }
}

/**
 * @async
 * @function vmGetFundingRateHour
 * @description Retrieves the annualized funding rate for a given market symbol via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _symbol - The market symbol for which to retrieve the funding rate
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the annualized funding rate or an error message
 */
export async function vmGetFundingRateHour(_instance, _symbol) {
    try {
        const response = await _instance.post('/full/v1/ticker', {
            instrument: _symbol
        });
        
        if (!response.data || !response.data.result) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'grvt.getFundingRateHour');
        }
        
        const ticker = response.data.result;
        
        // funding_rate is already in percentage for 8-hour periods
        // Example: 0.01 = 0.01% per 8 hours
        // Annualize: rate * 3 periods/day * 365 days = rate * 1095
        
        // Use ethers BigNumber for precise calculations
        const PRECISION = 18;
        const fundingRatePercent = ticker.funding_rate || '0';
        
        const rateBN = ethers.parseUnits(fundingRatePercent, PRECISION);
        const multiplier = ethers.parseUnits('1095', PRECISION); // 3 * 365
        
        const fundingRateAnnualBN = (rateBN * multiplier) / ethers.parseUnits('1', PRECISION);
        
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                fundingRate: ethers.formatUnits(fundingRateAnnualBN, PRECISION)
            },
            'grvt.getFundingRateHour'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get funding rate';
        return createResponse(false, message, null, 'grvt.getFundingRateHour');
    }
}

/**
 * @async
 * @function vmGetMarketOpenInterest
 * @description Retrieves the open interest for a given market symbol via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _symbol - The market symbol for which to retrieve the open interest
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the open interest data or an error message
 */
export async function vmGetMarketOpenInterest(_instance, _symbol) {
    try {
        const response = await _instance.post('/full/v1/ticker', {
            instrument: _symbol
        });
        
        if (!response.data || !response.data.result) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'grvt.getMarketOpenInterest');
        }
        
        const ticker = response.data.result;
        
        // Calculate openInterestUsd using ethers BigNumber for precision
        const PRECISION = 18;
        const openInterestBase = ticker.open_interest || '0';
        const markPrice = ticker.mark_price || '0';
        
        const openInterestBN = ethers.parseUnits(openInterestBase, PRECISION);
        const markPriceBN = ethers.parseUnits(markPrice, PRECISION);
        
        const openInterestUsdBN = (openInterestBN * markPriceBN) / ethers.parseUnits('1', PRECISION);
        
        return createResponse(
            true,
            'success',
            {
                symbol: _symbol,
                openInterest: openInterestBase,
                openInterestUsd: ethers.formatUnits(openInterestUsdBN, PRECISION)
            },
            'grvt.getMarketOpenInterest'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get market open interest';
        return createResponse(false, message, null, 'grvt.getMarketOpenInterest');
    }
}

/**
 * @async
 * @function vmGetOpenPositions
 * @description Retrieves all open positions via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _subAccountId - Sub account ID
 * @returns {Promise<Object>} Response with positions summary
 */
export async function vmGetOpenPositions(_instance, _subAccountId) {
    try {
        const response = await _instance.post('/full/v1/positions', {
            sub_account_id: _subAccountId
        });
        
        if (!response.data || !response.data.result) {
            throw new Error('Invalid response from positions API');
        }
        
        const positions = response.data.result;
        
        // Filter only positions with non-zero size
        const openPositions = positions.filter(pos => {
            const size = parseFloat(pos.size || 0);
            return size !== 0;
        });
        
        return createResponse(
            true,
            'success',
            { 
                openPositions: openPositions.length, 
                markets: openPositions.map(pos => pos.market || pos.instrument)
            },
            'grvt.getOpenPositions'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get open positions';
        return createResponse(false, message, null, 'grvt.getOpenPositions');
    }
}

/**
 * @async
 * @function vmGetOpenPositionDetail
 * @description Retrieves details for specific open position via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _subAccountId - Sub account ID
 * @param {string} _symbol - Market symbol
 * @returns {Promise<Object>} Response with position details
 */
export async function vmGetOpenPositionDetail(_instance, _subAccountId, _symbol) {
    try {
        if (!_symbol) {
            throw new Error('Symbol is required');
        }
        
        const response = await _instance.post('/full/v1/positions', {
            sub_account_id: _subAccountId
        });
        
        if (!response.data || !response.data.result) {
            throw new Error('Invalid response from positions API');
        }
        
        const positions = response.data.result;
        
        const position = positions.find(p => 
            (p.market === _symbol || p.instrument === _symbol)
        );
        
        if (!position) {
            return createResponse(false, `No position found for ${_symbol}`, null, 'grvt.getOpenPositionDetail');
        }
        
        const size = parseFloat(position.size || 0);
        
        if (size === 0) {
            return createResponse(false, 'Position size is zero', null, 'grvt.getOpenPositionDetail');
        }
        
        const detail = {
            symbol: _symbol,
            avgPrice: position.open_price || position.entry_price || '0',
            markPrice: position.mark_price || '0',
            liquidationPrice: position.liquidation_price || '0',
            unrealisedPnl: position.unrealised_pnl || '0',
            realisedPnl: position.realised_pnl || '0',
            side: size > 0 ? 'long' : 'short',
            qty: Math.abs(size),
            qtyUsd: position.value || (Math.abs(size) * parseFloat(position.mark_price || 0)).toString()
        };
        
        return createResponse(true, 'success', detail, 'grvt.getOpenPositionDetail');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get open position detail';
        return createResponse(false, message, null, 'grvt.getOpenPositionDetail');
    }
}

/**
 * @async
 * @function vmGetOrderStatus
 * @description Retrieves order status by ID (HTTP API)
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _orderId - Order ID
 * @returns {Promise<Object>} Response with order details
 */
export async function vmGetOrderStatus(_instance, _orderId) {
    try {
        if (!_orderId) {
            throw new Error('Order ID is required');
        }
        
        const response = await _instance.get(`/full/v1/order`, {
            params: {
                order_id: _orderId
            }
        });
        
        const data = response.data;
        
        if (!data || !data.result) {
            return createResponse(false, 'No order found', null, 'grvt.getOrderStatus');
        }
        
        const order = data.result;
        
        const detail = {
            orderId: order.order_id || _orderId,
            symbol: order.instrument || order.market || '',
            orderType: order.order_type || order.type || '',
            status: order.state || order.status || '',
            side: order.is_buy ? 'BUY' : 'SELL',
            qty: order.size || order.qty || '0',
            qtyExe: order.filled_size || order.filled_qty || '0',
            avgPrice: order.average_price || order.avg_price || '0',
            limitPrice: order.limit_price || '0',
            createdAt: order.create_time || order.created_at || '',
            updatedAt: order.update_time || order.updated_at || ''
        };
        
        // Calculate executed value
        const filledSize = parseFloat(detail.qtyExe);
        const avgPrice = parseFloat(detail.avgPrice);
        detail.qtyExeUsd = (filledSize * avgPrice).toString();
        
        return createResponse(true, 'success', detail, 'grvt.getOrderStatus');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get order status';
        return createResponse(false, message, null, 'grvt.getOrderStatus');
    }
}

/**
 * @async
 * @function vmGetOrderHistory
 * @description Retrieves order history via Python SDK
 * @param {Object} _extended - Extended instance
 * @param {string} [_symbol=''] - Optional symbol filter
 * @param {number} [_limit=50] - Limit number of orders
 * @returns {Promise<Object>} Response with order history
 */
export async function vmGetOrderHistory(_extended, _symbol = '', _limit = 50) {
    try {
        const params = { limit: _limit };
        if (_symbol) {
            params.instrument = _symbol;
        }
        
        const orders = await _extended._sendCommand('get_order_history', params);
        
        if (orders.error) {
            throw new Error(orders.error);
        }
        
        return createResponse(
            true,
            'success',
            {
                count: orders.length,
                orders: orders
            },
            'grvt.getOrderHistory'
        );
    } catch (error) {
        const message = error.message || 'Failed to get order history';
        return createResponse(false, message, null, 'grvt.getOrderHistory');
    }
}

/**
 * @async
 * @function vmGetAccountInfo
 * @description Retrieves comprehensive account information
 * @param {Object} _extended - Extended instance
 * @returns {Promise<Object>} Response with account details
 */
export async function vmGetAccountInfo(_extended) {
    try {
        const accountInfo = await _extended._sendCommand('get_account_info');
        
        if (accountInfo.error) {
            throw new Error(accountInfo.error);
        }
        
        return createResponse(
            true,
            'success',
            accountInfo,
            'grvt.getAccountInfo'
        );
    } catch (error) {
        const message = error.message || 'Failed to get account info';
        return createResponse(false, message, null, 'grvt.getAccountInfo');
    }
}

/**
 * @async
 * @function vmGetTransferHistory
 * @description Gets transfer history between funding and trading accounts
 * @param {Object} _extended - Extended instance  
 * @param {number} [_limit=50] - Maximum number of records
 * @param {string} [_cursor=null] - Pagination cursor
 * @returns {Promise<Object>} Response with transfer history
 */
export async function vmGetTransferHistory(_extended, _limit = 50, _cursor = null) {
    try {
        const params = { limit: _limit };
        if (_cursor) params.cursor = _cursor;
        
        const result = await _extended._sendCommand('transfer_history', { params });
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return createResponse(true, 'success', result, 'grvt.getTransferHistory');
    } catch (error) {
        return createResponse(false, error.message, null, 'grvt.getTransferHistory');
    }
}
