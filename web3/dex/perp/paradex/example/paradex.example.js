import { paradex } from '../../../../../index.js'
import 'dotenv/config';

const Paradex = new paradex(
    process.env.ACCOUNT_ADDRESS,
    process.env.PUBLIC_KEY,
    process.env.PRIVATE_KEY,
    process.env.ETHEREUM_ACCOUNT
);

// Parameters
const isViewOnly = true;

console.log('View Only Calls');
console.log('Calling: Paradex.onboardUser');
console.log(await Paradex.onboardUser());
console.log('Calling: Paradex.test');
console.log(await Paradex.test());

if (!isViewOnly) {
    console.log('Transaction Calls');

}