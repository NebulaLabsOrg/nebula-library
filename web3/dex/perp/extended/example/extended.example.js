import { Extended, extendedEnum } from '../index.js'
import { TokenBucketThrottler } from '../../../../../utils/index.js';
import 'dotenv/config';

const extendedThrottler = new TokenBucketThrottler(1000);
const extendedInstance = new Extended(
    process.env.API_KEY,
    extendedThrottler
);


console.log('Get wallet status');
console.log('Calling: extended.getWalletStatus');
const walletStatus = await extendedInstance.getWalletStatus();
console.log(walletStatus);

/*
console.log('Get wallet balance');
console.log('Calling: extended.getWalletBalance');
const walletBalance = await extendedInstance.getWalletBalance();
console.log(walletBalance);
*/
/*
console.log('Get market data');
console.log('Calling: extended.getMarketData');
const marketData = await extendedInstance.getMarketData('BTC-USD');
console.log(marketData);
*/
/*
console.log('Get latest market data');
console.log('Calling: extended.getLatestMarketData');
const latestMarketData = await extendedInstance.getLatestMarketData('HYPE-USD');
console.log(latestMarketData);
*/
/*
console.log('Get market order size');
console.log('Calling: extended.getMarketOrderSize');
const marketOrderSize = await extendedInstance.getMarketOrderSize('HYPE-USD');
console.log(marketOrderSize);
*/
/*
console.log('Get funding rate hour');
console.log('Calling: extended.getFundingRateHour');
const fundingRateHour = await extendedInstance.getFundingRateHour('HYPE-USD');
console.log(fundingRateHour);
*/
/*
console.log('Get market open interest');
console.log('Calling: extended.getMarketOpenInterest');
const marketOpenInterest = await extendedInstance.getMarketOpenInterest('HYPE-USD');
console.log(marketOpenInterest);
*/
/*
console.log('Get open positions');
console.log('Calling: extended.getOpenPositions');
const openPositions = await extendedInstance.getOpenPositions();
console.log(openPositions);
*/
/*
console.log('Get open position detail');
console.log('Calling: extended.getOpenPositionDetail');
const openPositionDetail = await extendedInstance.getOpenPositionDetail('HYPE-USD');
console.log(openPositionDetail);
*/
/*
console.log('Get order status');
console.log('Calling: extended.getOrderStatus');
const orderStatus = await extendedInstance.getOrderStatus('1234567890');
console.log(orderStatus);
*/
//console.log(await extendedInstance.test())