import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { extendedEnum } from './enum.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export { extendedEnum };

/**
 * @class Extended
 * @description Extended DEX client che usa internamente l'SDK Python x10-python-trading-starknet
 * Mantiene la stessa API pubblica ma usa il servizio Python per tutte le operazioni crittografiche e di trading.
 * NESSUNA FIRMA MANUALE - TUTTO AUTOMATICO CON SDK PYTHON!
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
        this.apiKey = _apiKey;
        this.slippage = _slippage;
        this.throttler = _throttler;
        this.environment = _environment;
        
        // Path al servizio Python
        this.pythonPath = 'python3.11';
        this.scriptPath = path.join(__dirname, '../python-service/extended_trading_service.py');
        
        // Inizializza il servizio Python con tutti i parametri
        this.pythonService = this._initializePythonService();
    }

    /**
     * Inizializza il servizio Python con tutti i parametri configurati
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
            // Metodo per chiamare il servizio
            call: this._callPythonService.bind(this)
        };
    }

    /**
     * Chiama il servizio Python con comando specifico
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
        // Importa dinamicamente per evitare problemi circolari
        const { vmGetWalletStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWalletStatus(this._callPythonService.bind(this)));
    }

    /**
     * Retrieves the wallet balance using view model aggiornato
     *
     * @async
     * @method getWalletBalance
     * @returns {Promise<Object>} A promise that resolves to the wallet balance object.
     */
    async getWalletBalance() {
        // Importa dinamicamente per evitare problemi circolari
        const { vmGetWalletBalance } = await import('./view.model.js');
        // Passa il servizio Python inizializzato invece di callPythonService
        return this.throttler.enqueue(() => vmGetWalletBalance(this.pythonService));
    }

    /**
     * Retrieves market data for a specific symbol using view model aggiornato
     * 
     * @async
     * @method getMarketData
     * @param {string} _symbol - The symbol of the market to retrieve data for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the market data or an error message.
     */
    async getMarketData(_symbol) {
        const { vmGetMarketData } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetMarketData(this._callPythonService.bind(this), _symbol));
    }

    /**
     * Retrieves the latest market data for a specific symbol using view model aggiornato
     *
     * @async
     * @method getLatestMarketData
     * @param {string} _symbol - The symbol of the market to retrieve the latest data for.
     * @returns {Promise<Object>} A Promise that resolves with the latest market data or an error message.
     */
    async getLatestMarketData(_symbol) {
        const { vmGetLatestMarketData } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetLatestMarketData(this._callPythonService.bind(this), _symbol));
    }

    /**
     * Retrieves all markets using view model aggiornato
     *
     * @async
     * @method getMarketOrderSize
     * @param {string} _symbol - The symbol of the market to query.
     * @returns {Promise<*>} A Promise that resolves to the markets list.
     */
    async getMarketOrderSize(_symbol) {
        const { vmGetMarketOrderSize } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetMarketOrderSize(this._callPythonService.bind(this), _symbol));
    }

    /**
     * Retrieves market data for funding rate using view model aggiornato
     *
     * @async
     * @method getFundingRateHour
     * @param {string} _symbol - The symbol of the market to retrieve the funding rate for.
     * @returns {Promise<Object>} A Promise that resolves with the funding rate data for the specified symbol.
     */
    async getFundingRateHour(_symbol) {
        const { vmGetFundingRateHour } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetFundingRateHour(this._callPythonService.bind(this), _symbol));
    }

    /**
     * Retrieves market data for open interest using view model aggiornato
     * 
     * @async
     * @method getMarketOpenInterest
     * @param {string} _symbol - The symbol of the market to retrieve the open interest for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open interest data or an error message.
     */
    async getMarketOpenInterest(_symbol) {
        const { vmGetMarketOpenInterest } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetMarketOpenInterest(this._callPythonService.bind(this), _symbol));
    }

    /**
     * Retrieves the open positions using view model aggiornato
     * 
     * @async
     * @method getOpenPositions
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open positions data or an error message.
     */
    async getOpenPositions() {
        const { vmGetOpenPositions } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOpenPositions(this._callPythonService.bind(this)));
    }

    /**
     * Retrieves specific position details using view model aggiornato
     *
     * @async
     * @method getOpenPositionDetail
     * @param {string} _symbol - The symbol of the position to retrieve the status for.
     * @returns {Promise<Object>} A Promise that resolves with the response containing the position status data or an error message.
     */
    async getOpenPositionDetail(_symbol) {
        const { vmGetOpenPositionDetail } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOpenPositionDetail(this._callPythonService.bind(this), _symbol), 2);
    }

    /**
     * Retrieves orders using view model aggiornato
     * 
     * @async
     * @method getOrderStatus
     * @param {string} _orderId - The ID of the order to retrieve the status for (optional - gets all orders if not provided).
     * @returns {Promise<Object>} A Promise that resolves with the response containing the order status data or an error message.
     */
    async getOrderStatus(_orderId) {
        const { vmGetOrderStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOrderStatus(this._callPythonService.bind(this), _orderId));
    }

    /**
     * Retrieves account info using view model aggiornato
     *
     * @async
     * @method getEarnedPoints
     * @returns {Promise<Object>} A Promise that resolves with the response containing account data.
     */
    async getEarnedPoints() {
        const { vmGetEarnedPoints } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetEarnedPoints(this._callPythonService.bind(this)));
    }

    /**
     * Submits a new order using write model aggiornato (usa Python SDK internamente)
     *
     * @async
     * @method submitOrder
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
            this, // passa l'istanza Extended con Python service
            this.slippage,
            this.account,
            _type,
            _symbol,
            _side,
            _marketUnit,
            _orderQty
        ), 5);
    }

    /**
     * Cancella un ordine esistente utilizzando write model aggiornato (usa Python SDK internamente)
     *
     * @async
     * @method submitCancelOrder
     * @param {string} _orderId - L'ID dell'ordine da cancellare.
     * @returns {Promise<Object>} Una Promise che si risolve con il risultato della cancellazione dell'ordine.
     */
    async submitCancelOrder(_orderId) {
        const { wmSubmitCancelOrder } = await import('./write.model.js');
        return this.throttler.enqueue(() => wmSubmitCancelOrder(this, _orderId));
    }

    /**
     * Submits a close order to the trading system with the specified parameters.
     * Uses a throttler to control the rate of close order submissions and invokes the underlying close order function.
     *
     * @async
     * @method submitCloseOrder
     * @param {string} _type - The type of the close order (e.g., 'limit', 'market').
     * @param {string} _symbol - The trading symbol for the close order (e.g., 'BTCUSD').
     * @param {number} _orderQty - The quantity to close.
     * @param {string} _marketUnit - The market unit for the close order (e.g., 'contracts', 'coins').
     * @param {boolean} [_closeAll=false] - Whether to close all positions for the given symbol.
     * @returns {Promise<Object>} A Promise that resolves with the result of the close order submission.
     */
    async submitCloseOrder(_type, _symbol, _orderQty, _marketUnit, _closeAll = false) {
        const { wmSubmitCloseOrder } = await import('./write.model.js');
        return this.throttler.enqueue(() => wmSubmitCloseOrder(
            this, // passa l'istanza Extended con Python service
            this.slippage,
            this.account,
            _type,
            _symbol,
            _orderQty,
            _marketUnit,
            _closeAll
        ), 6);
    }
}