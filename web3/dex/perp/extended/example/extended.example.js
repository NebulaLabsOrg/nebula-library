import { Extended, extendedEnum } from '../index.js'
import 'dotenv/config';


const extendedInstance = new Extended(
    process.env.API_KEY
);


console.log('Get token quantity');
console.log('Calling: extended.getWalletStatus');
const walletStatus = await extendedInstance.getWalletStatus();
console.log(walletStatus);

//console.log(await extendedInstance.test())