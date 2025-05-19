import { RestClientV5 } from 'bybit-api';
import { createResponse } from '../../../../../utils/src/response.utils.js';

export class bybit {
    constructor(_apiKey, _apiSecret) {
        this.client = new RestClientV5({
            key: _apiKey,
            secret: _apiSecret,
            testnet: false,
        });
    }

    /**
     * @async
     * @method getMarketData
     * @description Retrieves market data for a specific symbol or all markets from Bybit's linear category.
     * @param {string} [symbol=''] - The market symbol to query (e.g., 'BTCUSDT'). If empty, returns data for all markets.
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
    async getMarketData(symbol = '') {
        try {
            const res = await this.client.getTickers({ category: 'linear', symbol });
            return res.retCode === 0
                ? createResponse(true, 'success', res.result, 'bybit.getMarketData')
                : createResponse(false, res.retMsg, null, 'bybit.getMarketData');
        } catch (error) {
            return createResponse(false, error.message, null, 'bybit.getMarketData');
        }
    }
    
    /**
     * @async
     * @method getMaketInfo
     * @description Retrieves market information for a given symbol from Bybit's linear perpetual instruments.
     * @param {string} symbol - The trading symbol (e.g., 'BTCUSDT') for which to fetch market information.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the market information or an error message.
     * 
     * Example of returns .data.lost:
     * [
     *   {
            symbol: 'BTCUSDT',
            contractType: 'LinearPerpetual',
            status: 'Trading',
            baseCoin: 'BTC',
            quoteCoin: 'USDT',
            launchTime: '1584230400000',
            deliveryTime: '0',
            deliveryFeeRate: '',
            priceScale: '2',
            leverageFilter: [Object],
            priceFilter: [Object],
            lotSizeFilter: [Object],
            unifiedMarginTrade: true,
            fundingInterval: 480,
            settleCoin: 'USDT',
            copyTrading: 'both',
            upperFundingRate: '0.005',
            lowerFundingRate: '-0.005',
            isPreListing: false,
            preListingInfo: null,
            riskParameters: [Object],
            displayName: ''
     *   }
     * ]
    */
    async getMaketInfo(symbol) {
        try {
            const res = await this.client.getInstrumentsInfo({ category: 'linear', symbol });
            return res.retCode === 0
            ? createResponse(true, 'success', res.result.list, 'bybit.getMaketInfo')
            : createResponse(false, res.retMsg, null, 'bybit.getMaketInfo');
        } catch (error) {
            return createResponse(false, error.message, null, 'bybit.getMaketInfo');
        }
    }

    /**
     * Retrieves the hourly funding rate for a given symbol.
     *
     * This method fetches market information and market data for the specified symbol,
     * calculates the hourly funding rate based on the funding interval and funding rate,
     * and returns a standardized response object.
     *
     * @async
     * @param {string} symbol - The trading symbol to retrieve the funding rate for.
     * @returns {Promise<Object>} A promise that resolves to a response object containing the hourly funding rate,
     *                            or an error message if retrieval fails.
     */
    async getFundingRateHour(symbol) {
        try {
            const marketInfo = await this.getMaketInfo(symbol);
            const fundingInterval = marketInfo?.data?.[0]?.fundingInterval;
            if (!fundingInterval) return createResponse(false, 'No funding interval', null, 'bybit.getFundingRateHour');

            const marketData = await this.getMarketData(symbol);
            const fundingRate = marketData?.data?.list?.[0]?.fundingRate;
            if (!fundingRate) return createResponse(false, 'No funding rate', null, 'bybit.getFundingRateHour');

            const hourlyFundingRate = fundingRate / (fundingInterval / (1000 * 60 * 60));
            return createResponse(true, 'success', { symbol, fundingRate: hourlyFundingRate }, 'bybit.getFundingRateHour');
        } catch (error) {
            return createResponse(false, error.message || 'Failed to get funding rate', null, 'bybit.getFundingRateHour');
        }
    }

}

