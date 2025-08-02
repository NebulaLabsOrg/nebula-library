import { createResponse } from '../../../../../utils/src/response.utils.js';
import { encodeGetUrl } from '../../../../../utils/src/http.utils.js';
import { getSignature } from './sign.model.js';

/**
 * @async
 * @function vmGetEarnedRewards
 * @description Retrieves the total earned rewards and the latest reward details for a user by making authenticated requests to the API using the provided client instance and API secret. Returns a standardized response object containing the total points earned and the latest epoch's reward amount and period, or an error message if the request fails.
 * @param {Object} _instance - The API client instance used to perform the HTTP requests.
 * @param {string} _apiSecret - The API secret used to generate request signatures.
 * @returns {Promise<Object>} A Promise that resolves to a response object containing the total earned rewards, latest reward details, or an error message.
 */
export async function vmGetEarnedRewards(_instance, _apiSecret) {
    try {
        const { timestamp, signature } = getSignature(_apiSecret);
        const response = await _instance.get('/auth/api/analytics/points/overview', {
            headers: {
                'X-DEFX-SIGNATURE': signature,
                'X-DEFX-TIMESTAMP': timestamp,
                'Content-Type': 'application/json',
            }
        });
        const { timestamp: timestampHyst, signature: signatureHyst } = getSignature(_apiSecret);
        const responceHystory = await _instance.get('/auth/api/analytics/points/history', {
            headers: {
                'X-DEFX-SIGNATURE': signatureHyst,
                'X-DEFX-TIMESTAMP': timestampHyst,
                'Content-Type': 'application/json',
            }
        });
        const latestEpoch = responceHystory.data.length > 0 ? responceHystory.data[responceHystory.data.length - 1] : null;

        return createResponse(true, 'success', {
            total: response.data.data.totalPoints.toString(),
            latest: {
                amount: latestEpoch ? latestEpoch.accumulatedPoints.toString() : '0',
                period: latestEpoch ? latestEpoch.week : 'N/A'
            }
        }, 'defx.getEarnedRewards');
    } catch (error) {
        return createResponse(false, error.response?.data ?? error.message, null, 'defx.getEarnedRewards');
    }
}