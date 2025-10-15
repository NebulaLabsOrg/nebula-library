/**
 * @function formatPerpMarket
 * @description Formats a perpetual market symbol based on the provided symbol and perpetual type. 
 *              If the symbol does not contain a dash, '-USD' is appended. Depending on the perpType,
 *              the function may further append '-PERP' or return the formatted symbol as is.
 * @param {string} _symbol - The base symbol of the market (e.g., 'ETH', 'BTC').
 * @param {string} _perpType - The type of perpetual market ('extended', 'paradex', etc.).
 * @returns {string} The formatted perpetual market symbol (e.g., 'ETH-USD', 'ETH-USD-PERP').
 */
export function formatPerpMarket(_symbol, _perpType) {
    if (!_symbol.includes('-')) {
        _symbol = `${_symbol}-USD`;
    }
    switch (_perpType.toLowerCase()) {
        case 'extended':
            return _symbol; // ETH-USD
        case 'paradex':
            return `${_symbol}-PERP`; // ETH-USD-PERP
        default:
            return _symbol;
    }
}