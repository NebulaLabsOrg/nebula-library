import { RhinoSdk } from '@rhino.fi/sdk';
import { ethers } from 'ethers';
import { getEvmChainAdapterFromPrivateKey } from '@rhino.fi/sdk/adapters/evm';
import { getParadexChainAdapterFromAccount } from '@rhino.fi/sdk/adapters/paradex';
import { Account, Config, ParaclearProvider, Signer } from '@paradex/sdk';
import { createResponse } from '../../../../utils/src/response.utils.js';
import { ChainType } from './chainType.enum.js';

export class Rhino {
    constructor(_apiKey, _prvKey, _fromChainType, _maxFeeUSD, _mode = 'pay', _rpcProvider = null) {
        this.privateKey = _prvKey; // For Both EVM and Paradex is enough the Evm Private Key
        this.fromChainType = _fromChainType;
        this.maxFeeUSD = _maxFeeUSD;
        this.mode = _mode;
        this.rpcProvider = _rpcProvider;
        this.rhinoSdk = RhinoSdk({
            apiKey: _apiKey,
        });
    }

    
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


    async bridge(_amount, _token, _chainIn, _chainOut, _depositor, _recipient, _logStatusChange) {
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
                getChainAdapter: async chainConfig => await this.#manageChainAdapter(chainConfig),
                hooks: {
                    checkQuote: quote => Promise.resolve(quote.fees.feeUsd < this.maxFeeUSD),
                    onBridgeStatusChange: status => {
                        if (_logStatusChange) console.log('--> Rhino bridge status changed: ', status);
                    },
                },
            });

            
            if (bridgeResult.data) {
                return createResponse(true, 'success', bridgeResult.data, 'rhino.bridge');
            } else {
                return createResponse(false,  bridgeResult.error, null, 'rhino.bridge');
            }
        } catch (error) {
            const message = error.message || 'Failed to bridge';
            return createResponse(false, message, null, 'rhino.bridge');
        }
    }
}