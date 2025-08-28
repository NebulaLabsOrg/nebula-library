/**
 * An immutable enumeration object for order types and quoting options in the DefX perpetual DEX module.
 *
 * @namespace defxEnum
 * @property {Object} order - Contains order-related enums.
 * @property {string} order.long - Represents a 'Long' position order.
 * @property {string} order.short - Represents a 'Short' position order.
 * @property {string} order.quoteOnMainCoin - Indicates quoting on the main coin ('main').
 * @property {string} order.quoteOnSecCoin - Indicates quoting on the secondary coin ('secondary').
 * @property {Object} order.type - Contains order type enums.
 * @property {string} order.type.market - Represents a market order.
 * @property {string} order.type.limit - Represents a limit order.
 *
 * @description
 * This object provides a set of constants for order directions, quoting options, and order types
 * used in the DefX DEX perpetual trading module. It is frozen to prevent modification.
 */
export const defxEnum = Object.freeze({
    order: {
        long: '',
        short: '',
        quoteOnMainCoin: 'main',
        quoteOnSecCoin: 'secondary',
        type:{
            market: '',
            limit: ''
        }
    }
});