import { RestClientV5 } from 'bybit-api';
import {v4 as uuidv4} from 'uuid';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { bybitEnum } from './bybit.enum.js';
import { wmSetInternalTranfer, wmSubmitMarketOrder } from './writeModel.js';
import { vmGetMarketData, vmGetMaketOrderSize, vmGetFundingRateHour, vmGetMarketOpenInterest, vmGetOpenPositions, vmGetOutWithdrawableAmount, vmGetOrderStatus } from './viewModel.js';

export { bybitEnum };

export class bybit {
    constructor(_apiKey, _apiSecret, _settleCoin = 'USDT', _slippage = 0.1) {
        this.client = new RestClientV5({
            key: _apiKey,
            secret: _apiSecret,
            testnet: false,
        });
        this.settleCoin = _settleCoin;
        this.slippage = _slippage;
        this.in = 'UNIFIED';
        this.out = 'FUND';
    }

    /**
     * @async
     * @method getMarketData
     * @description Retrieves market data for a specific symbol or all markets from Bybit's linear category.
     * @param {string} [_symbol=''] - The market symbol to query (e.g., 'BTCUSDT'). If empty, returns data for all markets.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing market data or an error message.
     */
    async getMarketData(_symbol = '') {
        return await vmGetMarketData(this.client, _symbol);
    }
    
    /**
     * @async
     * @method getMaketOrderSize
     * @description Retrieves the recommended market order size for a given trading symbol.
     * @param {string} _symbol - The trading symbol to query (e.g., 'BTCUSDT').
     * @returns {Promise<number>} A Promise that resolves to the recommended market order size for the specified symbol.
     */
    async getMaketOrderSize(_symbol) {
        return await vmGetMaketOrderSize(this.client, _symbol);
    }

    /**
     * @async
     * @method getFundingRateHour
     * @description Retrieves the hourly funding rate for a given trading symbol.
     * Calls the view model to fetch and calculate the funding rate per hour.
     * @param {string} _symbol - The trading symbol to retrieve the funding rate for (e.g., 'BTCUSDT').
     * @returns {Promise<Object>} A Promise that resolves to a response object containing the hourly funding rate or an error message.
     */
    async getFundingRateHour(_symbol) {
        return await vmGetFundingRateHour(this.client, _symbol);
    }

    /**
     * @async
     * @method getMarketOpenInterest
     * @description Retrieves the open interest for a specific market symbol from Bybit's linear category.
     * Calls the view model to fetch the open interest data for the given symbol.
     * @param {string} _symbol - The market symbol to query open interest for (e.g., 'BTCUSDT').
     * @returns {Promise<Object>} A Promise that resolves to a response object containing the open interest data or an error message.
     */
    async getMarketOpenInterest(_symbol) {
        return await vmGetMarketOpenInterest(this.client, _symbol);
    }

    /**
     * @method getOpenPositions
     * @description Retrieves the list of currently open positions from Bybit using the configured client.
     * Calls the view model to fetch all open positions associated with the account.
     * @returns {Promise<Object>} A Promise that resolves to an object containing the open positions data or an error message.
     */
    async getOpenPositions(){
        return await vmGetOpenPositions(this.client, this.settleCoin);
    }

    /**
     * @method getOutWithdrawableAmount
     * @description Retrieves the withdrawable amount for the configured settlement coin from Bybit using the client instance.
     * Calls the view model to fetch the current withdrawable balance available for withdrawal.
     * @returns {Promise<Number>} A Promise that resolves to the withdrawable amount as a number.
     */
    async getOutWithdrawableAmount(){
        return await vmGetOutWithdrawableAmount(this.client, this.settleCoin);
    }

    async getOrderStatus(_orderId) {
        return await vmGetOrderStatus(this.client, _orderId);
    }

