
import { bybit, bybitEnum } from '../../../../../index.js'
import 'dotenv/config';

const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;

const bybitInstance = new bybit(API_KEY, API_SECRET, 'USDT', 0.1);

/*
console.log('View Only Calls');
console.log('Calling: bybit.getWalletStatus');
const walletStatus = await bybitInstance.getWalletStatus();
console.log(walletStatus);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getWalletBalance');
const walletBalance = await bybitInstance.getWalletBalance();
console.log(walletBalance);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getMarketData');
const markets = await bybitInstance.getMarketData();
console.log(markets);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getMaketOrderSize');
const responce = await bybitInstance.getMaketOrderSize('BTCUSDT');
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
console.log('Calling: bybit.getMarketOpenInterest');
const accountInfo = await bybitInstance.getMarketOpenInterest('ETHUSDT');
console.log(accountInfo);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getOpenPositions');
const openPositions = await bybitInstance.getOpenPositions();
console.log(openPositions);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getOutWithdrawableAmount');
const withdrawableAmount = await bybitInstance.getOutWithdrawableAmount();
console.log(withdrawableAmount);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.setInternalTranfer');
const transfer = await bybitInstance.setInternalTranfer(bybitEnum.transfer.toIn, 0, true);
console.log(transfer);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.submitMarketOrder');
const order = await bybitInstance.submitMarketOrder('DOGEUSDT', bybitEnum.position.long, bybitEnum.position.quoteOnSecCoin, 6);
console.log(order);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getOrderStatus');
const markets = await bybitInstance.getOrderStatus('e73c3780-1c8f-49d3-85ac-704dd243923b');
console.log(markets);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.submitCancelOrder');
const cancelOrder = await bybitInstance.submitCancelOrder('DOGEUSDT', '205782d3-a9e9-4eb8-bd06-941c3fe7df20');
console.log(cancelOrder);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getOpenPositionDetail');
const openPositionDetail = await bybitInstance.getOpenPositionDetail('DOGEUSDT');
console.log(openPositionDetail);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.submitCloseMarketOrder');
const closeOrder = await bybitInstance.submitCloseMarketOrder('DOGEUSDT', '10', bybitEnum.position.quoteOnMainCoin, false);
console.log(closeOrder);
*/


console.log('View Only Calls');
console.log('Calling: bybit.getAccountInfo');
const accountInfo = await bybitInstance.getAccountInfo();
console.log(accountInfo);

