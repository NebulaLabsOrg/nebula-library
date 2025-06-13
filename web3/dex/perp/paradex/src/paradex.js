import { shortString } from 'starknet';
import { createInstance } from '../../../../../utils/src/http.utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { amOnboardUser, amAuthenticateUser } from './authModel.js';
import { vmGetWalletStatus, vmGetWalletBalances, vmGetMarketData, vmGetMarketOrderSize, vmGetFundingRateHour, vmGetMarketOpenInterest, vmGetOpenPositions, vmGetOpenPositionDetail, vmGetOrderStatus } from './viewModel.js';
import { wmSubmitOrder, wmSubmitCancelOrder, wmSubmitCloseOrder } from './writeModel.js';
import { clearParadexHeaders } from './utils.js';
import { PARADEX_CHAIN_ID } from './constants.js';
import { paradexEnum } from './enum.js';

export { paradexEnum };

/**
 * @class paradex
 * @description A class for interacting with the Paradex decentralized exchange. 
 * Provides methods for onboarding, authenticating, and retrieving account information for users.
 */
export class Paradex {
    /**
    * @constructor
    * @param {string} _accountAddress - The user's Paradex account address.
    * @param {string} _publicKey - The user's public key.
    * @param {string} _privateKey - The user's private key.
    * @param {string} _ethereumAccount - The user's associated Ethereum account.
    * 
    */
    constructor(_accountAddress, _publicKey, _privateKey, _ethereumAccount, _enOnlyPerp = false) {
        this.account = {
            address: _accountAddress,
            publicKey: _publicKey,
            privateKey: _privateKey,
            ethereumAccount: _ethereumAccount
        };
        this.chainId = shortString.encodeShortString(PARADEX_CHAIN_ID);
        this.instance = createInstance('https://api.prod.paradex.trade/v1');
        this._enOnlyPerp = _enOnlyPerp; // Flag to enable only perpetual markets
    }
    /**
     * @async
     * @method onboardUser
     * @description Onboards the current user to Paradex using their account information.
     * @returns {Promise<Object>} A Promise that resolves with the onboarding response object.
     */
    async onboardUser() {
        return await amOnboardUser(this.instance, this.chainId, this.account);
    }
    /**
     * @async
     * @method getWalletStatus
     * @description Authenticates the user and retrieves their account information from Paradex.
     * @returns {Promise<Object>} A Promise that resolves with the user's account information or an error response.
     */
    async getWalletStatus() {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getWalletStatus -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetWalletStatus(this.instance);
    }

    /**
     * Retrieves the wallet balances for the authenticated user.
     *
     * This function authenticates the user, sets the appropriate authorization headers,
     * and then fetches the wallet balances for the specified token (or all tokens if none is specified).
     *
     * @async
     * @method getWalletBalances
     * @param {string} [_token=''] - The token symbol to filter balances by. If empty, retrieves all balances.
     * @returns {Promise<Object>} A promise that resolves to a response object containing the wallet balances or an error message.
     */
    async getWalletBalances(_token = '') {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getWalletBalances -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetWalletBalances(this.instance, _token);
    }

    /**
     * Retrieves market data for a specific symbol and market type (perpetual only or all).
     * Authenticates the user, sets the authorization header, and calls the function to fetch market data.
     * 
     * @async
     * @method getMarketData
     * @param {string} _symbol - The symbol of the market to retrieve data for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing market data or an error message.
     */
    async getMarketData(_symbol) {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getMarketData -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetMarketData(this.instance, this._enOnlyPerp, _symbol);
    }

    /**
     * Retrieves the order size for a specific symbol.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the market order size.
     * 
     * @async
     * @method getMarketOrderSize
     * @param {string} _symbol - The symbol of the market to retrieve the order size for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the market order size or an error message.
     */
    async getMarketOrderSize(_symbol) {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getMarketOrderSize -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetMarketOrderSize(this.instance, _symbol);
    }

