import { ethers } from 'ethers';
import { createResponse } from './response.utils.js';
/**
 * @function getTxGasOptions
 * @description Constructs gas options for a transaction, supporting both EIP-1559 and legacy formats.
 * @param {boolean} _EIP1559 - Indicates if EIP-1559 gas options should be used.
 * @param {Object} _gasLimit - Object containing the gas limit value (expects .data property).
 * @param {Object} _gasPrice - Object containing gas price data (expects .data property with maxFee, maxPriorityFee, or gasPrice).
 * @returns {Object} Gas options object formatted for ethers.js transactions.
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
 * @async
 * @function signAndSendTx
 * @description Signs and sends a transaction using the provided signer, then waits for the specified number of confirmations. Returns a response object with the transaction hash on success or an error message on failure.
 * @param {Object} _signer - ethers.js Signer instance used to sign and send the transaction.
 * @param {Object} _tx - Transaction object to be sent.
 * @param {number} [_numberConfirmation=1] - Number of confirmations to wait for before resolving.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the transaction hash or an error message.
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