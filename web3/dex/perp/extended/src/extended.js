// Dynamic imports - only loaded if Python is enabled
let spawn = null;
let execSync = null;
let path = null;
let __dirname = null;

import { createInstance } from '../../../../../utils/src/http.utils.js';
import { extendedEnum } from './enum.js';
import { MAINNET_API_URL, TESTNET_API_URL } from './constant.js';

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
     * @param {Object|string} config - Configuration object or API key (legacy)
     * @param {string} config.apiKey - The API key used to authenticate requests
     * @param {string} config.privateKey - The user's private Stark key for signing transactions
     * @param {string} config.publicKey - The user's public Stark key for identification
     * @param {number} config.vault - The vault number associated with the user's account
     * @param {number} [config.slippage=0.1] - Maximum allowed slippage for trades
     * @param {Object} [config.throttler={ enqueue: fn => fn() }] - Throttler object to manage API requests
     * @param {string} [config.environment="mainnet"] - Environment: "testnet" or "mainnet"
     * @param {boolean} [config.usePython=true] - Enable/disable Python service (set to false for serverless environments like Gelato)
     */
    constructor(config, _starkKeyPrv, _starkKeyPub, _vaultNr, _slippage = 0.1, _throttler = { enqueue: fn => fn() }, _environment = "mainnet") {
        // Support both new object-based config and legacy parameters
        let apiKey, privateKey, publicKey, vault, slippage, throttler, environment, usePython;
        
        if (typeof config === 'object' && !_starkKeyPrv) {
            // New object-based configuration
            apiKey = config.apiKey;
            privateKey = config.privateKey;
            publicKey = config.publicKey;
            vault = config.vault;
            slippage = config.slippage ?? 0.1;
            throttler = config.throttler ?? { enqueue: fn => fn() };
            environment = config.environment ?? "mainnet";
            usePython = config.usePython ?? true;
        } else {
            // Legacy parameters (backward compatibility)
            apiKey = config;
            privateKey = _starkKeyPrv;
            publicKey = _starkKeyPub;
            vault = _vaultNr;
            slippage = _slippage;
            throttler = _throttler;
            environment = _environment;
            usePython = true; // Default to true for backward compatibility
        }
        
        this.account = {
            starkKeyPrv: privateKey,
            starkKeyPub: publicKey,
            vaultNr: vault
        }
        this.instance = createInstance(environment === "mainnet" ? MAINNET_API_URL : TESTNET_API_URL, { 'X-Api-Key': apiKey });
        this.apiKey = apiKey;
        this.slippage = slippage;
        this.throttler = throttler;
        this.environment = environment;
        this.usePython = usePython;
        
        if (this.usePython) {
            // Initialize Python properties synchronously
            this.pythonPath = 'python3';
            this.scriptPath = null; // Will be set async when needed
            this.pythonProcess = null;
            this.messageQueue = new Map();
            this.messageId = 0;
            this.isReady = false;
            this.isInitializing = false;
            this.shouldRestart = true;
            
            // Path modules will be loaded lazily when first command is sent
        } else {
            // Python disabled - set flags to prevent Python calls
            this.pythonProcess = null;
            this.isReady = false;
            console.log('Extended initialized in HTTP-only mode (Python disabled)');
        }
    }

    /**
     * Initialize Python-related paths asynchronously
     * @private
     */
    async _initPythonPaths() {
        const { path: pathModule, __dirname: dirName } = await _loadPathModules();
        
        // Set the Python script path
        this.scriptPath = pathModule.join(dirName, '../python-service/extended_trading_service.py');
    }

    /**
     * Initializes Python path asynchronously
     * @private
     */
    async _initializePythonPathAsync() {
        if (!this.usePython) return;
        
        try {
            this.pythonPath = await this._findPythonPath();
        } catch (error) {
            // Keep default python3 if initialization fails
            console.warn('Failed to initialize Python path, using default python3');
        }
    }

    /**
     * Ensures Python path is initialized (useful for testing)
     * @public
     */
    async ensurePythonPathInitialized() {
        if (this.pythonPath === 'python3') {
            await this._initializePythonPathAsync();
        }
        return this.pythonPath;
    }

    /**
     * Finds the best Python path to use (virtual environment first, then system Python)
     * @private
     */
    async _findPythonPath() {
        if (!this.usePython) return null;
        
        try {
            // Dynamic import for ES6 modules
            const fs = await import('fs');
            const { execSync: execSyncFn } = await _loadChildProcess();
            const { path: pathModule, __dirname: dirName } = await _loadPathModules();
            
            // First try virtual environment python (multiple possible locations)
            const venvPaths = [
                pathModule.join(dirName, '../venv/bin/python'),      // Created by setup.sh
                pathModule.join(dirName, '../.venv/bin/python'),     // Alternative location
                pathModule.join(process.cwd(), 'venv/bin/python'),     // Current working directory
                pathModule.join(process.cwd(), '.venv/bin/python')     // Alternative in cwd
            ];
            
            for (const venvPython of venvPaths) {
                if (fs.existsSync(venvPython)) {
                    return venvPython;
                }
            }
            
            // Fallback to system python versions (3.11-3.13 compatible with fast-stark-crypto)
            const pythonVersions = ['python3.13', 'python3.12', 'python3.11', 'python3'];
            
            for (const pythonCmd of pythonVersions) {
                try {
                    // Check if command exists by trying to get version
                    execSyncFn(`${pythonCmd} --version`, { stdio: 'ignore' });
                    return pythonCmd;
                } catch (error) {
                    // Continue to next version
                    continue;
                }
            }
            
            // Final fallback
            return 'python3';
        } catch (error) {
            // Fallback if imports fail
            return 'python3';
        }
    }

    /**
     * Starts the persistent Python process
     * @private
     */
    async _startPersistentPythonProcess() {
        if (!this.usePython || this.isInitializing || this.pythonProcess) return;
        
        this.isInitializing = true;
        this.isReady = false;

        // Ensure Python path is initialized before starting process
        if (this.pythonPath === 'python3') {
            await this._initializePythonPathAsync();
        }

        // Ensure scriptPath is initialized
        if (!this.scriptPath) {
            await this._initPythonPaths();
        }

        const { spawn: spawnFn } = await _loadChildProcess();

        const initArgs = {
            api_key: this.apiKey,
            private_key: this.account.starkKeyPrv,
            public_key: this.account.starkKeyPub,
            vault: parseInt(this.account.vaultNr),
            environment: this.environment
        };

        console.log('[Extended] Starting Python process with:', this.pythonPath);
        this.pythonProcess = spawnFn(this.pythonPath, [this.scriptPath]);

        let stdoutBuffer = '';
        
        // Handle stdout - responses from Python
        this.pythonProcess.stdout.on('data', (data) => {
            stdoutBuffer += data.toString();
            
            // Process complete JSON messages (one per line)
            const lines = stdoutBuffer.split('\n');
            stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
                if (line.trim()) {
                    this._handlePythonOutput(line.trim());
                }
            }
        });

        // Handle stderr - errors and logs
        this.pythonProcess.stderr.on('data', (data) => {
            console.error('[Python stderr]:', data.toString());
        });

        // Handle process exit
        this.pythonProcess.on('exit', (code) => {
            console.log(`Python process exited with code ${code}`);
            this.pythonProcess = null;
            this.isReady = false;
            this.isInitializing = false;
            
            // Reject all pending promises
            for (const [id, handler] of this.messageQueue.entries()) {
                clearTimeout(handler.timeout);
                handler.reject(new Error('Python process terminated'));
            }
            this.messageQueue.clear();
            
            // Auto-restart if needed
            if (this.shouldRestart && code !== 0) {
                console.log('Auto-restarting Python process...');
                setTimeout(() => this._startPersistentPythonProcess(), 1000);
            }
        });
        
        this.isInitializing = false;
    }

    /**
     * Handles output from Python process
     * @private
     */
    _handlePythonOutput(line) {
        try {
            const message = JSON.parse(line);
            
            // Handle initialization ready message
            if (message.type === 'ready') {
                // Send initialization message
                const initMessage = {
                    id: ++this.messageId,
                    type: 'init',
                    config: {
                        api_key: this.apiKey,
                        private_key: this.account.starkKeyPrv,
                        public_key: this.account.starkKeyPub,
                        vault: parseInt(this.account.vaultNr),
                        environment: this.environment
                    }
                };
                this.pythonProcess.stdin.write(JSON.stringify(initMessage) + '\n');
                return;
            }
            
            // Handle init response
            if (message.type === 'response' && message.data?.status === 'initialized') {
                this.isReady = true;
                return;
            }
            
            // Handle responses
            if (message.type === 'response' && message.id !== undefined) {
                const handler = this.messageQueue.get(message.id);
                if (handler) {
                    clearTimeout(handler.timeout);
                    this.messageQueue.delete(message.id);
                    handler.resolve(message.data);
                }
                return;
            }
            
            // Handle errors
            if (message.type === 'error') {
                if (message.id !== undefined) {
                    const handler = this.messageQueue.get(message.id);
                    if (handler) {
                        clearTimeout(handler.timeout);
                        this.messageQueue.delete(message.id);
                        handler.reject(new Error(message.data?.error || 'Unknown error'));
                    }
                } else {
                    console.error('Python error:', message.data?.error);
                }
            }
        } catch (error) {
            console.error('Failed to parse Python output:', line, error);
        }
    }

    /**
     * Sends a command to the Python process
     * @private
     */
    async _sendCommand(command, params = {}) {
        if (!this.usePython) {
            throw new Error('Python is disabled - this operation requires Python SDK');
        }
        
        // Start Python process if not already started
        if (!this.pythonProcess && !this.isInitializing) {
            await this._startPersistentPythonProcess();
        }
        
        // Wait for process to be ready
        if (!this.isReady) {
            await new Promise((resolve) => {
                const checkReady = setInterval(() => {
                    if (this.isReady) {
                        clearInterval(checkReady);
                        resolve();
                    }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    clearInterval(checkReady);
                    resolve();
                }, 10000);
            });
        }
        
        if (!this.pythonProcess || !this.isReady) {
            throw new Error('Python process not ready');
        }

        return new Promise((resolve, reject) => {
            const id = ++this.messageId;
            const message = {
                id,
                type: 'command',
                command,
                params
            };

            // Setup timeout (30 seconds)
            const timeout = setTimeout(() => {
                this.messageQueue.delete(id);
                reject(new Error(`Command '${command}' timed out after 30 seconds`));
            }, 30000);

            // Store promise handlers
            this.messageQueue.set(id, { resolve, reject, timeout });

            // Send command
            this.pythonProcess.stdin.write(JSON.stringify(message) + '\n');
        });
    }

    /**
     * Closes the Python process and cleans up resources
     * Must be called when done, especially in cron jobs
     * @public
     */
    async close() {
        if (!this.usePython) return;
        
        this.shouldRestart = false;
        
        if (this.pythonProcess) {
            try {
                // Send shutdown command with proper format
                const shutdownMessage = {
                    id: ++this.messageId,
                    type: 'shutdown'
                };
                this.pythonProcess.stdin.write(JSON.stringify(shutdownMessage) + '\n');
                
                // Wait for graceful exit
                await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        // Force kill if doesn't exit gracefully
                        if (this.pythonProcess) {
                            this.pythonProcess.kill('SIGTERM');
                        }
                        resolve();
                    }, 5000);
                    
                    if (this.pythonProcess) {
                        this.pythonProcess.once('exit', () => {
                            clearTimeout(timeout);
                            resolve();
                        });
                    } else {
                        clearTimeout(timeout);
                        resolve();
                    }
                });
            } catch (error) {
                console.error('Error closing Python process:', error);
            }
            
            this.pythonProcess = null;
        }
        
        this.isReady = false;
        this.messageQueue.clear();
    }

    /**
     * @async
     * @method checkPythonService
     * @description Verifies the connection and parameters with the underlying Python service.
     * @returns {Promise<Object>} A Promise that resolves with the test result or an error response.
     */
    async checkPythonService() {
        if (!this.usePython) {
            return { success: true, message: 'Python disabled - HTTP-only mode', sdk_available: false };
        }
        
        try {
            const testResult = await this._sendCommand('test_params', {
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
     * @description Retrieves account information using updated view model
     * @returns {Promise<Object>} A Promise that resolves with the user's account information or an error response.
     */
    async getWalletStatus() {
        const { vmGetWalletStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWalletStatus(this.instance));
    }

    /**
     * @async
     * @method getWalletBalance
     * @description Retrieves the wallet balance using view model aggiornato
     * @returns {Promise<Object>} A promise that resolves to the wallet balance object.
     */
    async getWalletBalance() {
        const { vmGetWalletBalance } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWalletBalance(this));
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
        return this.throttler.enqueue(() => vmGetMarketData(this, _symbol));
    }

    /**
     * @async
     * @method getMarketOrderSize
     * @param {string} _symbol - The symbol of the market to retrieve the order size for.
     * @description Retrieves market order size information
     * @returns {Promise<Object>} A Promise that resolves with the order size data for the specified symbol.
     */
    async getMarketOrderSize(_symbol) {
        const { vmGetMarketOrderSize } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetMarketOrderSize(this, _symbol));
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
        return this.throttler.enqueue(() => vmGetFundingRateHour(this, _symbol));
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
        return this.throttler.enqueue(() => vmGetMarketOpenInterest(this, _symbol));
    }

    /**
     * @async
     * @method getOpenPositions
     * @description Retrieves the open positions
     * @returns {Promise<Object>} A Promise that resolves with the response containing the open positions data or an error message.
     */
    async getOpenPositions() {
        const { vmGetOpenPositions } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetOpenPositions(this));
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
        return this.throttler.enqueue(() => vmGetOpenPositionDetail(this, _symbol));
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
            this,
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
        return this.throttler.enqueue(() => wmSubmitCancelOrder(this, _externalId));
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
    async submitCloseOrder(_type, _symbol, _marketUnit, _orderQty, _closeAll = false) {
        const { wmSubmitCloseOrder } = await import('./write.model.js');
        return this.throttler.enqueue(() => wmSubmitCloseOrder(
            this,
            this.slippage,
            _type,
            _symbol,
            _marketUnit,
            _orderQty,
            _closeAll
        ));
    }

    /**
     * @async
     * @method submitWithdrawal
     * @description Submits a Starknet withdrawal request to Extended exchange.
     * @param {number|string} _amount - The amount to withdraw in USDC
     * @param {string} [_starkAddress=null] - Optional Starknet recipient address. If not provided, uses account's default address
     * @returns {Promise<Object>} A Promise that resolves with the withdrawal result containing withdrawal ID and status
     */
    async submitWithdrawal(_amount, _starkAddress = null) {
        const { wmSubmitWithdrawal } = await import('./write.model.js');
        return this.throttler.enqueue(() => wmSubmitWithdrawal(
            this,
            _amount,
            _starkAddress
        ));
    }

    /**
     * @async
     * @method getWithdrawalStatus
     * @description Retrieves withdrawal status using direct API call. When provided with withdrawal ID, returns detailed info for that specific withdrawal.
     * @param {string|number} [_withdrawalId=null] - Specific withdrawal ID to check (when provided, returns only that withdrawal's status)
     * @param {number} [_limit=50] - Maximum number of records to return (only used when no withdrawal ID is specified)
     * @returns {Promise<Object>} A Promise that resolves with withdrawal status data containing transaction details
     */
    async getWithdrawalStatus(_withdrawalId = null, _limit = 50) {
        const { vmGetWithdrawalStatus } = await import('./view.model.js');
        return this.throttler.enqueue(() => vmGetWithdrawalStatus(
            this.instance,
            _withdrawalId,
            _limit
        ));
    }
}

/**
 * Load child_process module dynamically (only when Python is enabled)
 * @private
 */
async function _loadChildProcess() {
    if (!spawn) {
        const cp = await import('child_process');
        spawn = cp.spawn;
        execSync = cp.execSync;
    }
    return { spawn, execSync };
}

/**
 * Load path modules dynamically (only when Python is enabled)
 * @private
 */
async function _loadPathModules() {
    if (!path) {
        const pathModule = await import('path');
        const { fileURLToPath } = await import('url');
        path = pathModule.default;
        __dirname = pathModule.dirname(fileURLToPath(import.meta.url));
    }
    return { path, __dirname };
}