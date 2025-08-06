import { Moralis } from '../index.js'
import 'dotenv/config';

const chainId = 1; // Ethereum Mainnet
const apyKey = process.env.APY_KEY;
const moralisInstance = new Moralis(apyKey, chainId);
// Parameters
const token = '0xB44D6C324A6c15127F1451465f1E1DbC39142A60';
const isViewOnly = true;

console.log('View Only Calls');
console.log('Calling: moralis.getErc20Holders');
console.log(await moralisInstance.getErc20Holders(token));