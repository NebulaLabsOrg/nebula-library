/**
 * Creates a standardized response object for APIs or utility functions.
 * @param {boolean} success - Indicates whether the operation was successful.
 * @param {string} message - Descriptive message for the response.
 * @param {object} [data=null] - Optional data to include in the response.
 * @param {string} [source=null] - Optional identifier for the source function.
 * @returns {object} Standardized response object.
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