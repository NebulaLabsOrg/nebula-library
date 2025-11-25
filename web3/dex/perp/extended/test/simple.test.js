import { Extended } from '../index.js'
import { TokenBucketThrottler } from '../../../../../utils/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the example folder
dotenv.config({ path: path.join(__dirname, '../example/.env') });

// for processing status refer to enum : https://api.docs.extended.exchange/#get-order-by-id
// rate per minute for Extended API : 1000
const extendedThrottler = new TokenBucketThrottler(1000);
const extendedInstance = new Extended({
    apiKey: process.env.API_KEY,
    privateKey: process.env.STARK_KEY_PRIVATE,
    publicKey: process.env.STARK_KEY_PUBLIC,
    vault: parseInt(process.env.VAULT_NUMBER),
    slippage: 0.1,
    throttler: extendedThrottler
});

console.log('Get token quantity');
console.log('Calling: extended.getWalletBalance');
const walletBalance = await extendedInstance.getWalletBalance();
console.log(walletBalance);

// Cleanup: close the Extended instance
await extendedInstance.close();