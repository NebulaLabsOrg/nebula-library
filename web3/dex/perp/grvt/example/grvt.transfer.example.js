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

// Example 1: Transfer 10 USDT from Funding account to Trading account
console.log('\n=== Transfer 10 USDT to Trading Account ===');
const transferToTradingResult = await grvtInstance.transferToTrading(10, 'USDT');
console.log('Transfer to Trading result:', transferToTradingResult);

if (transferToTradingResult.success) {
    console.log('✓ Successfully transferred 10 USDT to Trading account');
    console.log('Transfer data:', transferToTradingResult.data);
} else {
    console.error('✗ Transfer to Trading failed:', transferToTradingResult.message);
}

// Wait a moment before next transfer
await new Promise(resolve => setTimeout(resolve, 2000));

// Example 2: Transfer 10 USDT from Trading account back to Funding account
console.log('\n=== Transfer 10 USDT to Funding Account ===');
const transferToFundingResult = await grvtInstance.transferToFunding(10, 'USDT');
console.log('Transfer to Funding result:', transferToFundingResult);

if (transferToFundingResult.success) {
    console.log('✓ Successfully transferred 10 USDT to Funding account');
    console.log('Transfer data:', transferToFundingResult.data);
} else {
    console.error('✗ Transfer to Funding failed:', transferToFundingResult.message);
}

console.log('\n=== Transfer Example Complete ===');
console.log('Note: Always ensure you have sufficient balance in the source account before transferring.');

// Cleanup: close the Extended instance to prevent memory leaks
await grvtInstance.close();