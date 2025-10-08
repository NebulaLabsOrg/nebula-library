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
const extendedInstance = new Extended(
    process.env.API_KEY,
    process.env.STARK_KEY_PRIVATE,
    process.env.STARK_KEY_PUBLIC,
    process.env.VAULT_NUMBER,
    0.1,
    extendedThrottler
);


console.log('Calling: extended.getFundingRateHour');
const response = await extendedInstance.getFundingRateHour('HYPE-USD');
console.log(response);