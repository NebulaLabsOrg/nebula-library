/**
 * @function formatPerpMarket
 * @description Formats a perpetual market symbol based on the provided symbol and perpetual type.
 *              Supports multiple exchange formats: 'extended' returns symbol with '-USD',
 *              'paradex' returns symbol with '-USD-PERP', 'grvt' returns symbol with '_USDT_Perp'.
 *              For unrecognized types, returns the original symbol unchanged.
 * @param {string} _symbol - The base symbol of the market (e.g., 'ETH', 'BTC').
 * @param {string} _perpType - The type of perpetual market ('extended', 'paradex', 'grvt', etc.).
 * @returns {string} The formatted perpetual market symbol (e.g., 'ETH-USD', 'ETH-USD-PERP', 'BTC_USDT_Perp').
 */
export function formatPerpMarket(_symbol, _perpType) {
    switch (_perpType.toLowerCase()) {
        case 'extended':
            return `${_symbol}-USD`; // ETH-USD
        case 'paradex':
            return `${_symbol}-USD-PERP`; // ETH-USD-PERP
        case 'grvt':
            return `${_symbol}_USDT_Perp`; // BTC_USDT_Perp
        default:
            return _symbol;
    }
}