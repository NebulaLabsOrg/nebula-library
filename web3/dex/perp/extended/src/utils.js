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
 * Counts the number of decimal places in a given value, supporting both standard and scientific notation.
 * @param {number|string} value - The value to count decimals for.
 * @returns {number} The number of decimal places.
 */
export function countDecimals(value) {
    const str = value.toString();
    if (str.indexOf('.') !== -1 && str.indexOf('e-') === -1) {
        return str.split('.')[1].length;
    } else if (str.indexOf('e-') !== -1) {
        const parts = str.split('e-');
        return parseInt(parts[1], 10);
    }
    return 0;
}

/**
 * Adjusts and formats the order quantity based on market unit, price, and step size.
 * @param {number|string} _orderQty - The input order quantity.
 * @param {boolean} isQuoteOnSecCoin - True if market unit is quoted on secondary coin.
 * @param {number|string} price - The last price for conversion.
 * @param {number|string} qtyStep - The valid step size for quantity.
 * @returns {string} The formatted quantity.
 */
export function formatOrderQuantity(_orderQty, _isQuoteOnSecCoin, _price, _qtyStep) {
    let qty = parseFloat(_orderQty);

    if (_isQuoteOnSecCoin) {
        qty = qty / parseFloat(_price);
    }

    const step = parseFloat(_qtyStep);
    qty = Math.floor(qty / step) * step;

    const stepDecimals = (_qtyStep.toString().split('.')[1] || '').length;
    return qty.toFixed(stepDecimals);
}