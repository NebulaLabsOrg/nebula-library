/**
 * @function createResponse
 * @description Generates a standardized response object for API operations, including optional error tracing.
 * @param {boolean} success - Indicates if the operation was successful.
 * @param {string} message - A descriptive message about the operation result.
 * @param {Object|null} [data=null] - Optional data payload to include in the response.
 * @param {string|null} [source=null] - Optional source identifier for the response.
 * @returns {Object} A response object containing success status, message, data, source, timestamp, and error trace if applicable.
 */
export function createResponse(success, message, data = null, source = null) {
    const trace = !success
        ? new Error().stack
            .split('\n')
            .slice(2, 5)
            .map(line => line.trim())
            .join(' | ')
        : null;

    const response = {
        success,
        message,
        data,
        source,
        timestamp: new Date().toISOString(),
        trace,
    };

    if (!success) {
        console.log(response);
    }
    return response;
}