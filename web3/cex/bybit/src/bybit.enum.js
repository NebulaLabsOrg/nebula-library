/**
 * Enum definitions for Bybit API usage.
 * 
 * transfer:
 *   - toIn: Destination account type for incoming transfers.
 *   - toOut: Destination account type for outgoing transfers.
 * 
 * position:
 *   - long: Represents a long (buy) position.
 *   - short: Represents a short (sell) position.
 *   - quoteOnMainCoin: Indicates quoting on the main coin.
 *   - quoteOnSecCoin: Indicates quoting on the secondary coin.
 */
export const bybitEnum = Object.freeze({
    transfer: {
        toIn: 'UNIFIED',
        toOut: 'FUND',
    },
    position: {
        long: 'Buy',
        short: 'Sell',
        quoteOnMainCoin: 'main',
        quoteOnSecCoin: 'secondary',
    }
});