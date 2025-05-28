import { ethers } from 'ethers';
import { createResponse } from './response.utils.js';

/**
 * @async
 * @function estimateGasLimit
 * @description Estimates the gas limit required to execute a specific contract function with given parameters.
 * @param {Object} _contract - An ethers.js contract instance.
 * @param {string} _function - The name of the contract function to estimate gas for.
 * @param {Array} [_params=[]] - The parameters to pass to the contract function.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the estimated gas limit or an error message.
 */
export async function estimateGasLimit(_contract, _function, _params = []) {
    try {
        const estimation = await _contract[_function].estimateGas(..._params);
        return createResponse(
            true,
            'success',
            estimation.toString(),
            'estimateGasLimit'
        );
    } catch (error) {
        return createResponse(
            false,
            error.message || 'Failed to estimate gas',
            null,
            'estimateGasLimit'
        );
    }
}
/**
 * @async
 * @function estimateTxGasLimit
 * @description Estimates the gas limit required for a transaction using the provided RPC provider and transaction object.
 * @param {string} _rpcProvider - The RPC provider URL.
 * @param {Object} _tx - The transaction object containing at least `from`, `to`, and `data` fields.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the estimated gas limit or an error message.
 */
export async function estimateTxGasLimit(_rpcProvider, _tx) {
    try {
        const provider = new ethers.JsonRpcProvider(_rpcProvider);
        const estimation = await provider.estimateGas({ from: _tx.from, to: _tx.to, data: _tx.data });
        return createResponse(
            true,
            'success',
            estimation.toString(),
            'estimateTxGasLimit'
        );
    } catch (error) {
        return createResponse(
            false,
            error.message || 'Failed to estimate gas',
            null,
            'estimateTxGasLimit'
        );
    }
}
/**
 * @async
 * @function calculateGasPrice
 * @description Calculates the current gas price or EIP-1559 fee data from the given RPC provider, with an optional percentage increase.
 * @param {string} _rpcProvider - The RPC provider URL.
 * @param {number} [_increasePercent=0] - Optional percentage to increase the gas price or fees.
 * @param {boolean} [_EIP1559=true] - Whether to use EIP-1559 fee data (maxFeePerGas, maxPriorityFeePerGas) if available.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the gas price or EIP-1559 fee data, or an error message.
 */
export async function calculateGasPrice(_rpcProvider, _increasePercent = 0, _EIP1559 = true) {
    try {
        const provider = new ethers.JsonRpcProvider(_rpcProvider);
        const feeData = await provider.getFeeData();
        const latestBlock = await provider.getBlock('latest');
        const multiplier = 1 + _increasePercent / 100;

        if (_EIP1559 && feeData.maxFeePerGas) {
            let baseFee = latestBlock.baseFeePerGas || ethers.parseUnits('0', 'gwei');
            let maxPriorityFee = feeData.maxPriorityFeePerGas || baseFee / 10n; // Default: 10% of base fee
            let maxFee = feeData.maxFeePerGas;
            if (_increasePercent > 0) {
                maxPriorityFee = maxPriorityFee * BigInt(multiplier);
                maxFee = maxFee * BigInt(multiplier);
            }
            return createResponse(
                true,
                'success',
                {
                    maxPriorityFee: ethers.formatUnits(maxPriorityFee, 'gwei'),
                    maxFee: ethers.formatUnits(maxFee, 'gwei')
                },
                'calculateGasPrice'
            );

        } else {
            let gasPrice = feeData.gasPrice || ethers.parseUnits('0', 'gwei');
            if (_increasePercent > 0) {
                gasPrice = gasPrice * BigInt(multiplier);
            }
            return createResponse(
                true,
                'success',
                {
                    gasPrice: ethers.formatUnits(gasPrice, 'gwei')
                },
                'calculateGasPrice'
            );
        }
    } catch (error) {
        return createResponse(
            false,
            error.message || 'Failed to get gas price',
            null,
            'calculateGasPrice'
        );
    }
}