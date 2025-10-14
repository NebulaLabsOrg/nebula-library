import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInstance } from '../../../../../utils/index.js';
import { extendedEnum } from './enum.js';
import { MAINNET_API_URL, TESTNET_API_URL } from './constant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { extendedEnum };

/**
 * @class Extended
 * @description A class for interacting with the Extended DEX. 
 * Provides methods for onboarding, authenticating, trading, and retrieving account and market information using the internal x10-python-trading-starknet SDK.
 * Trade detail: limit orders have post-only and market orders use slippage protection. Close orders use reduce-only.
 */
export class Extended {
    /**
     * @constructor
     * @param {string} _apiKey - The API key used to authenticate requests to the Extended exchange.
     * @param {string} _starkKeyPrv - The user's private Stark key for signing transactions.
     * @param {string} _starkKeyPub - The user's public Stark key for identification.
     * @param {number} _vaultNr - The vault number associated with the user's account.
     * @param {number} [_slippage=0.1] - Maximum allowed slippage for trades, as a decimal (e.g., 0.1 for 10%).
     * @param {Object} [_throttler={ enqueue: fn => fn() }] - Throttler object to manage and queue API requests.
     * @param {string} [_environment="mainnet"] - Environment: "testnet" or "mainnet"
     */
    constructor(_apiKey, _starkKeyPrv, _starkKeyPub, _vaultNr, _slippage = 0.1, _throttler = { enqueue: fn => fn() }, _environment = "mainnet") {
        this.account = {
            starkKeyPrv: _starkKeyPrv,
            starkKeyPub: _starkKeyPub,
            vaultNr: _vaultNr
        }
        this.instance = createInstance(_environment === "mainnet" ? MAINNET_API_URL : TESTNET_API_URL, { 'X-Api-Key': _apiKey });
        this.apiKey = _apiKey;
        this.slippage = _slippage;
        this.throttler = _throttler;
        this.environment = _environment;
        
        // Path to the Python service
        this.pythonPath = 'python3.11';
        this.scriptPath = path.join(__dirname, '../python-service/extended_trading_service.py');

        // Initializes the Python service with all configured parameters
        this.pythonService = this._initializePythonService();
    }

    /**
     * Initializes the Python service with all configured parameters
     * @private
     */
    _initializePythonService() {
        return {
            apiKey: this.apiKey,
            privateKey: this.account.starkKeyPrv,
            publicKey: this.account.starkKeyPub,
            vault: parseInt(this.account.vaultNr),
            environment: this.environment,
            pythonPath: this.pythonPath,
            scriptPath: this.scriptPath,
            call: this._callPythonService.bind(this)
        };
    }

