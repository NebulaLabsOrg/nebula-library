import { createResponse } from '../../../../../utils/src/response.utils.js';
import { ethers } from 'ethers';
// WebSocket monitoring rimosso

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
            
            // Use ethers v6 BigNumber for precise calculation
            const PRECISION = 18;
            const marginBN = ethers.parseUnits(initialMargin, PRECISION);
            const equityBN = ethers.parseUnits(totalEquity, PRECISION);
            
            // Check if values are greater than zero using BigNumber
            if (marginBN > 0n && equityBN > 0n) {
                // leverage = margin / equity, scaled by 1e18 for precision
                const leverageBN = (marginBN * ethers.parseUnits('1', PRECISION)) / equityBN;
                const leverageFormatted = ethers.formatUnits(leverageBN, PRECISION);
                
                // Round to 2 decimals using BigNumber
                const leverageRounded = ethers.parseUnits(leverageFormatted, 2);
                leverage = ethers.formatUnits(leverageRounded, 2);
            }
        } catch (calcError) {
            console.error('Leverage calculation error:', calcError);
            leverage = '0';
        }
        
        // Convert updatedTime to readable format (assuming nanosecond timestamp)
        let updatedTime = account.event_time || aggregatedResponse.data.event_time;
        
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
 * @function vmGetMarketDataPrices
 * @description Retrieves real-time price data for a specific market via HTTP API
 * @param {Object} _instance - HTTP client instance (axios)
 * @param {string} _symbol - Market symbol (e.g., 'BTC_USDT_Perp')
 * @returns {Promise<Object>} Response with comprehensive price and market data
 */
export async function vmGetMarketDataPrices(_instance, _symbol) {
    try {
        if (!_symbol) {
            throw new Error('Symbol is required');
        }

        const response = await _instance.post('/full/v1/ticker', {
            instrument: _symbol
        });
        
        if (!response.data || !response.data.result) {
            return createResponse(false, `Market ${_symbol} not found`, null, 'grvt.getMarketDataPrices');
        }
        
        const ticker = response.data.result;
        
        // Convert event_time from nanoseconds to ISO string
        let eventTime = ticker.event_time;
        if (eventTime) {
            const timestamp = parseInt(eventTime);
            eventTime = new Date(timestamp / 1000000).toISOString();
        }
        
        // Convert next_funding_time from nanoseconds to ISO string
        let nextFundingTime = ticker.next_funding_time;
        if (nextFundingTime) {
            const timestamp = parseInt(nextFundingTime);
            nextFundingTime = new Date(timestamp / 1000000).toISOString();
        }
        
        return createResponse(
            true,
            'success',
            {
                instrument: ticker.instrument,
                eventTime: eventTime,
                // Prices
                markPrice: ticker.mark_price,
                indexPrice: ticker.index_price,
                lastPrice: ticker.last_price,
                lastSize: ticker.last_size,
                midPrice: ticker.mid_price,
                // Order book
                bestBidPrice: ticker.best_bid_price,
                bestBidSize: ticker.best_bid_size,
                bestAskPrice: ticker.best_ask_price,
                bestAskSize: ticker.best_ask_size,
                // Funding rates
                fundingRate8hCurr: ticker.funding_rate_8h_curr,
                fundingRate8hAvg: ticker.funding_rate_8h_avg,
                interestRate: ticker.interest_rate,
                fundingRate: ticker.funding_rate,
                nextFundingTime: nextFundingTime,
                // Forward price
                forwardPrice: ticker.forward_price,
                // 24h volumes
                buyVolume24hBase: ticker.buy_volume_24h_b,
                sellVolume24hBase: ticker.sell_volume_24h_b,
                buyVolume24hQuote: ticker.buy_volume_24h_q,
                sellVolume24hQuote: ticker.sell_volume_24h_q,
                // 24h price range
                highPrice24h: ticker.high_price,
                lowPrice24h: ticker.low_price,
                openPrice24h: ticker.open_price,
                // Open interest
                openInterest: ticker.open_interest,
                longShortRatio: ticker.long_short_ratio
            },
            'grvt.getMarketDataPrices'
        );
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get market data prices';
        return createResponse(false, message, null, 'grvt.getMarketDataPrices');
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
        
        // Use BigNumber for size check and calculations
        const PRECISION = 18;
        const sizeStr = position.size || '0';
        const sizeBN = ethers.parseUnits(sizeStr, PRECISION);
        
        if (sizeBN === 0n) {
            return createResponse(false, 'Position size is zero', null, 'grvt.getOpenPositionDetail');
        }
        
        // Determine side and calculate absolute qty using BigNumber
        const isLong = sizeBN > 0n;
        const absSizeBN = isLong ? sizeBN : -sizeBN;
        const qty = ethers.formatUnits(absSizeBN, PRECISION);
        
        // Calculate qtyUsd if not provided: qty * markPrice
        let qtyUsd = position.value || '0';
        if (!position.value && position.mark_price) {
            const markPriceBN = ethers.parseUnits(position.mark_price, PRECISION);
            const qtyUsdBN = (absSizeBN * markPriceBN) / ethers.parseUnits('1', PRECISION);
            qtyUsd = ethers.formatUnits(qtyUsdBN, PRECISION);
        }
        
        const detail = {
            symbol: _symbol,
            avgPrice: position.open_price || position.entry_price || '0',
            markPrice: position.mark_price || '0',
            liquidationPrice: position.est_liquidation_price || '0',
            unrealisedPnl: position.unrealized_pnl || '0',
            realisedPnl: position.realized_pnl || '0',
            side: isLong ? 'long' : 'short',
            qty: qty,
            qtyUsd: qtyUsd
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
 * @description Retrieves the current status of an order via HTTP API
 * @param {Object} _grvtInstance - Grvt instance with HTTP client (should have .instance and .trading.accountId)
 * @param {string} _symbol - Market symbol (e.g., 'BTC_USDT_Perp')
 * @param {string} _orderId - Order ID to check
 * @returns {Promise<Object>} Response with order status
 */
export async function vmGetOrderStatus(_grvtInstance, _symbol, _orderId) {
    try {
        if (!_grvtInstance?.instance || !_grvtInstance?.trading?.accountId) {
            throw new Error('Not authenticated');
        }
        if (!_symbol) {
            throw new Error('Symbol is required');
        }
        if (!_orderId) {
            throw new Error('Order ID is required');
        }

        // Call the API to get all orders for the symbol
        const response = await _grvtInstance.instance.post('/full/v1/orders', {
            sub_account_id: _grvtInstance.trading.accountId,
            instrument: _symbol
        });

        if (!response.data || !response.data.result) {
            throw new Error('Invalid response from orders API');
        }

        // Find the order by orderId
        const orders = response.data.result;
        const order = orders.find(o => o.order_id === _orderId || o.external_id === _orderId);

        if (!order) {
            return createResponse(false, `Order ${_orderId} not found for ${_symbol}`, null, 'grvt.getOrderStatus');
        }

        return createResponse(true, 'success', order, 'grvt.getOrderStatus');
    } catch (error) {
        const message = error.response?.data?.error?.message || error.message || 'Failed to get order status';
        return createResponse(false, message, null, 'grvt.getOrderStatus');
    }
}
