/**
 * Enum-like object for Paradex market types.
 * 
 * @namespace paradexEnum
 * @property {Object} market - Contains market-related types.
 * @property {Object} market.type - Types of markets available.
 * @property {string} market.type.perp - Represents a perpetual market ("PERP").
 * @property {string} market.type.option - Represents a perpetual option market ("PERP_OPTION").
 * 
 * This object is frozen to prevent modification and is used to standardize market type references in Paradex.
 */
export const paradexEnum = Object.freeze({
    market:{
        type:{
            perp: 'PERP',
            option: 'PERP_OPTION'
        }
    },
    order:{
        long: 'BUY',
        short: 'SELL',
        quoteOnMainCoin: 'main',
        quoteOnSecCoin: 'secondary',
        type:{
            market: 'MARKET',
            limit: 'LIMIT'
        }
    }
});