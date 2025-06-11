import { Paradex } from '../../../../../index.js'
import { paradexEnum } from '../src/paradex.enum.js';
import 'dotenv/config';

// for processing status refer to enum : https://docs.paradex.trade/api/prod/orders/get

const paradexInstance = new Paradex(
    process.env.ACCOUNT_ADDRESS,
    process.env.PUBLIC_KEY,
    process.env.PRIVATE_KEY,
    process.env.ETHEREUM_ACCOUNT
);

console.log('Get token quantity');
console.log('Calling: paradex.getWalletBalance');
const walletBalance = await paradexInstance.getWalletBalances('USDC');
console.log(walletBalance);

console.log('Open a position with all available balance');
console.log('Calling: paradex.submitOrder');
const order = await paradexInstance.submitOrder(paradexEnum.order.type.limit, 'HYPE-USD-PERP', paradexEnum.order.long, paradexEnum.order.quoteOnSecCoin, walletBalance.data);
console.log(order);

console.log('Check order status');
console.log('Calling: paradex.getOrderStatus');
let markets = await paradexInstance.getOrderStatus(order.data.orderId);
while (markets.data.status !== 'CLOSED') {
    console.log('Waiting for order to be filled...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 5 seconds before checking again
    markets = await paradexInstance.getOrderStatus(order.data.orderId);
}
console.log(markets);

console.log('Get open positions');
console.log('Calling: paradex.getOpenPositions');
const openPositions = await paradexInstance.getOpenPositions();
console.log(openPositions);

console.log('Get position status and market data');
console.log('Calling: paradex.getOpenPositionDetail');
const openPositionDetail = await paradexInstance.getOpenPositionDetail(openPositions.data.markets[0]);
console.log(openPositionDetail);

console.log('Close the full position');
console.log('Calling: paradex.submitCloseMarketOrder');
const closeOrder = await paradexInstance.submitCloseOrder(paradexEnum.order.type.limit, openPositions.data.markets[0], '0', paradexEnum.order.quoteOnSecCoin, true);
console.log(closeOrder);

console.log('Check close order status');
console.log('Calling: paradex.getOrderStatus');
let close = await paradexInstance.getOrderStatus(closeOrder.data.orderId);
while (close.data.status !== 'CLOSED') {
    console.log('Waiting for order to be filled...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 5 seconds before checking again
    close = await paradexInstance.getOrderStatus(order.data.orderId);
}
console.log(close);