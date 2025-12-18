import { Pyth } from '../index.js'
import 'dotenv/config';

// Instantiate the Pyth price feed client
const pyth = new Pyth();

// Specify the price ID for weETH (see Pyth docs for other IDs)
const priceIds = '0x9ee4e7c60b940440a261eb54b6d8149c23b580ed7da3139f7f08f4ea29dad395';
// https://docs.pyth.network/price-feeds/core/price-feeds/price-feed-ids

// Options for staleness, confidence, and EMA selection
const OPT = {
  maxStalenessMs: 30_000,  // Reject if price is older than 30 seconds
  maxConfRatioBps: 50n,    // Reject if confidence ratio > 0.50%
  preferEmaAboveBps: 30n,  // Use EMA if mid confidence ratio > 0.30%
}; // Basis points (bps): 10,000 bps = 100%

console.log('Get token price by ids');
console.log('Calling: pyth.getLatestPriceById');

// Fetch the latest price for the given price ID
const latestPrice = await pyth.getLatestPriceById(priceIds, OPT);

// Output the result
console.log(latestPrice);