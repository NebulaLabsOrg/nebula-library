import { ERC20 } from "../index.js";
import 'dotenv/config';

const prvKey = process.env.PRV_KEY;
const rpcProvider = process.env.RPC;
const erc20 = new ERC20(prvKey, rpcProvider, 1, false);

// Parameters
const tokenAddress = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"; // USDT-Arbitrum token address
const fromAddress = process.env.WALLET; 
const toAddress = process.env.WALLET; 
const amount = 1000000; // Amount to transfer (1 USDT = 1e6)
const isViewOnly = true;

console.log("View Only Calls");
console.log("Calling: erc20.symbol");
console.log(await erc20.symbol(tokenAddress));

console.log("Calling: erc20.name");
console.log(await erc20.name(tokenAddress));

console.log("Calling: erc20.decimals");
console.log(await erc20.decimals(tokenAddress)); 

console.log("Calling: erc20.allowance");
console.log(await erc20.allowance(tokenAddress, fromAddress, toAddress));

console.log("Calling: erc20.balanceOf");
console.log(await erc20.balanceOf(tokenAddress, fromAddress));

console.log("Calling: erc20.totalSupply");
console.log(await erc20.totalSupply(tokenAddress));

if (!isViewOnly) {
    console.log("Transaction Calls");
    console.log("Calling: erc20.bkApprove");
    console.log(await erc20.bkApprove(tokenAddress, amount, toAddress));

    console.log("Calling: erc20.bkTransfer");
    console.log(await erc20.bkTransfer(tokenAddress, toAddress, amount));
}