    /**
     * Calls the Python service with a specific command
     * @private
     */
    async _callPythonService(command, additionalArgs = {}) {
        return new Promise((resolve, reject) => {
            const args = {
                api_key: this.apiKey,
                private_key: this.account.starkKeyPrv,
                public_key: this.account.starkKeyPub,
                vault: parseInt(this.account.vaultNr),
                environment: this.environment,
                ...additionalArgs
            };

            const pythonProcess = spawn(this.pythonPath, [
                this.scriptPath,
                command,
                JSON.stringify(args)
            ]);

            let result = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                result += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python service failed: ${error}`));
                } else {
                    try {
                        const parsedResult = JSON.parse(result.trim());
                        if (parsedResult.error) {
                            reject(new Error(parsedResult.error));
                        } else {
                            resolve(parsedResult);
                        }
                    } catch (parseError) {
                        reject(new Error(`Failed to parse Python output: ${result}`));
                    }
                }
            });
        });
    }

    /**
     * @async
     * @method checkPythonService
     * @description Verifies the connection and parameters with the underlying Python service.
     * @returns {Promise<Object>} A Promise that resolves with the test result or an error response.
     */
    async checkPythonService() {
        try {
            const testResult = await this._callPythonService('test_params', {
                test_param: 'verification_test',
                timestamp: new Date().toISOString()
            });
            return testResult;
        }
        catch (error) {
            throw new Error(`Error calling Python service: ${error.message}`);
        }
    }

    /**
     * @async
     * @method getWalletStatus
     * @description Ottiene informazioni account usando view model aggiornato
     * @returns {Promise<Object>} A Promise that resolves with the user's account information or an error response.
     */
    async getWalletStatus() {
        const { vmGetWalletStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWalletStatus(this._callPythonService.bind(this)));
    }

    /**
     * @async
     * @method getWalletBalance
     * @description Retrieves the wallet balance using view model aggiornato
     * @returns {Promise<Object>} A promise that resolves to the wallet balance object.
     */
    async getWalletBalance() {
        const { vmGetWalletBalance } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWalletBalance(this.pythonService));
    }

    /**
     * Retrieves market data for a specific symbol using view model aggiornato
     * 
     * @async
     * @method getMarketData
     * @param {string} _symbol - The symbol of the market to retrieve data for.
     * @description Retrieves market data for a specific symbol using view model aggiornato
     * @returns {Promise<Object>} A Promise that resolves with the response containing the market data or an error message.
     */
    async getMarketData(_symbol) {
        const { vmGetMarketData } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetMarketData(this.pythonService, _symbol));
    }

    /**
     * @async
     * @method getFundingRateHour
     * @param {string} _symbol - The symbol of the market to retrieve the funding rate for.
     * @description Retrieves market hourly funding rate
     * @returns {Promise<Object>} A Promise that resolves with the funding rate data for the specified symbol.
     */
    async getFundingRateHour(_symbol) {
        const { vmGetFundingRateHour } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetFundingRateHour(this.pythonService, _symbol));
    }

    /**
     * @async
     * @method getMarketOpenInterest
     * @param {string} _symbol - The symbol of the market to retrieve the open interest for.
     * @description Retrieves market open interest
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open interest data or an error message.
     */
    async getMarketOpenInterest(_symbol) {
        const { vmGetMarketOpenInterest } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetMarketOpenInterest(this.pythonService, _symbol));
    }

    /**
     * @async
     * @method getOpenPositions
     * @description Retrieves the open positions
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open positions data or an error message.
     */
    async getOpenPositions() {
        const { vmGetOpenPositions } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOpenPositions(this.pythonService));
    }

    /**
     * @async
     * @method getOpenPositionDetail
     * @param {string} _symbol - The symbol of the position to retrieve the status for.
     * @description Retrieves specific position details
     * @returns {Promise<Object>} A Promise that resolves with the response containing the position status data or an error message.
     */
    async getOpenPositionDetail(_symbol) {
        const { vmGetOpenPositionDetail } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOpenPositionDetail(this.pythonService, _symbol));
    }

    /**
     * @async
     * @method getOrderStatus
     * @description Retrieves orders using view model aggiornato
     * @param {string} _orderId - The ID of the order to retrieve the status for (optional - gets all orders if not provided).
     * @returns {Promise<Object>} A Promise that resolves with the response containing the order status data or an error message.
     */
    async getOrderStatus(_orderId) {
        const { vmGetOrderStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOrderStatus(this.instance, _orderId));
    }

    /**
     * @async
     * @method getEarnedPoints
     * @description Retrieves account point earned
     * @returns {Promise<Object>} A Promise that resolves with the response containing account data.
     */
    async getEarnedPoints() {
        const { vmGetEarnedPoints } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetEarnedPoints(this.instance));
    }

    /**
     * @async
     * @method submitOrder
     * @description Submits a new order using write model aggiornato (usa Python SDK internamente)
     * @param {string} _type - The type of the order (e.g., 'limit', 'market').
     * @param {string} _symbol - The trading symbol for the order (e.g., 'BTCUSD').
     * @param {string} _side - The side of the order ('buy' or 'sell').
     * @param {string} _marketUnit - The market unit for the order (e.g., 'contracts', 'coins').
     * @param {number} _orderQty - The quantity for the order.
     * @returns {Promise<Object>} A Promise that resolves with the result of the order submission.
     */
    async submitOrder(_type, _symbol, _side, _marketUnit, _orderQty) {
        const { wmSubmitOrder } = await import('./write.model.js');
        return await this.throttler.enqueue(() => wmSubmitOrder(
            this.pythonService,
            this.slippage,
            _type,
            _symbol,
            _side,
            _marketUnit,
            _orderQty
        ));
    }

    /**
     * @async
     * @method submitCancelOrder
     * @description Cancels an existing order using the updated write model (internally uses the Python SDK).
     * @param {string} _externalId - The external ID of the order to cancel.
     * @returns {Promise<Object>} A Promise that resolves with the result of the order cancellation.
     */
    async submitCancelOrder(_externalId) {
        const { wmSubmitCancelOrder } = await import('./write.model.js');
        return this.throttler.enqueue(() => wmSubmitCancelOrder(this.pythonService, _externalId));
    }

    /**
     * @async
     * @method submitCloseOrder
     * @description Submits a close order to the trading system with the specified parameters.
     * @param {string} _type - The type of the close order (e.g., 'limit', 'market').
     * @param {string} _symbol - The trading symbol for the close order (e.g., 'BTC-USD').
     * @param {string} _marketUnit - The market unit for the close order (e.g., 'contracts', 'coins').
     * @param {number} _orderQty - The quantity to close.
     * @param {boolean} [_closeAll=false] - Whether to close all positions for the given symbol.
     * @returns {Promise<Object>} A Promise that resolves with the result of the close order submission.
     */
    async submitCloseOrder(_type, _symbol, _orderQty, _marketUnit, _closeAll = false) {
        const { wmSubmitCloseOrder } = await import('./write.model.js');
        return this.throttler.enqueue(() => wmSubmitCloseOrder(
            this.pythonService,
            this.slippage,
            _type,
            _symbol,
            _orderQty,
            _marketUnit,
            _closeAll
        ));
    }
}