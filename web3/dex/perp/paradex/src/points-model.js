import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';

/**
 * Retrieves XP (experience points) account balance for a specific season from the Paradex API.
 *
 * @async
 * @function pmGetXpAccountBalance
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _season - The season identifier to retrieve XP balance for.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the XP balance or an error message.
 * @example
 * // Success response:
 * {
 *   success: true,
 *   message: 'success',
 *   data: {
 *     season: 'season_1',
 *     total: 15000,
 *     transferrable: 12000,
 *     delta: 500
 *   },
 *   source: 'paradex.getXpAccountBalance'
 * }
 */
export async function pmGetXpAccountBalance(_instance, _season) {
    try {
        const params = { season: _season };
        const url = encodeGetUrl('/xp/account-balance', params)
        const responce = await _instance.get(url);
        return createResponse(
            true,
            'success',
            {
                season: _season,
                total: responce.data.earned_xp,
                transferrable: responce.data.transferrable_xp,
                delta: responce.data.xp_delta
            },
            'paradex.getXpAccountBalance'
        );
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get XP account balance';
        return createResponse(false, message, null, 'paradex.getXpAccountBalance');
    }
}

/**
 * Retrieves details of a specific XP transfer by its ID from the Paradex API.
 *
 * @async
 * @function pmGetXpTransferById
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _transferId - The unique identifier of the XP transfer to retrieve.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the transfer details or an error message.
 * @example
 * // Success response:
 * {
 *   success: true,
 *   message: 'success',
 *   data: {
 *     id: 'transfer_123abc',
 *     amount: 1000,
 *     sender: '0x1234...5678',
 *     recipient: '0xabcd...efgh',
 *     createdAt: '2025-12-28T10:30:00Z',
 *     fee: 10,
 *     isPrivate: false,
 *     season: 'season_1'
 *   },
 *   source: 'paradex.getXpTransferById'
 * }
 */
export async function pmGetXpTransferById(_instance, _transferId) {
    try {
        const url = `/xp/transfer/${_transferId}`;
        const responce = await _instance.get(url);
        return createResponse(
            true,
            'success',
            {
                id: responce.data.id,
                amount: responce.data.amount,
                sender: responce.data.sender,
                recipient: responce.data.recipient,
                createdAt: responce.data.created_at,
                fee: responce.data.fee,
                isPrivate: responce.data.is_private,
                season: responce.data.season
            },
            'paradex.getXpTransferById'
        );
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to get XP transfer by ID';
        return createResponse(false, message, null, 'paradex.getXpTransferById');
    }
}

/**
 * Transfers XP (experience points) to another address on the Paradex platform.
 *
 * @async
 * @function pmTransferXp
 * @param {Object} _instance - Axios instance or similar HTTP client for making API requests.
 * @param {string} _toAddress - The recipient's address to transfer XP to.
 * @param {number} _amount - The amount of XP to transfer.
 * @param {Object} _opt - Transfer options.
 * @param {string} _opt.season - The season identifier for the transfer.
 * @param {boolean} _opt.isPrivate - Whether the transfer should be private.
 * @returns {Promise<Object>} A promise that resolves to a response object containing the transfer details or an error message.
 * @example
 * // Success response:
 * {
 *   success: true,
 *   message: 'success',
 *   data: {
 *     id: 'transfer_456def',
 *     amount: 500,
 *     sender: '0x9876...5432',
 *     recipient: '0xfedc...ba98',
 *     createdAt: '2025-12-28T11:00:00Z',
 *     fee: 5,
 *     isPrivate: true,
 *     season: 'season_1'
 *   },
 *   source: 'paradex.transferXp'
 * }
 */
export async function pmTransferXp(_instance, _toAddress, _amount, _opt) {
    try {
        const body = {
            recipient: _toAddress,
            amount: _amount,
            season: _opt.season,
            is_private: _opt.isPrivate
        };
        const url = '/xp/transfer';
        const responce = await _instance.post(url, body);
        return createResponse(
            true,
            'success',
            {
                id: responce.data.transfer.id,
                amount: responce.data.transfer.amount,
                sender: responce.data.transfer.sender,
                recipient: responce.data.transfer.recipient,
                createdAt: responce.data.transfer.created_at,
                fee: responce.data.transfer.fee,
                isPrivate: responce.data.transfer.is_private,
                season: responce.data.transfer.season
            },
            'paradex.transferXp'
        );
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to transfer XP';
        return createResponse(false, message, null, 'paradex.transferXp');
    }
}