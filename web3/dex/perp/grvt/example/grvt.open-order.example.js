import { Grvt, grvtEnum } from '../index.js';
import { formatPerpMarket } from '../../../../../utils/src/perp.utils.js';
import 'dotenv/config';

// GRVT Example - Basic Usage
// Testnet API rate limit: 1500 requests per minute
// For enum reference: https://api-docs.grvt.io/

const grvt = 'grvt';

const grvtInstance = new Grvt({
    funding: {
        address: process.env.GRVT_FUNDING_ADDRESS,
        privateKey: process.env.GRVT_FUNDING_PRIVATE_KEY,
        apiKey: process.env.GRVT_FUNDING_API_KEY
    },
    trading: {
        address: process.env.GRVT_TRADING_ADDRESS,
        accountId: process.env.GRVT_TRADING_ACCOUNT_ID,
        privateKey: process.env.GRVT_TRADING_PRIVATE_KEY,
        apiKey: process.env.GRVT_TRADING_API_KEY
    },
    slippage: 0.5,
    usePython: true, // Enable Python SDK for write operations
});

// Callback to log order updates
const onOrderUpdate = (orderData) => {
    console.log('Order update received:', {
        status: orderData.status,
        qtyExe: orderData.qtyExe,
        avgPrice: orderData.avgPrice,
        timestamp: new Date().toISOString()
    });
};

console.log('Placing a limit order with monitoring (retry=3, timeout=30s)');
console.log('Calling: grvtInstance.submitOrder()');
const orderResult = await grvtInstance.submitOrder(
    grvtEnum.orderType.limit,
    formatPerpMarket('ETH', grvt),
    grvtEnum.orderSide.long,
    grvtEnum.marketUnit.quoteOnMainCoin,
    '0.01', // 0.01 ETH
    onOrderUpdate, // callback
    3, // retry 3 times if REJECTED
    120000 // 30 second timeout (resets when qtyExe changes)
);
console.log('Final order result:', orderResult);

// Cleanup: close the Extended instance to prevent memory leaks
await grvtInstance.close();