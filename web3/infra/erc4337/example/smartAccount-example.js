import { SmartAccount } from "../index.js";
import { ethers } from "ethers";
import 'dotenv/config';

const rpcUrl = process.env.RPC || "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY";
const bundlerUrl = process.env.BUNDLER_URL || "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY";
const privateKey = process.env.PRV_KEY;
const nonceKey = parseInt(process.env.NONCE_KEY) || 0;
const verbose = process.env.VERBOSE === 'true' || true;

// Test parameters
const tokenAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // USDC Sepolia
const spenderAddress = "0x0000000000000000000000000000000000000001";
const isViewOnly = process.env.VIEW_ONLY === 'true' || false;

async function smartAccountExample() {
  console.log("=".repeat(50));
  console.log("SMART ACCOUNT EXAMPLE");
  console.log("=".repeat(50));

  // Initialize Smart Account (chainId is auto-detected from RPC)
  console.log("\nCalling: smartAccount.initialize");
  const account = new SmartAccount({
    rpcUrl,
    bundlerUrl,
    privateKey,
    nonceKey,
    fundingStrategy: SmartAccount.FUNDING_STRATEGY.FUND_PER_TX,
    verbose,
    numberConfirmation: 2,
  });
  
  const initResult = await account.initialize();
  console.log(initResult);

  // Get Balance
  console.log("\nCalling: smartAccount.getBalance");
  const balanceResult = await account.getBalance();
  console.log(balanceResult);

  // Get Address
  console.log("\nCalling: smartAccount.getAddress");
  const addressResult = await account.getAddress();
  console.log(addressResult);

  // Encode call example
  console.log("\nCalling: smartAccount.encodeCall");
  const erc20ABI = ["function approve(address spender, uint256 amount) returns (bool)"];
  const encodedCall = account.encodeCall(
    tokenAddress, 
    erc20ABI, 
    "approve", 
    [spenderAddress, ethers.parseUnits("10", 6)]
  );
  console.log("Encoded call:", encodedCall);

  if (!isViewOnly) {
    console.log("\n" + "=".repeat(50));
    console.log("TRANSACTION CALLS");
    console.log("=".repeat(50));

    // Send single transaction
    console.log("\nCalling: smartAccount.sendTransaction");
    const singleTxResult = await account.sendTransaction(
      tokenAddress,
      0n,
      ethers.Interface.from(erc20ABI).encodeFunctionData("approve", [spenderAddress, ethers.parseUnits("5", 6)])
    );
    console.log(singleTxResult);

    // Send batch transactions
    console.log("\nCalling: smartAccount.sendBatch");
    const batchResult = await account.sendBatch([
      account.encodeCall(tokenAddress, erc20ABI, "approve", [spenderAddress, ethers.parseUnits("10", 6)]),
      account.encodeCall(tokenAddress, erc20ABI, "approve", [spenderAddress, ethers.parseUnits("20", 6)])
    ]);
    console.log(batchResult);
  }
}

smartAccountExample().catch(console.error);
