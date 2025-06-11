import { Kyberswap, ERC20 } from '../../../../../index.js'
import 'dotenv/config';

const chainId = 42161; // Arbitrum Mainnet  
const prvKey = process.env.PRV_KEY;
const rpcProvider = process.env.RPC;
const kyberswapInstance = new Kyberswap(prvKey, chainId, 'test-client-id', rpcProvider);
const erc20 = new ERC20(prvKey, rpcProvider, 1);

// Parameters
const tokenIn = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'; // USDT-Arbitrum token address
const amountIn = 3000000; // Amount to transfer (1 USDT = 1e6)
const tokenOut = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8'; // USDC.e-Arbitrum token address
const isViewOnly = true;

console.log('View Only Calls');
console.log('Calling: kyberswap.getRoute');
const route = await kyberswapInstance.getRoute(tokenIn, amountIn, tokenOut);
console.log(route);

if (!isViewOnly) {
    console.log('Transaction Calls');
    console.log('Calling: erc20.bkApprove');
    console.log(await erc20.bkApprove(tokenIn, amountIn, route.data.routerAddress));
    console.log('Calling: kyberswap.swap');
    console.log(await kyberswapInstance.swap(tokenIn, amountIn, tokenOut, 0.5, route.data));
}