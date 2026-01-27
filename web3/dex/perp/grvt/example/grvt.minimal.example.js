import 'dotenv/config';
import { GrvtMinimal, grvtEnum } from '../index.js';

/**
 * Example: GrvtMinimal - HTTP API Only (No Python SDK)
 * 
 * This example demonstrates the lightweight GrvtMinimal class for web/serverless environments.
 * Perfect for:
 * - Gelato Functions
 * - AWS Lambda
 * - Vercel Functions
 * - Browser applications
 * - Environments without Python runtime
 * 
 * Features available:
 * ✅ Wallet status and balance
 * ✅ Market data (prices, funding rates, open interest)
 * ✅ Position monitoring
 * ✅ Order status checking
 * ✅ Transfer status verification
 * 
 * Not available (requires full Grvt class with Python SDK):
 * ❌ Order submission
 * ❌ Order cancellation
 * ❌ Fund transfers
 */

const grvtInstance = new GrvtMinimal({
    apiKey: process.env.GRVT_TRADING_API_KEY,
    accountId: process.env.GRVT_TRADING_ACCOUNT_ID,
});


console.log('Get wallet status');
console.log('Calling: grvtInstance.getWalletStatus()');
const walletStatus = await grvtInstance.getWalletStatus();
console.log(walletStatus);

console.log('Get wallet balance');
console.log('Calling: grvtInstance.getWalletBalance()');
const walletBalance = await grvtInstance.getWalletBalance();
console.log(walletBalance);

console.log('Get market data prices');
console.log('Calling: grvtInstance.getMarketDataPrices()');
const symbol = 'ETH_USDT_Perp';
const prices = await grvtInstance.getMarketDataPrices(symbol);
console.log(prices);