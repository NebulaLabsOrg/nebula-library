import { Paradex, paradexEnum } from '../index.js'
import { TokenBucketThrottler } from '../../../../../utils/index.js';
import 'dotenv/config';

// for processing status refer to enum : https://docs.paradex.trade/api/prod/orders/get
// rate per minut for Paradex API : 1500
const paradexThrottler = new TokenBucketThrottler(1500);
const paradex = new Paradex(
    process.env.ACCOUNT_ADDRESS,
    process.env.STARK_KEY_PUBLIC,
    process.env.STARK_KEY_PRIVATE,
    process.env.L1_ADDRESS,
    true,
    paradexThrottler
);

console.log('Fetching XP Account Balance');
console.log('Calling: paradex.getXpAccountBalance');
console.log(await paradex.getXpAccountBalance());

console.log('Fetching XP Transfer By ID');
console.log('Calling: paradex.getXpTransferById');
const id = '1766952948410201709185180000';
console.log(await paradex.getXpTransferById(id));

console.log('Transferring XP');
console.log('Calling: paradex.transferXp');
console.log(await paradex.transferXp(process.env.RECIPIENT_ADDRESS, 1));