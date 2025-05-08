import { ethers } from 'ethers';
/**
 * Generates transaction gas options based on the EIP-1559 standard.
 *
 * @param {boolean} _EIP1559 - Indicates whether the EIP-1559 standard is being used.
 * @param {Object} _gasLimit - An object containing the gas limit data.
 * @param {Object} _gasPrice - An object containing the gas price data. 
 *                             If EIP-1559 is used, it should include `maxFee` and `maxPriorityFee`.
 *                             Otherwise, it should include `gasPrice`.
 * @returns {Object} An object containing the gas options for the transaction.
 *                   If EIP-1559 is used, it includes `gasLimit`, `maxFeePerGas`, and `maxPriorityFeePerGas`.
 *                   Otherwise, it includes `gasLimit` and `gasPrice`.
 */
export function getTxGasOptions(_EIP1559, _gasLimit, _gasPrice) {
    if (_EIP1559) {
        return {
            gasLimit: BigInt(_gasLimit.data),
            maxFeePerGas: ethers.parseUnits(_gasPrice.data.maxFee, 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits(_gasPrice.data.maxPriorityFee, 'gwei')
        };
    } else {
        return {
            gasLimit: BigInt(_gasLimit.data),
            gasPrice: ethers.parseUnits(_gasPrice.data.gasPrice, 'gwei')
        };
    }
}