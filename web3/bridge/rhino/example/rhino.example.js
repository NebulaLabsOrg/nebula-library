import { Rhino } from '../index.js';
import { SupportedTokens, SupportedChains } from '@rhino.fi/sdk';
import { ChainType } from '../src/chainType.enum.js';
import 'dotenv/config';

const apiKey = process.env.API_KEY;
const privateKey = process.env.PRV_KEY;
const maxFeeUSD = '5';
const mode = 'pay';
const rpcProvider = 'https://1rpc.io/base';
const paradexAccount = process.env.PARADEX_ACCOUNT;
const evmAccount = process.env.EVM_ACCOUNT;
const starknetAccount = process.env.STARKNET_ACCOUNT;
const value = process.env.VALUE || '1.0';
const logON = true;

async function bridgeTest({
  _fromChainType,
  _fromChain,
  _toChain,
  _fromAccount,
  _toAccount,
  _token = SupportedTokens.USDC,
  _amount = value,
  _rpc = undefined
}) {

  const rhino = new Rhino(apiKey, privateKey, _fromChainType, mode, _rpc);
  console.log(`Calling: rhino.bridge from ${_fromChain} to ${_toChain}`);
  const result = await rhino.bridge(
    _amount,
    _token,
    _fromChain,
    _toChain,
    _fromAccount,
    _toAccount,
    maxFeeUSD,
    logON
  );
  console.log(result);
}

const tests = {
  'evm-paradex': {
    _fromChainType: ChainType.EVM,
    _fromChain: SupportedChains.BASE,
    _toChain: SupportedChains.PARADEX,
    _fromAccount: evmAccount,
    _toAccount: paradexAccount
  },
  'paradex-evm': {
    _fromChainType: ChainType.PARADEX,
    _fromChain: SupportedChains.PARADEX,
    _toChain: SupportedChains.BASE,
    _fromAccount: paradexAccount,
    _toAccount: evmAccount,
    _rpc: rpcProvider
  },
  'evm-starknet': {
    _fromChainType: ChainType.EVM,
    _fromChain: SupportedChains.BASE,
    _toChain: SupportedChains.STARKNET,
    _fromAccount: evmAccount,
    _toAccount: starknetAccount
  },
  'starknet-evm': {
    _fromChainType: ChainType.STARKNET,
    _fromChain: SupportedChains.STARKNET,
    _toChain: SupportedChains.BASE,
    _fromAccount: starknetAccount,
    _toAccount: evmAccount
  }
};

// Select which test to run via environment variable, e.g. DIRECTION=evm-starknet node rhino.example.js
const testName = process.env.DIRECTION || 'evm-paradex';

if (tests[testName]) {
  await bridgeTest(tests[testName]);
} else {
  console.error(`Unknown test: ${testName}. Available tests: ${Object.keys(tests).join(', ')}`);
}