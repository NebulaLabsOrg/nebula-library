/**
 * Standard response utility function
 * @param {boolean} success - Indicates if the operation was successful
 * @param {string} message - A descriptive message about the response
 * @param {object} [data] - Optional data to include in the response
 * @param {string} [source] - Optional identifier for the source function
 * @returns {object} - Standardized response object
 */
export function createResponse(success, message, data = null, source = null) {
    return {
        success,
        message,
        data,
        source,
        timestamp: new Date().toISOString(),
    };
}