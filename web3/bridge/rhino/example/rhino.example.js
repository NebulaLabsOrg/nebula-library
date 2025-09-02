import { Rhino } from '../index.js';
import { SupportedTokens, SupportedChains } from '@rhino.fi/sdk';
import { ChainType } from '../src/chainType.enum.js';
import 'dotenv/config';

// Parameters
const apiKey = process.env.API_KEY;
const privateKey = process.env.EVM_PRV_KEY;
const maxFeeUSD = '5'; // Maximum fee in USD
const mode = 'pay'; // or 'receive'
const rpcProvider = 'https://1rpc.io/arb';
const paradexAccount = process.env.PARADEX_ACCOUNT;
const evmAccount = process.env.EVM_ACCOUNT;
const logON = true;

// === FROM EVM CHAIN ===
const rhinoEvm = new Rhino(apiKey, privateKey, ChainType.EVM, maxFeeUSD, mode);
console.log('Calling: rhino.bridge from EVM to PARADEX');
const bridgeResult = await rhinoEvm.bridge(
  '1', // amount
  SupportedTokens.USDC, //token
  SupportedChains.ARBITRUM_ONE, //chainIn
  SupportedChains.PARADEX, //chainOut
  evmAccount, // depositor
  paradexAccount, // recipient
  logON // log bridge status changes
);
console.log(bridgeResult);
// Wait some time to wait tx
await new Promise(resolve => setTimeout(resolve, 10000));

// === FROM EVM CHAIN ===
const rhinoParadex = new Rhino(apiKey, privateKey, ChainType.PARADEX, maxFeeUSD, mode, rpcProvider);
console.log('Calling: rhino.bridge from PARADEX to EVM');
const bridgeResult2 = await rhinoParadex.bridge(
  '1', // amount
  SupportedTokens.USDC, //token
  SupportedChains.PARADEX, //chainIn
  SupportedChains.ARBITRUM_ONE, //chainOut
  paradexAccount, // depositor
  evmAccount, // recipient
  logON // log bridge status changes
);
console.log(bridgeResult2);