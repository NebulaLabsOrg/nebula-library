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

console.log('Get order status');
console.log('Calling: grvtInstance.getOrderStatus()');
const orderStatus = await grvtInstance.getOrderStatus(formatPerpMarket('ETH', grvt));
console.log(orderStatus);


// Cleanup: close the Extended instance to prevent memory leaks
await grvtInstance.close();