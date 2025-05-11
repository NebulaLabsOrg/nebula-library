import axios from "axios";

/**
 * Creates an Axios instance with the specified configuration.
 *
 * @param {string} _baseURL - The base URL for the Axios instance.
 * @param {Object} [_headers={}] - Optional headers to include in the requests.
 * @param {number} [_timeout=0] - Optional timeout in milliseconds for the requests. Defaults to 0 (no timeout).
 * @returns {import('axios').AxiosInstance} - A configured Axios instance.
 */
export function createInstance(_baseURL, _headers = {}, _timeout = 0) {
    return axios.create({
        baseURL: _baseURL,
        responseType: "json",
        responseEncoding: "utf8",
        timeout: _timeout,
        headers: _headers
    });
}
/**
 * Encodes a URL with query parameters.
 *
 * This function takes a base route name and an object of query parameters,
 * and returns a complete URL string with the query parameters properly encoded.
 *
 * @param {string} _routeName - The base route name or URL.
 * @param {Object} _queryParams - An object representing the query parameters to be appended to the URL.
 * @returns {string} The encoded URL with query parameters.
 */
export function encodeGetUrl(_routeName, _queryParams) {
    return _routeName + '?' + (new URLSearchParams(_queryParams)).toString();
}