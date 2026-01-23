import { ethers } from "ethers";
import axios from "axios";
import { ABI } from "./abi.js";

/**
 * Utility functions for ERC-4337 Account Abstraction operations.
 * Handles account creation, transaction encoding, gas estimation, and bundler communication.
 */

/**
 * Calculate the deterministic smart account address using the factory contract.
 * @param {Object} _provider - Ethers JsonRpcProvider instance
 * @param {string} _factoryAddress - Factory contract address
 * @param {string} _ownerAddress - Owner wallet address
 * @param {number} [_salt=0] - Salt for deterministic account creation
 * @returns {Promise<string>} Calculated smart account address
 */
export async function calculateAccountAddress(_provider, _factoryAddress, _ownerAddress, _salt = 0) {
  const selector = "0x8cb84e18"; // getAddress(address,uint256)
  const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [_ownerAddress, _salt]
  );
  const callData = selector + encodedParams.slice(2);

  const result = await _provider.call({
    to: _factoryAddress,
    data: callData,
  });

  return ethers.AbiCoder.defaultAbiCoder().decode(["address"], result)[0];
}

/**
 * Check if a smart account is already deployed on-chain.
 * @param {Object} _provider - Ethers JsonRpcProvider instance
 * @param {string} _accountAddress - Smart account address to check
 * @returns {Promise<boolean>} True if deployed, false otherwise
 */
export async function isAccountDeployed(_provider, _accountAddress) {
  const code = await _provider.getCode(_accountAddress);
  return code !== "0x";
}

/**
 * Get the current nonce for a smart account from the EntryPoint contract.
 * Supports parallel execution via different nonce keys.
 * @param {Object} _provider - Ethers JsonRpcProvider instance
 * @param {string} _entryPointAddress - EntryPoint contract address
 * @param {string} _accountAddress - Smart account address
 * @param {number} [_nonceKey=0] - Nonce key for parallel execution (default: 0)
 * @returns {Promise<bigint>} Current nonce value
 */
export async function getNonce(_provider, _entryPointAddress, _accountAddress, _nonceKey = 0) {
  const entryPoint = new ethers.Contract(_entryPointAddress, ABI.ENTRYPOINT, _provider);
  return await entryPoint.getNonce(_accountAddress, _nonceKey);
}

/**
 * Create initCode for deploying a new smart account via the factory.
 * Only needed for the first transaction when the account doesn't exist yet.
 * @param {string} _factoryAddress - Factory contract address
 * @param {string} _ownerAddress - Owner wallet address
 * @param {number} [_salt=0] - Salt for deterministic account creation
 * @returns {string} Encoded initCode (factory address + call data)
 */
export function createInitCode(_factoryAddress, _ownerAddress, _salt = 0) {
  const factory = new ethers.Interface(ABI.FACTORY);
  const initCallData = factory.encodeFunctionData("createAccount", [_ownerAddress, _salt]);
  return ethers.concat([_factoryAddress, initCallData]);
}

/**
 * Encode a single transaction for the smart account's execute function.
 * @param {string} _to - Target contract address
 * @param {bigint} _value - ETH value to send
 * @param {string} _data - Encoded function call data
 * @returns {string} Encoded callData for UserOperation
 */
export function encodeSingleCall(_to, _value, _data) {
  const accountInterface = new ethers.Interface(ABI.ACCOUNT);
  return accountInterface.encodeFunctionData("execute", [_to, _value, _data]);
}

/**
 * Encode multiple transactions for the smart account's executeBatch function.
 * More gas-efficient than multiple separate transactions.
 * @param {Array<{to: string, value: bigint, data: string}>} _transactions - Array of transaction objects
 * @returns {string} Encoded callData for batch UserOperation
 */
export function encodeBatchCall(_transactions) {
  const targets = [];
  const values = [];
  const datas = [];

  for (const tx of _transactions) {
    targets.push(tx.to);
    values.push(tx.value || 0n);
    datas.push(tx.data || "0x");
  }

  const accountInterface = new ethers.Interface(ABI.ACCOUNT);
  return accountInterface.encodeFunctionData("executeBatch", [targets, values, datas]);
}

/**
 * Sign a UserOperation according to ERC-4337 specification.
 * Creates a signature over the UserOp hash, EntryPoint, and chainId.
 * @param {Object} _userOp - UserOperation object
 * @param {string} _entryPointAddress - EntryPoint contract address
 * @param {bigint} _chainId - Chain ID for signature domain
 * @param {Object} _signer - Ethers Wallet instance for signing
 * @returns {Promise<string>} Signature hex string
 */
export async function signUserOp(_userOp, _entryPointAddress, _chainId, _signer) {
  const packed = ethers.AbiCoder.defaultAbiCoder().encode(
    [
      "address", "uint256", "bytes32", "bytes32",
      "uint256", "uint256", "uint256", "uint256",
      "uint256", "bytes32",
    ],
    [
      _userOp.sender,
      _userOp.nonce,
      ethers.keccak256(_userOp.initCode),
      ethers.keccak256(_userOp.callData),
      _userOp.callGasLimit,
      _userOp.verificationGasLimit,
      _userOp.preVerificationGas,
      _userOp.maxFeePerGas,
      _userOp.maxPriorityFeePerGas,
      ethers.keccak256(_userOp.paymasterAndData),
    ]
  );

  const enc = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "address", "uint256"],
    [ethers.keccak256(packed), _entryPointAddress, _chainId]
  );

  const message = ethers.keccak256(enc);
  return await _signer.signMessage(ethers.getBytes(message));
}

