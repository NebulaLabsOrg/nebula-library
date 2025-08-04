import { Defx, defxEnum } from '../index.js'
import { TokenBucketThrottler } from '../../../../../utils/index.js';
import 'dotenv/config';

// for processing status refer to enum : TBD
// rate per minute for Defx API : TBD
const defxThrottler = new TokenBucketThrottler(1000);
const defxInstance = new Defx(
    process.env.API_KEY,
    process.env.API_KEY_PRIVATE,
    defxThrottler
);

console.log('Get earned rewards');
console.log('Calling: defx.getEarnedRewards');
const earnedRewards = await defxInstance.getEarnedRewards();
console.log(earnedRewards);