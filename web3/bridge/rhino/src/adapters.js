import { ethers } from 'ethers';
import { getEvmChainAdapterFromPrivateKey } from '@rhino.fi/sdk/adapters/evm';
import { getParadexChainAdapterFromAccount } from '@rhino.fi/sdk/adapters/paradex';
import { getStarknetChainAdapterFromPrivateKey } from '@rhino.fi/sdk/adapters/starknet'
import { Account, Config, ParaclearProvider, Signer } from '@paradex/sdk';
import { ChainType } from './chainType.enum.js';

/**
 * Returns the appropriate chain adapter based on the source chain type.
 * - For EVM chains, creates an EVM adapter using the private key.
 * - For Paradex, creates an account from the private key and RPC provider, then returns a Paradex adapter.
 * - For Starknet, creates a Starknet adapter using the private key and address.
 * @param {string} _fromChainType - Source chain type.
 * @param {string} _fromRpc - RPC endpoint for the source chain.
 * @param {string} _fromAddress - Address for Starknet.
 * @param {string} _fromPrvKey - Private key for the account.
 * @param {object} _chainConfig - Configuration object for the chain.
 * @returns {Promise<object>} Chain adapter instance.
 * @throws {Error} If the chain type is not supported.
 */
export async function chainAdapter(_fromChainType, _fromRpc, _fromAddress, _fromPrvKey, _chainConfig) {
    if (_fromChainType === ChainType.EVM) {
        return getEvmChainAdapterFromPrivateKey(_fromPrvKey, _chainConfig);
    }
    if (_fromChainType === ChainType.PARADEX) {
        const provider = new ethers.JsonRpcProvider(_fromRpc);
        const ethersSigner = new ethers.Wallet(_fromPrvKey, provider);
        const config = await Config.fetchConfig('prod');

        const paradexAccount = await Account.fromEthSigner({
            provider: new ParaclearProvider.DefaultProvider(config),
            config,
            signer: Signer.ethersSignerAdapter(ethersSigner)
        });

        return getParadexChainAdapterFromAccount(paradexAccount, _chainConfig);
    }
    if (_fromChainType === ChainType.STARKNET) {
        return getStarknetChainAdapterFromPrivateKey({privateKey: _fromPrvKey, address: _fromAddress, chainConfig: _chainConfig});
    }
    throw new Error('Chain type not supported');
}
