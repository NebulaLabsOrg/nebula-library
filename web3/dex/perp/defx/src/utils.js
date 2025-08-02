/**
 * Returns the midpoint price between ask and bid, preserving the maximum decimal precision found in the inputs.
 * @param {number|string} _askPrice - The ask price.
 * @param {number|string} _bidPrice - The bid price.
 * @returns {number} The calculated mid price.
 */
export function calculateMidPrice(_askPrice, _bidPrice) {
    // Convert input prices to numbers
    const ask = Number(_askPrice);
    const bid = Number(_bidPrice);

    // Calculate the raw mid price
    const midPriceRaw = (ask + bid) / 2;

    // Determine the number of decimal places for each price
    const askDecimals = (ask.toString().split('.')[1] || '').length;
    const bidDecimals = (bid.toString().split('.')[1] || '').length;

    // Use the maximum number of decimals from ask or bid
    const maxDecimals = Math.max(askDecimals, bidDecimals);

    // Format the mid price to the maximum decimals and convert back to number
    const midPrice = Number(midPriceRaw).toFixed(maxDecimals);
    return Number(midPrice);
}

/**
 * Returns the current timestamp as a string representing the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.
 * @returns {string} The current timestamp in milliseconds.
 * @example
 * const timestamp = getTimestamp();
 * console.log(timestamp); // "1717691234567"
 */
export function getTimestamp() {
    return Date.now().toString();
}