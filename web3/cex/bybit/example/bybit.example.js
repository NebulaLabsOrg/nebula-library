
import { Bybit, bybitEnum } from '../../../../index.js'
import 'dotenv/config';

const API_KEY = process.env.BYBIT_API_KEY;
const API_SECRET = process.env.BYBIT_API_SECRET;

const bybitInstance = new Bybit(API_KEY, API_SECRET, 'USDT', 'USDC', 0.1);

// for processing status refer to enum : https://bybit-exchange.github.io/docs/v5/enum

console.log('Get token quantity');
console.log('Calling: bybit.getWalletBalance');
const walletBalance = await bybitInstance.getWalletBalance('USDC');
console.log(walletBalance);

console.log('Open a position with all available balance');
console.log('Calling: bybit.submitMarketOrder');
const order = await bybitInstance.submitMarketOrder('HYPEUSDT', bybitEnum.order.long, bybitEnum.order.quoteOnSecCoin, walletBalance.data.transferBalance);
console.log(order);

console.log('Check order status');
console.log('Calling: bybit.getOrderStatus');
let markets = await bybitInstance.getOrderStatus(order.data.orderId);
while (markets.data.status !== 'Filled') {
    console.log('Waiting for order to be filled...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 5 seconds before checking again
    markets = await bybitInstance.getOrderStatus(order.data.orderId);
}
console.log(markets);

console.log('Get open positions');
console.log('Calling: bybit.getOpenPositions');
const openPositions = await bybitInstance.getOpenPositions();
console.log(openPositions);

console.log('Get position status and market data');
console.log('Calling: bybit.getOpenPositionDetail');
const openPositionDetail = await bybitInstance.getOpenPositionDetail(openPositions.data.markets[0]);
console.log(openPositionDetail);

console.log('Close the full position');
console.log('Calling: bybit.submitCloseMarketOrder');
const closeOrder = await bybitInstance.submitCloseMarketOrder(openPositions.data.markets[0], '0', bybitEnum.order.quoteOnMainCoin, true);
console.log(closeOrder);

console.log('Check close order status');
console.log('Calling: bybit.getOrderStatus');
let close = await bybitInstance.getOrderStatus(closeOrder.data.orderId);
while (close.data.status !== 'Filled') {
    console.log('Waiting for order to be filled...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 5 seconds before checking again
    close = await bybitInstance.getOrderStatus(order.data.orderId);
}
console.log(close);

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

/*cl
console.log('View Only Calls');
console.log('Calling: bybit.submitMarketOrder');
const order = await bybitInstance.submitMarketOrder('DOGEUSDT', bybitEnum.order.long, bybitEnum.order.quoteOnSecCoin, 6);
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
const closeOrder = await bybitInstance.submitCloseMarketOrder('DOGEUSDT', '10', bybitEnum.order.quoteOnMainCoin, false);
console.log(closeOrder);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.getWithdrawStatus');
const withdrawableAmount = await bybitInstance.getWithdrawStatus('146618725');
console.log(withdrawableAmount);
*/

/*
console.log('View Only Calls');
console.log('Calling: bybit.submitWithdraw');
const withdraw = await bybitInstance.submitWithdraw(8453, 10000, '0x970669124ce6381386aaea27aff4a37fc579b992', true);
console.log(withdraw);
*/