/**
 * GRVT-specific enums
 * Maps to GRVT API/SDK specifications
 */
export const grvtEnum = Object.freeze({
    orderState: {
        new: 'NEW',
        partially_filled: 'PARTIALLY_FILLED',
        filled: 'FILLED',
        cancelled: 'CANCELLED',
        rejected: 'REJECTED',
        expired: 'EXPIRED'
    },
    orderSide: {
        buy: 'BUY',
        sell: 'SELL',
        long: 'BUY',    // Alias for buy
        short: 'SELL'   // Alias for sell
    },
    orderType: {
        market: 'MARKET',
        limit: 'LIMIT'
    },
    marketUnit: {
        quoteOnMainCoin: 'main',
        quoteOnSecCoin: 'secondary'
    },
    timeInForce: {
        ioc: 'IOC',      // Immediate Or Cancel (market orders)
        gtt: 'GTT'       // Good Till Time (limit orders)
    },
    accountType: {
        funding: 'FUNDING',
        trading: 'TRADING'
    }
});