    /**
     * @method setInternalTranfer
     * @description Initiates an internal transfer on Bybit using the configured client, settlement coin, and transfer parameters.
     * Calls the view model function to perform the transfer from the internal account to the specified destination.
     * @param {string} to - The destination account or wallet identifier to which the funds will be transferred.
     * @param {number|string} amount - The amount to transfer. Can be a number or string representing the transfer amount.
     * @param {boolean} transferAll - If true, transfers the entire available balance; otherwise, transfers the specified amount.
     * @returns {Promise<Object>} A Promise that resolves to the result of the transfer operation.
     */
    async setInternalTranfer(to, amount, transferAll) {
        return await wmSetInternalTranfer(this.client, this.settleCoin, this.in, this.out, to, amount, transferAll);
    }

    /**
     * @method submitMarketOrder
     * @description Submits a market order on Bybit using the configured client and slippage settings.
     * Calls the view model function to execute a market order for the specified symbol, side, market unit, and order quantity.
     * @param {string} _symbol - The trading symbol (e.g., 'BTCUSDT') for which the market order will be placed.
     * @param {string} _side - The side of the order, either 'Buy' or 'Sell'.
     * @param {string} _marketUnit - The unit of the market order (e.g., 'base' or 'quote').
     * @param {number|string} _orderQty - The quantity for the market order. Can be a number or string representing the amount.
     * @returns {Promise<Object>} A Promise that resolves to the result of the market order submission.
     */
    async submitMarketOrder(_symbol, _side, _marketUnit, _orderQty) {
        return await wmSubmitMarketOrder(this.client, this.slippage, _symbol, _side, _marketUnit, _orderQty);
    }



    async getAccountInfo() {
        try {
            // UNIFIED o FUND
            let myuuid = uuidv4();
            // Usa l'endpoint corretto con il tipo di account
            // const response = await this.client.getWalletBalance({accountType: 'UNIFIED'});
            // const test = await this.client.getAllCoinsBalance({ accountType: 'UNIFIED', coin: 'USDT' });
            // console.log(test.result.balance[0].transferBalance);

            /*
            // Preleva il saldo disponibile per il prelievo
            const response = await this.client.submitWithdrawal({
                coin: 'USDT',                    // Deve essere in maiuscolo
                chain: 'ETH',                    // Deve essere in maiuscolo
                address: '0x970669124ce6381386aaea27aff4a37fc579b992',
                amount: '13',                  // Deve essere una stringa
                timestamp: Date.now(),           // Deve essere un numero intero
                forceChain: 0,                   // Deve essere un numero intero
                accountType: 'FUND',          // Deve essere in maiuscolo
                feeType: 1                       // Deve essere un numero intero
            });*/
            
            /*
            const response = await this.client.getWithdrawalRecords({
                coin: 'USDC',
                withdrawType: 0,
                limit: 2,
            });
            */

            /*
            // Limit Order
            const response = await this.client.submitOrder({
                category: 'linear',  // Per futures/perpetual
                symbol: 'DOGE
                USDT',
                side: 'Buy', // 'Buy' o 'Sell'
                orderType: 'Limit',
                qty: '10', //massimo 3 decimali
                marketUnit: 'quoteCoin',  // Specifica che qty è in USDT
                timeInForce: 'GTC', // Good Till Cancel
                price: '0.222', // Prezzo limite
            });*/
            

            /*
            // Close Limit Order
            const response = await this.client.cancelOrder({
                category: 'linear',  // Per futures/perpetual
                symbol: 'DOGEUSDT',
                orderId: 'ordine-002',
            });
            */

            /*
            // Get Position Details
            const response = await this.client.getPositionInfo({
                category: 'linear',
                symbol: 'XRPUSDT'
            });
            */

            /*
            // Close Market Posizion
            const response = await this.client.submitOrder({
                category: 'linear',
                symbol: 'DOGEUSDT',
                side: 'Sell',
                orderType: 'Market',
                qty: '10',
                marketUnit: 'quoteCoin',
                reduceOnly: true,
                timeInForce: 'IOC'
            });
            */
            

            console.log(response);
            return response.retCode === 0
                ? createResponse(true, 'success', response.result.withdrawableAmount, 'bybit.getAccountInfo')
                : createResponse(false, response.retMsg, null, 'bybit.getAccountInfo');
        } catch (error) {
            return createResponse(false, error.message, null, 'bybit.getAccountInfo');
        }
    }

}

