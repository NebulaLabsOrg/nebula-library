import { RestClientV5 } from 'bybit-api';
import {v4 as uuidv4} from 'uuid';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { bybitEnum } from './bybit.enum.js';
import { wmSetInternalTranfer, wmSubmitMarketOrder, wmSubmitCancelOrder, wmSubmitCloseMarketOrder } from './writeModel.js';
import { vmGetWalletStatus, vmGetWalletBalance, vmGetMarketData, vmGetMaketOrderSize, vmGetFundingRateHour, vmGetMarketOpenInterest, vmGetOpenPositions, vmGetOpenPositionDetail, vmGetOutWithdrawableAmount, vmGetOrderStatus } from './viewModel.js';
import { getBybitChainName } from './utils.js';

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
     * @method getWalletStatus
     * @description Retrieves the wallet status for the current client and settlement coin using the Bybit API.
     * @returns {Promise<Object>} A Promise that resolves with the wallet status object or an error message.
     */
    async getWalletStatus() {
        return await vmGetWalletStatus(this.client, this.settleCoin);
    }

    /**
     * @async
     * @method getWalletBalance
     * @description Retrieves the wallet balance for the current client and settlement coin using the Bybit API.
     * @returns {Promise<Object>} A Promise that resolves with the wallet balance object or an error message.
     */
    async getWalletBalance() {
        return await vmGetWalletBalance(this.client, this.settleCoin);
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
     * @method getOpenPositionDetail
     * @description Retrieves the details of an open position for a specific symbol from Bybit using the configured client.
     * Calls the view model to fetch detailed information about the open position associated with the given symbol and settlement coin.
     * @param {string} _symbol - The trading symbol for which to retrieve the open position details (e.g., 'BTCUSDT').
     * @returns {Promise<Object>} A Promise that resolves to an object containing the open position details or an error message.
     */
    async getOpenPositionDetail(_symbol){
        return await vmGetOpenPositionDetail(this.client, this.settleCoin, _symbol);
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

    /**
     * @method getOrderStatus
     * @description Retrieves the status of an order from Bybit using the provided order ID and the configured client instance.
     * Calls the view model to fetch the current status of the specified order.
     * @param {string} _orderId - The unique identifier of the order whose status is to be retrieved.
     * @returns {Promise<Object>} A Promise that resolves to an object containing the order status details.
     */
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

    /**
     * @method submitCancelOrder
     * @description Submits a request to cancel an existing order on Bybit using the configured client.
     * Calls the view model function to execute the cancellation for the specified trading symbol and order ID.
     * @param {string} _symbol - The trading symbol (e.g., 'BTCUSDT') for which the order cancellation will be requested.
     * @param {string} _orderId - The unique identifier of the order to be cancelled.
     * @returns {Promise<Object>} A Promise that resolves to the result of the order cancellation request.
     */
    async submitCancelOrder(_symbol, _orderId){
        return await wmSubmitCancelOrder(this.client, _symbol, _orderId);
    }

    /**
     * @method submitCloseMarketOrder
     * @description Submits a request to close a market order on Bybit using the configured client.
     * Calls the view model function to execute the close order for the specified trading symbol, quantity, and market unit.
     * Optionally, it can close all open positions for the given symbol.
     * @param {string} _symbol - The trading symbol (e.g., 'BTCUSDT') for which the close market order will be submitted.
     * @param {number|string} _orderQty - The quantity of the order to be closed.
     * @param {string} _marketUnit - The unit of the market order (e.g., 'USD', 'Contracts').
     * @param {boolean} [_closeAll=false] - If true, closes all open positions for the given symbol.
     * @returns {Promise<Object>} A Promise that resolves to the result of the close market order request.
     */
    async submitCloseMarketOrder(_symbol, _orderQty, _marketUnit, _closeAll = false) {
        return await wmSubmitCloseMarketOrder(this.client, this.settleCoin, this.slippage, _symbol, _orderQty, _marketUnit, _closeAll);
    }



    async getAccountInfo() {
        try {

            
            // Preleva il saldo disponibile per il prelievo
            const chain = getBybitChainName('USDC', 8453); // 1 è l'ID della chain ETH
            console.log(chain);
            const response = await this.client.submitWithdrawal({
                coin: 'USDC',                    // Deve essere in maiuscolo
                chain: 'BASE',                    // Deve essere in maiuscolo
                address: '0x970669124ce6381386aaea27aff4a37fc579b992',
                amount: '10',                  // Deve essere una stringa
                timestamp: Date.now(),           // Deve essere un numero intero
                forceChain: 0,                   // Deve essere un numero intero
                accountType: 'FUND',          // Deve essere in maiuscolo
                feeType: 1                       // Deve essere un numero intero
            });
            
            /*
            const response = await this.client.getWithdrawalRecords({
                coin: 'USDC',
                withdrawType: 0,
                limit: 2,
            });*/
            

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
            });*/
            

            console.log(response);
            return response.retCode === 0
                ? createResponse(true, 'success', response.result.withdrawableAmount, 'bybit.getAccountInfo')
                : createResponse(false, response.retMsg, null, 'bybit.getAccountInfo');
        } catch (error) {
            return createResponse(false, error.message, null, 'bybit.getAccountInfo');
        }
    }

}

