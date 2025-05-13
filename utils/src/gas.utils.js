import { ethers } from 'ethers';
import { createResponse } from './response.utils.js';
/**
 * Estimates the gas limit required to execute a specific function on a smart contract.
 * 
 * @async
 * @param {Object} _contract - The smart contract instance to interact with.
 * @param {string} _function - The name of the function to estimate gas for.
 * @param {Array} [_params=[]] - The parameters to pass to the function (optional).
 * @returns {Promise<number>} The estimated gas limit as an integer. Returns 0 if an error occurs.
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
 * Estimates the gas limit for a given transaction.
 *
 * @async
 * @function estimateTxGasLimit
 * @param {string} _rpcProvider - The RPC provider URL to connect to the Ethereum network.
 * @param {Object} _tx - The transaction object containing the details of the transaction.
 * @returns {Promise<Object>} A response object containing the success status, message, estimated gas limit (if successful), and the function name.
 */
export async function estimateTxGasLimit(_rpcProvider, _tx,) {
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
 * Calculates the gas price with an optional increase factor and supports EIP-1559.
 * 
 * @async
 * @param {string} _rpcProvider - The RPC URL to connect to the Ethereum network.
 * @param {number} _increasePercent - The percentage to increase the gas price by (default is 0).
 * @param {boolean} _EIP1559 - Whether to use EIP-1559 fee structure (default is true).
 * @returns {Promise<Object>} An object containing the status, message, and the calculated gas price details in gwei.
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