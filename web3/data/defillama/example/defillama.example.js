import { Defillama, defillamaEnum } from '../index.js'
import { TokenBucketThrottler } from '../../../../utils/index.js';
import 'dotenv/config';

const defillamaThrottler = new TokenBucketThrottler(1000);
const defillamaInstance = new Defillama(
    defillamaEnum.chain.ethereum,
    defillamaThrottler
);

console.log('Get token price by address');
console.log('Calling: defillama.getTokenPriceByAddress');
const tokenPrice = await defillamaInstance.getTokenPriceByAddress('0x514910771af9ca656af840dff83e8264ecf986ca'); // LINK Token Address
console.log(tokenPrice);