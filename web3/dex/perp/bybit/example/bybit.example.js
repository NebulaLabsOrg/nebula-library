
import { bybit } from '../../../../../index.js'
import 'dotenv/config';

const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;

const bybitInstance = new bybit(API_KEY, API_SECRET);

/*
console.log('View Only Calls');
console.log('Calling: bybit.getMarketData');
const markets = await bybitInstance.getMarketData();
console.log(markets);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getMaketOrderSize');
const responce = await bybitInstance.getMaketOrderSize('ETHUSDT');
console.log(responce);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getFundingRateHour');
const fundingRate = await bybitInstance.getFundingRateHour('BTCUSDT');
console.log(fundingRate);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getAccountInfo');
const accountInfo = await bybitInstance.getAccountInfo();
console.log(accountInfo);
*/