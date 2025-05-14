import { ethers } from 'ethers';
import { createResponse } from './response.utils.js';
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
/**
 * Signs and sends a transaction using the provided signer.
 *
 * @async
 * @param {object} _signer - The signer object to sign and send the transaction.
 * @param {object} _tx - The transaction object to be sent.
 * @param {number} [_numberConfirmation=1] - The number of confirmations to wait for after sending the transaction.
 * @returns {Promise<object>} A response object containing the transaction hash if successful, or an error message if failed.
 */
export async function signAndSendTx(_signer, _tx, _numberConfirmation = 1) {
    try {
        const signer = _signer;
        const txResponse = await signer.sendTransaction(_tx);
        await txResponse.wait(_numberConfirmation);
        
        return createResponse(
            true,
            'success',
            {
                txHash: txResponse.hash
            },
            'signAndSendTx'
        );
    } catch (error) {
        return createResponse(
            false,
            error.message || 'Failed to send transaction',
            null,
            'signAndSendTx'
        );
    }
}