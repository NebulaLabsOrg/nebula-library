import { RestClientV5 } from 'bybit-api';
import {v4 as uuidv4} from 'uuid';

import { vmGetMarketData, vmGetMaketOrderSize, vmGetFundingRateHour, vmGetMarketOpenInterest } from './viewModel.js';


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






    async getAccountInfo() {
        try {
            // UNIFIED o FUND
            let myuuid = uuidv4();
            // Usa l'endpoint corretto con il tipo di account
            // const response = await this.client.getWalletBalance({accountType: 'UNIFIED'});
            // const test = await this.client.getAllCoinsBalance({ accountType: 'FUND', coin: 'USDT' });
            //  const response = await this.client.getWithdrawableAmount({ coin: 'USDC' });
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
            //transfer
            const response = await this.client.createInternalTransfer(
                myuuid,
                'USDT',
                test.result.balance[0].transferBalance,
                'FUND',
                'UNIFIED',
            );*/
            
            /*
            const response = await this.client.getWithdrawalRecords({
                coin: 'USDC',
                withdrawType: 0,
                limit: 2,
            });
            */

            /*
            // Market Order
            const response = await this.client.submitOrder({
                category: 'linear',  // Per futures/perpetual
                symbol: 'DOGEUSDT',
                side: 'Buy', // 'Buy' o 'Sell'
                orderType: 'Market',
                qty: '10', //massimo 3 decimali
                marketUnit: 'quoteCoin',  // Specifica che qty è in USDT
                timeInForce: 'IOC', // Immediate or Cancel
                slippageToleranceType: 'Percent',  // Opzionale
                slippageTolerance: '0.1', 
            });
            // return.orderId
            */

            /*
            // Limit Order
            const response = await this.client.submitOrder({
                category: 'linear',  // Per futures/perpetual
                symbol: 'DOGEUSDT',
                side: 'Buy', // 'Buy' o 'Sell'
                orderType: 'Limit',
                qty: '10', //massimo 3 decimali
                marketUnit: 'quoteCoin',  // Specifica che qty è in USDT
                timeInForce: 'GTC', // Good Till Cancel
                price: '0.222', // Prezzo limite
                orderLinkId: 'ordine-002',
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
            //Get Order Status
            const response = await this.client.getActiveOrders({
                category: 'linear',
                orderId: 'e1a6222c-5298-4aa2-93b1-a05d855b64dd',
                openOnly: 0,
                limit: 1
            })
            */

            /*
            // Get Order Details
            const response = await this.client.getPositionInfo({
                category: 'linear',
                symbol: 'DOGEUSDT'
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
                ? createResponse(true, 'success', response.result, 'bybit.getAccountInfo')
                : createResponse(false, response.retMsg, null, 'bybit.getAccountInfo');
        } catch (error) {
            return createResponse(false, error.message, null, 'bybit.getAccountInfo');
        }
    }

}

