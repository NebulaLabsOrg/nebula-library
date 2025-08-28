import { createResponse } from './response.utils.js';

/**
 * @function feInteractWithContract
 * @description Interacts with an ethers.js contract instance by calling the specified method with given parameters. Handles both read and write operations, waits for confirmations on write, and returns a standardized response.
 * @param {Object} contract - The ethers.js contract instance.
 * @param {string} method - The type of interaction: 'READ' or 'WRITE'.
 * @param {string} methodName - The name of the contract method to call.
 * @param {Array} [params=[]] - The parameters to pass to the contract method.
 * @param {number} [numberConfirmation=1] - Number of block confirmations to wait for (applies to 'WRITE' operations).
 * @returns {Promise<Object>} A standardized response object indicating success or failure.
 */
export async function feInteractWithContract(contract, method, methodName, params = [], numberConfirmation = 1) {
    try {
        const response = await contract[methodName](...params);
        if (method === 'WRITE') {
            await response.wait(numberConfirmation);
            return createResponse(true, 'success', { txHash: response.hash }, 'interactWithContract');
        }
        return createResponse(true, 'success', response, 'interactWithContract');
    } catch (error) {
        return createResponse(false, error?.message || 'Failed to interact with contract', null, 'interactWithContract');
    }
}