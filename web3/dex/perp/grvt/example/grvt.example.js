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

/*
console.log('Get wallet status');
console.log('Calling: grvtInstance.getWalletStatus()');
const walletStatus = await grvtInstance.getWalletStatus();
console.log(walletStatus);

console.log('Get wallet balance');
console.log('Calling: grvtInstance.getWalletBalance()');
const walletBalance = await grvtInstance.getWalletBalance();
console.log(walletBalance);

console.log('Get market data');
console.log('Calling: grvtInstance.getMarketData()');
const marketData = await grvtInstance.getMarketData(formatPerpMarket('BTC', grvt));
console.log(marketData);
*/
/*
{
  success: true,
  message: 'success',
  data: [
    {
      instrument: 'BTC_USDT_Perp',
      instrument_hash: '0x030501',
      base: 'BTC',
      quote: 'USDT',
      kind: 'PERPETUAL',
      venues: [Array],
      settlement_period: 'PERPETUAL',
      base_decimals: 9,
      quote_decimals: 6,
      tick_size: '0.1',
      min_size: '0.001',
      create_time: '1766553029128807830',
      max_position_size: '1000.0',
      funding_interval_hours: 8,
      adjusted_funding_rate_cap: '0.3',
      adjusted_funding_rate_floor: '-0.3',
      min_notional: '0.0'
    }
  ],
  source: 'grvt.getMarketData',
  timestamp: '2026-01-08T12:07:40.046Z',
  trace: null
}

console.log('Get market order size');
console.log('Calling: grvtInstance.getMarketOrderSize()');
const marketOrderSize = await grvtInstance.getMarketOrderSize(formatPerpMarket('BTC', grvt));
console.log(marketOrderSize);

console.log('Get funding rates');
console.log('Calling: grvtInstance.getFundingRateHour()');
const fundingRates = await grvtInstance.getFundingRateHour(formatPerpMarket('BTC', grvt));
console.log(fundingRates);

console.log('Get open interest')
console.log('Calling: grvtInstance.getMarketOpenInterest()');
const openInterest = await grvtInstance.getMarketOpenInterest(formatPerpMarket('BTC', grvt));
console.log(openInterest);

console.log('Get open position detail')
console.log('Calling: grvtInstance.getOpenPositionDetail()');
const openPositionDetail = await grvtInstance.getOpenPositionDetail(formatPerpMarket('ETH', grvt));
console.log(openPositionDetail);

console.log('Get open positions')
console.log('Calling: grvtInstance.getOpenPositions()');
const openPositions = await grvtInstance.getOpenPositions();
console.log(openPositions);

*/

console.log('Get wallet status');
console.log('Calling: grvtInstance.getWalletStatus()');
const walletStatus = await grvtInstance.getWalletStatus();
console.log(walletStatus);

console.log('Placing a market order');
console.log('Calling: grvtInstance.submitOrder()');
const orderResult = await grvtInstance.submitOrder(
    grvtEnum.orderType.market,
    formatPerpMarket('ETH', grvt),
    grvtEnum.orderSide.long,
    grvtEnum.marketUnit.quoteOnMainCoin,
    '0.01' // 0.01 ETH
);
console.log(orderResult);



// Cleanup: close the Extended instance to prevent memory leaks
await grvtInstance.close();