/**
 * Estimate gas limits for a UserOperation via the bundler.
 * @param {string} _bundlerUrl - Bundler RPC endpoint
 * @param {Object} _userOp - UserOperation object to estimate
 * @param {string} _entryPointAddress - EntryPoint contract address
 * @returns {Promise<{callGasLimit: string, verificationGasLimit: string, preVerificationGas: string}>} Gas estimates
 * @throws {Error} If bundler estimation fails
 */
export async function estimateUserOpGas(_bundlerUrl, _userOp, _entryPointAddress) {
  const response = await axios.post(_bundlerUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_estimateUserOperationGas",
    params: [_userOp, _entryPointAddress],
  });

  const data = response.data;
  if (data.error) throw new Error(`Gas estimation failed: ${data.error.message}`);
  return data.result;
}

/**
 * Get current gas fees with bundler-compatible minimum priority fee.
 * Ensures at least 0.1 gwei priority fee for bundler acceptance.
 * @param {Object} _provider - Ethers JsonRpcProvider instance
 * @returns {Promise<{maxFeePerGas: bigint, maxPriorityFeePerGas: bigint}>} Gas fee parameters
 */
export async function getGasFees(_provider) {
  const feeData = await _provider.getFeeData();
  const minPriorityFee = 100000000n; // 0.1 gwei minimum for bundler
  
  return {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas > minPriorityFee
      ? feeData.maxPriorityFeePerGas
      : minPriorityFee,
  };
}

/**
 * Submit a signed UserOperation to the bundler for execution.
 * @param {string} _bundlerUrl - Bundler RPC endpoint
 * @param {Object} _userOp - Signed UserOperation object
 * @param {string} _entryPointAddress - EntryPoint contract address
 * @returns {Promise<string>} UserOperation hash
 * @throws {Error} If bundler rejects the UserOp
 */
export async function sendUserOp(_bundlerUrl, _userOp, _entryPointAddress) {
  const response = await axios.post(_bundlerUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_sendUserOperation",
    params: [_userOp, _entryPointAddress],
  });

  const data = response.data;
  if (data.error) throw new Error(`UserOp failed: ${data.error.message}`);
  return data.result;
}

/**
 * Poll the bundler for UserOperation receipt until confirmed or timeout.
 * Checks every 2 seconds for up to 60 seconds by default.
 * @param {string} _bundlerUrl - Bundler RPC endpoint
 * @param {string} _userOpHash - UserOperation hash to track
 * @param {number} [_maxAttempts=30] - Maximum polling attempts (default: 30)
 * @returns {Promise<Object>} UserOperation receipt with transaction details
 * @throws {Error} If receipt not found within timeout period
 */
export async function waitForUserOpReceipt(_bundlerUrl, _userOpHash, _maxAttempts = 30) {
  for (let i = 0; i < _maxAttempts; i++) {
    const response = await axios.post(_bundlerUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getUserOperationReceipt",
      params: [_userOpHash],
    });

    const data = response.data;
    if (data.result) return data.result;

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("UserOp timeout");
}

/**
 * Conditional logging utility for verbose mode.
 * Only logs when verbose flag is true.
 * @param {boolean} _verbose - Whether to log or not
 * @param {...any} _args - Arguments to pass to console.log
 */
export function log(_verbose, ..._args) {
  if (_verbose) {
    console.log(..._args);
  }
}

/**
 * Print formatted transaction results with explorer links.
 * Only outputs when verbose mode is enabled.
 * @param {string} _txHash - Transaction hash
 * @param {string} _userOpHash - UserOperation hash
 * @param {string} _smartAccountAddress - Smart account address
 * @param {Object} _chain - Chain configuration object with explorer URLs
 * @param {boolean} _verbose - Whether to print or not
 */
export function printResult(_txHash, _userOpHash, _smartAccountAddress, _chain, _verbose) {
  log(_verbose, "\n[SUCCESS] Transaction confirmed");
  log(_verbose, "[SUCCESS] TX Hash:", _txHash);
  log(_verbose, "[SUCCESS] UserOp Hash:", _userOpHash);
  log(_verbose, "[SUCCESS] Smart Account:", _smartAccountAddress);
  
  if (_chain) {
    log(_verbose, `\n[EXPLORER] View on ${_chain.name}:`);
    log(_verbose, `[EXPLORER] ${_chain.explorer}/tx/${_txHash}`);
    log(_verbose, `\n[EXPLORER] View UserOp:`);
    log(_verbose, `[EXPLORER] ${_chain.jiffyscan}/userOpHash/${_userOpHash}?network=${_chain.name.toLowerCase().replace(" ", "-")}`);
  }
}
