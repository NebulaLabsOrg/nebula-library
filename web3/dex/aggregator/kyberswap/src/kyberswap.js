import { ethers } from 'ethers';
import { getKyberChainName } from './utils.js';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { createInstance, encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { signAndSendTx, getTxGasOptions } from '../../../../../utils/src/tx.utils.js';
import { calculateGasPrice, estimateTxGasLimit } from '../../../../../utils/src/gas.utils.js';
import { resolveSigner } from '../../../../../utils/src/ethers.utils.js';

/**
 * @class kyberswap
 * @description A class for interacting with the Kyberswap decentralized exchange aggregator. 
 * Provides methods for querying token swap routes and executing token swaps on supported blockchains.
 */
export class kyberswap {
    /**
    * @constructor
    * @param {string|object} _signerOrKey - The private key or signer object for signing transactions.
    * @param {number} _chainId - The chain ID of the blockchain to interact with.
    * @param {string} _sourceName - The source name or client identifier for API requests.
    * @param {object|null} _rpcProvider - (Optional) The RPC provider for blockchain interaction. Defaults to the provider from the signer if not provided.
    * @param {number} _numberConfirmation - (Optional) The number of confirmations to wait for transactions. Defaults to 1.
    * @param {boolean} _EIP1559 - (Optional) Whether to use EIP-1559 transaction format. Defaults to true.
    * 
    */
    constructor(_signerOrKey, _chainId, _sourceName, _rpcProvider = null, _numberConfirmation = 1, _EIP1559 = true) {
        this.chainName = getKyberChainName(_chainId);
        if (!this.chainName) {
            throw new Error(`Chain name not available on Kyberswap for chainId: ${_chainId}`);
        }
        this.signer = resolveSigner(_signerOrKey, _rpcProvider);
        this.rpcProvider = _rpcProvider || (this.signer.provider ? this.signer.provider.connection.url : null);
        this.sourceName = _sourceName;
        this.numberConfirmation = _numberConfirmation;
        this.EIP1559 = _EIP1559;
        this.instance = createInstance(
            'https://aggregator-api.kyberswap.com',
            {
                headers: {
                    "x-client-id": this.sourceName,
                }
            }
        );
    }
    /**
     * @async
     * @method getRoute
     * @description Retrieves the optimal token swap route from Kyberswap.
     * @param {string} _tokenIn - The address of the input ERC20 token contract.
     * @param {string|number|BigNumber} _amountIn - The amount of the input token to swap.
     * @param {string} _tokenOut - The address of the output ERC20 token contract.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the route summary, router address, and request ID.
     */
    async getRoute(_tokenIn, _amountIn, _tokenOut) {
        try {
            const params = {
                tokenIn: _tokenIn,
                amountIn: _amountIn.toString(),
                tokenOut: _tokenOut,
                saveGas: true,
                source: this.sourceName
            };
            const url = encodeGetUrl(`/${this.chainName}/api/v1/routes`, params);
            const { data } = await this.instance.get(url);

            if (data.code !== 0) {
                return createResponse(false, data.message || 'Failed to get route', null, 'kyberswap.getRoute');
            }

            const { routeSummary, routerAddress } = data.data;
            return createResponse(true, 'success', { routeSummary, routerAddress, requestId: data.requestId }, 'kyberswap.getRoute');
        } catch (error) {
            return createResponse(false, error.message || 'Failed to get route', null, 'kyberswap.getRoute');
        }
    }
    /**
     * @async
     * @method swap
     * @description Executes a token swap on Kyberswap using the provided route data and parameters.
     * @param {string} _tokenIn - The address of the input ERC20 token contract.
     * @param {string|number|BigNumber} _amountIn - The amount of the input token to swap.
     * @param {string} _tokenOut - The address of the output ERC20 token contract.
     * @param {number} _slippage - The maximum acceptable slippage percentage for the swap.
     * @param {object} _routeData - The route data obtained from the getRoute method.
     * @param {string} [_recipient] - (Optional) The address of the recipient. Defaults to the signer's address if not provided.
     * @param {number} [_gasPriceIncreasePercent] - (Optional) The percentage to increase the gas price by. Defaults to 0.
     * @param {string} [_gasPrice] - (Optional) The custom gas price to use, in gwei. If not provided, it will be calculated dynamically.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the transaction hash if successful.
     */
    async swap(_tokenIn, _amountIn, _tokenOut, _slippage, _routeData, _recipient = undefined, _gasPriceIncreasePercent = 0, _gasPrice = undefined) {
        try {
            const params = {
                routeSummary: _routeData.routeSummary,
                slippageTolerance: _slippage * 100, // Convert slippage to percentage
                sender: this.signer.address,
                recipient: _recipient || this.signer.address,
                source: this.sourceName
            };

            const { data: responseData } = await this.instance.post(`/${this.chainName}/api/v1/route/build`, params);

            if (responseData.code !== 0) {
                return createResponse(false, responseData.message || 'Failed to swap', null, 'kyberswap.swap');
            }

            const gasPrice = _gasPrice 
                ? ethers.parseUnits(_gasPrice, 'gwei') 
                : await calculateGasPrice(this.rpcProvider, _gasPriceIncreasePercent, this.EIP1559);

            if (!gasPrice.success && !_gasPrice) {
                return createResponse(
                    false,
                    gasPrice.message,
                    gasPrice.data,
                    `kyberswap.swap -- ${gasPrice.source}`
                );
            }

            const txParams = {
                from: this.signer.address,
                to: responseData.data.routerAddress,
                data: responseData.data.data,
            };

            const gasLimitResult = await estimateTxGasLimit(this.rpcProvider, txParams);

            if (!gasLimitResult.success) {
                return createResponse(false, gasLimitResult.message, gasLimitResult.data, `kyberswap.swap -- ${gasLimitResult.source}`);
            }

            const txGasParams = getTxGasOptions(this.EIP1559, gasLimitResult, gasPrice);
            const txResponse = await signAndSendTx(this.signer, { ...txParams, ...txGasParams }, this.numberConfirmation);

            if (!txResponse.success) {
                return createResponse(false, txResponse.message, txResponse.data, `kyberswap.swap -- ${txResponse.source}`);
            }

            return createResponse(true, 'success', { txHash: txResponse.data.txHash }, 'kyberswap.swap');
        } catch (error) {
            return createResponse(false, error.message || 'Failed to swap', null, 'kyberswap.swap');
        }
    }
}