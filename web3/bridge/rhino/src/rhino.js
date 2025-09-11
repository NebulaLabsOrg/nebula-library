import { RhinoSdk } from '@rhino.fi/sdk';
import { ethers } from 'ethers';
import { getEvmChainAdapterFromPrivateKey } from '@rhino.fi/sdk/adapters/evm';
import { getParadexChainAdapterFromAccount } from '@rhino.fi/sdk/adapters/paradex';
import { Account, Config, ParaclearProvider, Signer } from '@paradex/sdk';
import { createResponse } from '../../../../utils/src/response.utils.js';
import { ChainType } from './chainType.enum.js';

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
    * @param {object|null} [_rpcProvider=null] - (Optional) The RPC provider for blockchain interaction only for PARADEX.
    */
    constructor(_apiKey, _prvKey, _fromChainType, _mode = 'pay', _rpcProvider = null) {
        this.privateKey = _prvKey; // For Both EVM and Paradex is enough the Evm Private Key
        this.fromChainType = _fromChainType;
        this.mode = _mode;
        this.rpcProvider = _rpcProvider;
        this.rhinoSdk = RhinoSdk({
            apiKey: _apiKey,
        });
    }
    /**
     * @async
     * @method #manageChainAdapter
     * @description Returns the appropriate chain adapter based on the source chain type.
     * For EVM chains, it uses the private key to create an EVM adapter.
     * For Paradex, it creates an account using the private key and RPC provider, then returns a Paradex adapter.
     * @param {object} _chainConfig - The configuration object for the target chain.
     * @returns {Promise<object>} A Promise that resolves with the chain adapter instance.
     * @throws {Error} If the chain type is not supported.
     */
    async #manageChainAdapter(_chainConfig) {
        if (this.fromChainType === ChainType.EVM) {
            return getEvmChainAdapterFromPrivateKey(this.privateKey, _chainConfig);
        }
        if (this.fromChainType === ChainType.PARADEX) {
            const provider = new ethers.JsonRpcProvider(this.rpcProvider);
            const ethersSigner = new ethers.Wallet(this.privateKey, provider);
            const config = await Config.fetchConfig('prod');

            const paradexAccount = await Account.fromEthSigner({
                provider: new ParaclearProvider.DefaultProvider(config),
                config,
                signer: Signer.ethersSignerAdapter(ethersSigner)
            });

            return getParadexChainAdapterFromAccount(paradexAccount, _chainConfig);
        }
        throw new Error('Chain type not supported');
    }

    /**
     * @async
     * @method bridge
     * @description Bridges assets between chains using the Rhino SDK.
     * Initiates a bridge transaction with the provided parameters, supports fee limits, and logs status updates if requested.
     * @param {string|number|BigNumber} _amount - The amount of the asset to bridge (e.g., 1 USDC).
     * @param {string} _token - The address or symbol of the token to bridge.
     * @param {string} _chainIn - The source chain identifier.
     * @param {string} _chainOut - The destination chain identifier.
     * @param {string} _depositor - The address initiating the bridge.
     * @param {string} _recipient - The address receiving the bridged asset.
     * @param {number} [_maxFeeUSD=0] - Maximum allowed fee in USD (optional).
     * @param {boolean} _logStatusChange - Whether to log bridge status changes.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the bridge result or error.
     */
    async bridge(_amount, _token, _chainIn, _chainOut, _depositor, _recipient, _maxFeeUSD = 0, _logStatusChange) {
        try {
            const bridgeResult = await this.rhinoSdk.bridge({
                type: 'bridge',
                amount: _amount,
                token: _token,
                chainIn: _chainIn,
                chainOut: _chainOut,
                depositor: _depositor,
                recipient: _recipient,
                mode: this.mode,
            }, {
                //Callbacks
                getChainAdapter: async chainConfig => await this.#manageChainAdapter(chainConfig),
                hooks: {
                    checkQuote: quote => {
                        if (_maxFeeUSD === 0) return Promise.resolve(true);
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