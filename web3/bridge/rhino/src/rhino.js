import { RhinoSdk } from '@rhino.fi/sdk';
import { chainAdapter } from './adapters.js';
import { createResponse } from '../../../../utils/src/response.utils.js';
/**
 * @class Rhino
 * @description A class for interacting with the Rhino bridge SDK.
 * Provides methods for bridging assets between supported chains using EVM and Paradex adapters.
 */
export class Rhino {
    /**
    * @constructor
    * @param {string} _apiKey - The API key for Rhino SDK.
    * @param {string} _prvKey - The private key for signing transactions.
    * @param {string} _fromChainType - The type of the source chain (EVM or PARADEX).
    * @param {string} [_mode='pay'] - The bridge mode.
    * @param {number} [_timeoutMin=10] - (Optional) Timeout in minutes for the bridge operation.
    */
    constructor(_apiKey, _prvKey, _fromChainType, _mode = 'pay', _timeoutMin = 10) {
        this.privateKey = _prvKey; // For Both EVM and Paradex is enough the Evm Private Key
        this.fromChainType = _fromChainType;
        this.mode = _mode;
        this.timeoutSeconds = _timeoutMin * 60;
        this.rhinoSdk = RhinoSdk({
            apiKey: _apiKey,
        });
    }

    /**
     * @async
     * @method bridge
     * @description Initiates a bridge transaction using the Rhino SDK to transfer assets between chains.
     * Supports fee limits and optional logging of bridge status updates. Returns a standardized response object.
     * @param {string} _amount - Amount of the asset to bridge (e.g., 1 USDC).
     * @param {string} _token - Address or symbol of the token to bridge.
     * @param {string} _fromChain - Source chain identifier.
     * @param {string} _toChain - Destination chain identifier.
     * @param {string} _fromAddress - Address initiating the bridge.
     * @param {string} _toAddress - Address receiving the bridged asset.
     * @param {string} [_maxFeeUSD='0'] - Maximum allowed fee in USD (optional).
     * @param {boolean} _logStatusChange - Whether to log bridge status changes.
     * @returns {Promise<Object>} Resolves with a response object containing the bridge result or error.
     */
    async bridge(_amount, _token, _fromChain, _toChain, _fromAddress, _toAddress, _maxFeeUSD = '0', _logStatusChange) {
        try {
            const bridgeResult = await this.rhinoSdk.bridge({
                type: 'bridge',
                amount: _amount,
                token: _token,
                chainIn: _fromChain,
                chainOut: _toChain,
                depositor: _fromAddress,
                recipient: _toAddress,
                mode: this.mode,
            }, {
                //Callbacks
                timeoutSeconds: this.timeoutSeconds,
                getChainAdapter: async chainConfig => await chainAdapter(this.fromChainType, _fromAddress, this.privateKey, chainConfig),
                hooks: {
                    checkQuote: quote => {
                        if (_maxFeeUSD === '0') return Promise.resolve(true);
                        return Promise.resolve(quote.fees.feeUsd < _maxFeeUSD);
                    },
                    onBridgeStatusChange: status => {
                        if (_logStatusChange) console.log('--> Rhino bridge status changed: ', status);
                    },
                },
            });


            if (bridgeResult.data) {
                return createResponse(true, 'success', bridgeResult.data, 'rhino.bridge');
            } else {
                return createResponse(false, bridgeResult.error, null, 'rhino.bridge');
            }
        } catch (error) {
            const message = error.message || 'Failed to bridge';
            return createResponse(false, message, null, 'rhino.bridge');
        }
    }
}