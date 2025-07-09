import { Extended, extendedEnum } from '../index.js'
import 'dotenv/config';


const extendedInstance = new Extended(
    process.env.API_KEY
);

/*
console.log('Get wallet status');
console.log('Calling: extended.getWalletStatus');
const walletStatus = await extendedInstance.getWalletStatus();
console.log(walletStatus);
*/
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
console.log('Get funding rate hour');
console.log('Calling: extended.getFundingRateHour');
const fundingRateHour = await extendedInstance.getFundingRateHour('HYPE-USD');
console.log(fundingRateHour);


//console.log(await extendedInstance.test())