/**
 * An immutable enumeration object for extended order types and quoting options.
 *
 * @namespace extendedEnum
 * @property {Object} order - Contains order-related enums.
 * @property {string} order.long - Represents a 'Buy' order.
 * @property {string} order.short - Represents a 'Sell' order.
 * @property {string} order.quoteOnMainCoin - Indicates quoting on the main coin ('main').
 * @property {string} order.quoteOnSecCoin - Indicates quoting on the secondary coin ('secondary').
 * @property {Object} order.type - Contains order type enums.
 * @property {string} order.type.market - Represents a market order ('MARKET').
 * @property {string} order.type.limit - Represents a limit order ('LIMIT').
 *
 * @description
 * This object provides a set of constants for order directions, quoting options, and order types
 * used in the extended DEX perpetual trading module. It is frozen to prevent modification.
 */
export const extendedEnum = Object.freeze({
    order: {
        long: 'Buy',
        short: 'Sell',
        quoteOnMainCoin: 'main',
        quoteOnSecCoin: 'secondary',
        type:{
            market: 'MARKET',
            limit: 'LIMIT'
        }
    }
});