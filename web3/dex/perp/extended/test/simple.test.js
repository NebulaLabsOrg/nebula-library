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

console.log('Calling: extended.submitWithdrawal');
const response = await extendedInstance.submitWithdrawal(
    10,
    '0x007a8bb3747d8307354fe3ee72c591026896f8fb61cb11436b70f9e9c840dc69'
);
console.log('submitWithdrawal response:', response);

// Then try to find this withdrawal immediately
if (response.success && response.data) {
    console.log('\\nTrying to find withdrawal with ID:', response.data);
    let statusResponse = await extendedInstance.getWithdrawalStatus(response.data);
    console.log('getWithdrawalStatus response:', statusResponse);
    
    let status = statusResponse.data.status;
    const startTime = Date.now();

    while (statusResponse.data.status !== 'COMPLETED' && statusResponse.data.status !== 'REJECTED') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        statusResponse = await extendedInstance.getWithdrawalStatus(response.data);
        status != statusResponse.data.status ? console.log('Current status:', statusResponse.data.status) : null;
        status = statusResponse.data.status;
    }

    const endTime = Date.now();
    const elapsedTime = (endTime - startTime) / 1000;
    console.log(`Withdrawal completed in ${elapsedTime} seconds`);
    console.log('getWithdrawalStatus response:', statusResponse);
}