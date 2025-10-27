import { Extended, extendedEnum } from '../index.js'
import { TokenBucketThrottler } from '../../../../../utils/index.js';
import 'dotenv/config';


// for processing status refer to enum : https://api.docs.extended.exchange/#get-order-by-id
// rate per minute for Extended API : 1000
// INFO: limit order have post-only and market order used slippage protection
// INFO: close order use reduce-only
const extendedThrottler = new TokenBucketThrottler(1000);
const extendedInstance = new Extended(
    process.env.API_KEY,
    process.env.STARK_KEY_PRIVATE,
    process.env.STARK_KEY_PUBLIC,
    process.env.VAULT_NUMBER,
    0.1,
    extendedThrottler
);

console.log('Get token quantity');
console.log('Calling: extended.getWalletBalance');
const walletBalance = await extendedInstance.getWalletBalance();
console.log(walletBalance);

console.log('Open a position with all available balance');
console.log('Calling: extended.submitOrder');
const orderResponse = await extendedInstance.submitOrder(
    extendedEnum.order.type.limit,
    'HYPE-USD',
    extendedEnum.order.long,
    extendedEnum.order.quoteOnSecCoin,
    walletBalance.data.availableForTrade
);
console.log(orderResponse);

console.log('Check order status');
console.log('Calling: extended.getOrderStatus');
let markets = await extendedInstance.getOrderStatus(orderResponse.data.orderId);
while (markets.data.status !== extendedEnum.order.status.filled) { //in case of REJECTED request is again!!
    console.log(`Waiting for order to be filled...state `, markets.data.status);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    markets = await extendedInstance.getOrderStatus(orderResponse.data.orderId);
}
console.log(markets);

console.log('Get open positions');
console.log('Calling: extended.getOpenPositions');
const openPositions = await extendedInstance.getOpenPositions();
console.log(openPositions);

console.log('Get position status and market data');
console.log('Calling: extended.getOpenPositionDetail');
const openPositionDetail = await extendedInstance.getOpenPositionDetail(openPositions.data.markets[0]);
console.log(openPositionDetail);

console.log('Close the full position');
console.log('Calling: extended.submitCloseOrder');
const closeOrderResponse = await extendedInstance.submitCloseOrder(
    extendedEnum.order.type.limit,
    openPositionDetail.data.symbol,
    '1',
    extendedEnum.order.quoteOnSecCoin,
    true
);
console.log(closeOrderResponse);

console.log('Check close order status');
console.log('Calling: extended.getOrderStatus');
let close = await extendedInstance.getOrderStatus(closeOrderResponse.data.orderId);
while (close?.data?.status !== extendedEnum.order.status.filled) {
    console.log(`Waiting for order to be filled...state `, close.data.status);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    close = await extendedInstance.getOrderStatus(closeOrderResponse.data.orderId);
}
console.log(close);