    /**
     * Retrieves the funding rate per hour for a specific symbol.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the funding rate.
     * 
     * @async
     * @method getFundingRateHour
     * @param {string} _symbol - The symbol of the market to retrieve the funding rate for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the funding rate or an error message.
     */
    async getFundingRateHour(_symbol) {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getFundingRateHour -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetFundingRateHour(this.instance, _symbol);
    }

    /**
     * Retrieves the open interest for a specific market symbol.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the market open interest.
     * 
     * @async
     * @method getMarketOpenInterest
     * @param {string} _symbol - The symbol of the market to retrieve the open interest for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open interest data or an error message.
     */
    async getMarketOpenInterest(_symbol) {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getMarketOpenInterest -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetMarketOpenInterest(this.instance, _symbol);
    }

    /**
     * Retrieves the open positions for the authenticated user.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the user's open positions.
     * 
     * @async
     * @method getOpenPositions
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open positions data or an error message.
     */
    async getOpenPositions() {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getOpenPositions -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetOpenPositions(this.instance);
    }

    /**
     * Retrieves the status of a position for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the position status for the specified symbol.
     * 
     * @async
     * @method getOpenPositionDetail
     * @param {string} _symbol - The symbol of the position to retrieve the status for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the position status data or an error message.
     */
    async getOpenPositionDetail(_symbol) {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getOpenPositionDetail -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetOpenPositionDetail(this.instance, _symbol);
    }

    /**
     * Retrieves the status of an order for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to fetch the order status for the specified order ID.
     * 
     * @async
     * @method getOrderStatus
     * @param {string} _orderId - The ID of the order to retrieve the status for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the order status data or an error message.
     */
    async getOrderStatus(_orderId) {
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.getOrderStatus -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await vmGetOrderStatus(this.instance, _orderId);
    }

    /**
     * Submits an order for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to submit an order with the specified parameters.
     *
     * @async
     * @method submitOrder
     * @param {string} _type - The type of the order (e.g., 'limit', 'market').
     * @param {string} _symbol - The symbol of the asset to trade.
     * @param {string} _side - The side of the order ('buy' or 'sell').
     * @param {string} _marketUnit - The unit of the market (e.g., 'ETH', 'USD').
     * @param {number|string} _orderQty - The quantity of the order.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the order submission result or an error message.
     */
    async submitOrder(_type, _symbol, _side, _marketUnit, _orderQty){
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.submitOrder -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await wmSubmitOrder(this.instance, this.chainId, this.account, _type, _symbol, _side, _marketUnit, _orderQty);
    }

    /**
     * Cancels an order for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to cancel the order with the specified order ID.
     *
     * @async
     * @method submitCancelOrder
     * @param {string} _orderId - The unique identifier of the order to cancel.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the order cancellation result or an error message.
     */
    async submitCancelOrder(_orderId){
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.submitCancelOrder -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await wmSubmitCancelOrder(this.instance, _orderId);
    }

    /**
     * Submits a close order for the authenticated user on Paradex.
     * Authenticates the user, sets the authorization header, and calls the function to submit a close order with the specified parameters.
     *
     * @async
     * @method submitCloseOrder
     * @param {string} _type - The type of the close order (e.g., 'limit', 'market').
     * @param {string} _symbol - The symbol of the asset to close (e.g., 'BTCUSD').
     * @param {string} _marketUnit - The unit of the market (e.g., 'ETH', 'USD').
     * @param {number|string} _orderQty - The quantity to close.
     * @param {boolean} _closeAll - Whether to close the entire position (true) or a partial amount (false).
     * @returns {Promise<Object>} A Promise that resolves with the response containing the close order submission result or an error message.
     */
    async submitCloseOrder(_type, _symbol, _orderQty, _marketUnit, _closeAll){
        const response = await amAuthenticateUser(this.instance, this.chainId, this.account);
        if (!response.success) {
            return createResponse(false, response.message, response.data, `paradex.submitCloseOrder -- ${response.source}`);
        }
        clearParadexHeaders(this.instance);
        this.instance.defaults.headers['Authorization'] = `Bearer ${response.data.jwt_token}`;
        return await wmSubmitCloseOrder(this.instance, this.chainId, this.account, _type, _symbol, _orderQty, _marketUnit, _closeAll);
    }

}