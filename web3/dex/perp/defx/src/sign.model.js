import crypto from 'crypto';
import { getTimestamp } from './utils.js';

/**
 * @function buildSortedQueryString
 * @description Builds a sorted query string from an object of query parameters. The keys are sorted alphabetically, and each key-value pair is joined by '=' and concatenated with '&'.
 * @param {Object} _queryParams - An object containing query parameters as key-value pairs.
 * @returns {string} A URL query string with sorted keys, or an empty string if no parameters are provided.
 */
function buildSortedQueryString(_queryParams) {
    if (!_queryParams || Object.keys(_queryParams).length === 0) return '';
    return Object.keys(_queryParams)
        .sort()
        .map(key => `${key}=${_queryParams[key]}`)
        .join('&');
}

/**
 * @function minifyJson
 * @description Converts a JavaScript object to a minified JSON string. If the input object is empty or falsy, returns an empty string.
 * @param {Object} _body - The object to be converted into a minified JSON string.
 * @returns {string} The minified JSON string representation of the input object, or an empty string if the input is empty or falsy.
 */
function minifyJson(_body) {
    if (!_body || Object.keys(_body).length === 0) return '';
    return JSON.stringify(_body);
}

/**
 * @function getSignature
 * @description Generates a cryptographic signature for API requests using HMAC-SHA256. The signature is created by concatenating the current timestamp, sorted query parameters, and a minified JSON body, then hashing the result with the provided API key. This ensures request integrity and authentication for secure communication with the backend.
 * @param {string} _apiKeyPrivate - The private API key used as the HMAC secret for signing the message.
 * @param {Object} [_queryParams={}] - An object containing query parameters to be included in the signature. These are sorted and serialized before signing.
 * @param {Object} [_body={}] - An object representing the request body, which is minified and included in the signature.
 * @returns {{timestamp: string, signature: string}} An object containing the generated timestamp and the corresponding HMAC signature.
 */
export function getSignature(_apiKeyPrivate, _queryParams = {}, _body = {}) {
    const timestamp = getTimestamp();
    const queryString = buildSortedQueryString(_queryParams);
    const bodyString = minifyJson(_body);

    const message = `${timestamp}${queryString}${bodyString}`;

    const signature = crypto
        .createHmac('sha256', _apiKeyPrivate)
        .update(message)
        .digest('hex');

    return { timestamp, signature };
}