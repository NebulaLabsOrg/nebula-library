import { Grvt, grvtEnum } from '../index.js';
import 'dotenv/config';

// GRVT Transfer Example - Moving funds between Funding and Trading accounts
// Testnet API rate limit: 1500 requests per minute
// For enum reference: https://api-docs.grvt.io/

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

console.log('Transfer 5 USDT Example');

console.log('Calling: grvtInstance.transferToTrading()');
const transferToTradingResult = await grvtInstance.transferToTrading(5, 'USDT');
console.log(transferToTradingResult);

// Wait a moment before next transfer
await new Promise(resolve => setTimeout(resolve, 2000));

console.log('Calling: grvtInstance.transferToFunding()');
const transferToFundingResult = await grvtInstance.transferToFunding(5, 'USDT');
console.log(transferToFundingResult);

// Cleanup: close the Extended instance to prevent memory leaks
await grvtInstance.close();