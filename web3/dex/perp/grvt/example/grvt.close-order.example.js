import { Grvt, grvtEnum } from '../index.js';
import { formatPerpMarket } from '../../../../../utils/src/perp.utils.js';
import 'dotenv/config';

// GRVT Example - Close Order Test
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

console.log('Submit close order (with monitoring)');
console.log('Calling: grvtInstance.submitCloseOrder()');
// Callback to log order updates
const onOrderUpdate = (orderData) => {
    console.log('Order update received:', {
        status: orderData.status,
        qtyExe: orderData.qtyExe,
        avgPrice: orderData.avgPrice,
        timestamp: new Date().toISOString()
    });
};
const closeResult = await grvtInstance.submitCloseOrder(
    grvtEnum.orderType.limit,
    formatPerpMarket('ETH', grvt),
    grvtEnum.marketUnit.quoteOnMainCoin,
    0,
    true, // closeAll
    onOrderUpdate,
    2, // retry
    120000 // timeout
);
console.log(closeResult);

// Cleanup: close the instance to prevent memory leaks
await grvtInstance.close();