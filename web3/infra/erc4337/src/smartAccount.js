import { ethers } from "ethers";
import { CHAINS } from "./chains.js";
import { ABI } from "./abi.js";
import * as utils from "./utils.js";
import { calculateGasPrice } from "../../../../utils/src/gas.utils.js";
import { createResponse } from "../../../../utils/src/response.utils.js";

/**
 * @typedef {Object} SmartAccountConfig
 * @property {string} rpcUrl - RPC provider URL for blockchain connection
 * @property {string} bundlerUrl - ERC-4337 bundler endpoint URL
 * @property {string} privateKey - Owner's private key (controls the smart account)
 * @property {number} [chainId] - Optional: Chain ID for validation. If not provided, auto-detected from RPC.
 * @property {string} [factoryAddress] - Custom factory address (overrides chain default)
 * @property {string} [entryPointAddress] - Custom EntryPoint address (overrides chain default)
 * @property {string} [fundingStrategy='no-fund'] - Automatic funding strategy (be careful with parallel executions):
 *   - 'no-fund': No automatic funding (manual funding required)
 *   - 'fund-per-tx': Auto-fund exact amount needed per transaction
 *   - 'fund-with-threshold': Maintain target balance threshold
 * @property {string} [targetBalance] - Target balance in ETH for 'fund-with-threshold' strategy (e.g., '0.1')
 * @property {number} [nonceKey=0] - Nonce key for parallel execution (use different keys for concurrent operations)
 * @property {number} [salt=0] - Salt for deterministic account creation (use different values to create multiple accounts from the same owner)
 * @property {number} [gasPriceIncreasePercent=0] - Percentage to increase gas price for faster inclusion (e.g., 20 for 20% higher)
 * @property {number} [numberConfirmation=1] - Number of block confirmations to wait for after transaction is mined
 * @property {boolean} [verbose=false] - Enable detailed logging for debugging
 * 
 * NOTE: Paymaster support is not yet implemented. All transactions require the smart account to have sufficient ETH balance.
 */

/**
 * SmartAccount class provides a complete implementation of ERC-4337 Account Abstraction.
 * Supports gasless transactions, batch operations, and flexible funding strategies.
 * All methods return a standardized response format via createResponse utility.
 * 
 * @example
 * const smartAccount = new SmartAccount({
 *   rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/YOUR-KEY",
 *   bundlerUrl: "https://bundler.biconomy.io/api/v2/11155111/YOUR-KEY",
 *   privateKey: "0x...",
 *   chainId: 11155111, // Sepolia
 *   fundingStrategy: SmartAccount.FUNDING_STRATEGY.FUND_PER_TX,
 *   verbose: true
 * });
 */

export class SmartAccount {
    static CHAINS = CHAINS;
    static ABI = ABI;

    static FUNDING_STRATEGY = {
        NO_FUND: 'no-fund',
        FUND_PER_TX: 'fund-per-tx',
        FUND_WITH_THRESHOLD: 'fund-with-threshold'
    };

    /**
     * Create a new SmartAccount instance
     * @param {SmartAccountConfig} config - Configuration object with RPC, bundler, and funding settings
     * @throws {Error} If invalid nonceKey or funding strategy provided
     */
    constructor(config) {
        this.rpcUrl = config.rpcUrl;
        this.bundlerUrl = config.bundlerUrl;

        // Store config chainId for validation (optional)
        this.configChainId = config.chainId || null;

        // Chain configuration will be set during initialize()
        this.chain = null;
        this.factoryAddress = config.factoryAddress || null;
        this.entryPointAddress = config.entryPointAddress || null;

        this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
        this.owner = new ethers.Wallet(config.privateKey, this.provider);
        this.salt = config.salt ?? 0; // Default to 0, can be changed to create different accounts

        this.address = null;
        this.accountExists = false;

        // Nonce key for parallel execution support
        this.nonceKey = config.nonceKey ?? 0; // Default to 0 for backward compatibility

        // Validate nonceKey
        if (!Number.isInteger(this.nonceKey) || this.nonceKey < 0) {
            throw new Error(`Invalid nonceKey: ${this.nonceKey}. Must be a non-negative integer.`);
        }

        // Funding configuration
        this.fundingStrategy = config.fundingStrategy || SmartAccount.FUNDING_STRATEGY.NO_FUND;
        this.targetBalance = config.targetBalance ? ethers.parseEther(config.targetBalance) : null;

        // Validate funding strategy
        const validStrategies = Object.values(SmartAccount.FUNDING_STRATEGY);
        if (!validStrategies.includes(this.fundingStrategy)) {
            throw new Error(`Invalid funding strategy: ${this.fundingStrategy}. Valid options: ${validStrategies.join(', ')}`);
        }

        if (this.fundingStrategy === SmartAccount.FUNDING_STRATEGY.FUND_WITH_THRESHOLD && !this.targetBalance) {
            throw new Error("targetBalance is required for 'fund-with-threshold' strategy");
        }

        // Gas price configuration
        this.gasPriceIncreasePercent = config.gasPriceIncreasePercent ?? 0;
        if (this.gasPriceIncreasePercent < 0 || this.gasPriceIncreasePercent > 200) {
            throw new Error("gasPriceIncreasePercent must be between 0 and 200");
        }

        // Transaction confirmation
        this.numberConfirmation = config.numberConfirmation ?? 1;
        if (!Number.isInteger(this.numberConfirmation) || this.numberConfirmation < 1) {
            throw new Error("numberConfirmation must be a positive integer");
        }

        // Verbose logging
        this.verbose = config.verbose !== undefined ? config.verbose : false;
    }

    /**
     * Initialize the smart account by calculating its address and checking deployment status.
     * This must be called before using any other methods.
     * @returns {Promise<Object>} Response with smart account address, deployment status, and chain info
     */
    async initialize() {
        try {
            // Get network info from provider
            const network = await this.provider.getNetwork();
            const detectedChainId = Number(network.chainId);

            // If user provided chainId, validate it matches
            if (this.configChainId && this.configChainId !== detectedChainId) {
                throw new Error(`Chain ID mismatch: RPC is on chain ${detectedChainId}, but config specified chain ${this.configChainId}`);
            }

            // Auto-configure chain settings if available
            if (CHAINS[detectedChainId]) {
                this.chain = CHAINS[detectedChainId];
                // Set factory and entryPoint if not manually overridden
                if (!this.factoryAddress) this.factoryAddress = this.chain.factoryAddress;
                if (!this.entryPointAddress) this.entryPointAddress = this.chain.entryPointAddress;
                utils.log(this.verbose, `Auto-configured for ${this.chain.name} (Chain ID: ${detectedChainId})`);
            } else {
                // Chain not in predefined list, use defaults or user-provided addresses
                if (!this.factoryAddress || !this.entryPointAddress) {
                    throw new Error(`Chain ID ${detectedChainId} is not supported. Please provide factoryAddress and entryPointAddress manually.`);
                }
                utils.log(this.verbose, `Using custom configuration for Chain ID: ${detectedChainId}`);
            }

            // Verify bundler URL supports ERC-4337
            const bundlerCheck = await utils.checkBundlerUrl(this.bundlerUrl, this.entryPointAddress);
            
            if (!bundlerCheck.isValid) {
                throw new Error(`Invalid bundler URL: ${bundlerCheck.error}`);
            }
            utils.log(this.verbose, "Bundler URL is valid and supports ERC-4337");

            // Calculate smart account address
            this.address = await utils.calculateAccountAddress(
                this.provider,
                this.factoryAddress,
                this.owner.address,
                this.salt
            );

            // Check if account is deployed
            this.accountExists = await utils.isAccountDeployed(this.provider, this.address);

            return createResponse(true, "success", {
                address: this.address,
                owner: this.owner.address,
                isDeployed: this.accountExists,
                salt: this.salt,
                nonceKey: this.nonceKey,
                chain: this.chain ? this.chain.name : null,
                chainId: this.chain ? this.chain.chainId : null
            });
        } catch (error) {
            return createResponse(false, error.message || "Initialization failed", null);
        }
    }

    // ════════════════════════════════════════════════════════════════════════════════
    // WRITE METHODS
    // ════════════════════════════════════════════════════════════════════════════════

    /**
     * Fund the smart account with ETH from the owner wallet
     * @param {string} _amount_in_eth - Amount of ETH to send (e.g., '0.1')
     * @returns {Promise<Object>} Response with transaction hash and funding details
     */
    async fund(_amount_in_eth) {
        try {
            if (!this.address) throw new Error("Call initialize() first");

            const tx = await this.owner.sendTransaction({
                to: this.address,
                value: ethers.parseEther(_amount_in_eth),
            });

            utils.log(this.verbose, "Waiting for funding transaction confirmation...");
            await tx.wait();

            return createResponse(true, "success", {
                txHash: tx.hash,
                amount: _amount_in_eth,
                amountWei: ethers.parseEther(_amount_in_eth).toString(),
                from: this.owner.address,
                to: this.address,
                explorerUrl: this.chain ? `${this.chain.explorer}/tx/${tx.hash}` : null
            });
        } catch (error) {
            return createResponse(false, error.message || "Funding failed", null);
        }
    }
    /**
     * Send a single transaction via ERC-4337 UserOperation.
     * Automatically handles account deployment if needed and applies the configured funding strategy.
     * @param {string} _to - Target contract address
     * @param {bigint} [_value=0n] - ETH value to send (default: 0n)
     * @param {string} [_data='0x'] - Encoded function call data (default: '0x')
     * @returns {Promise<Object>} Response with userOpHash, txHash, receipt, funding details, and explorer URLs
     */
    async sendTransaction(_to, _value = 0n, _data = "0x") {
        try {
            const callData = utils.encodeSingleCall(_to, _value, _data);

            const fundingTx = await this.#handleFunding(callData);

            const result = await this.#executeUserOp(callData);

            return createResponse(true, "success", {
                userOpHash: result.userOpHash,
                txHash: result.txHash,
                receipt: result.receipt,
                smartAccount: this.address,
                fundingTx: fundingTx || null,
                explorerUrl: this.chain ? `${this.chain.explorer}/tx/${result.txHash}` : null,
                userOpExplorerUrl: this.chain ? `${this.chain.jiffyscan}/userOpHash/${result.userOpHash}?network=${this.chain.name.toLowerCase().replace(" ", "-")}` : null
            });
        } catch (error) {
            return createResponse(false, error.message || "Transaction failed", null);
        }
    }
    /**
     * Send multiple transactions in a single batch via ERC-4337 UserOperation.
     * Automatically handles account deployment if needed and applies the configured funding strategy.
     * More gas-efficient than multiple individual transactions.
     * @param {Array<{to: string, value: bigint, data: string}>} _transactions - Array of transaction objects
     * @returns {Promise<Object>} Response with userOpHash, txHash, receipt, batch size, funding details, and explorer URLs
     */
    async sendBatch(_transactions) {
        try {
            const callData = utils.encodeBatchCall(_transactions);

            const fundingTx = await this.#handleFunding(callData);

            const result = await this.#executeUserOp(callData);

            return createResponse(true, "success", {
                userOpHash: result.userOpHash,
                txHash: result.txHash,
                receipt: result.receipt,
                smartAccount: this.address,
                batchSize: _transactions.length,
                fundingTx: fundingTx || null,
                explorerUrl: this.chain ? `${this.chain.explorer}/tx/${result.txHash}` : null,
                userOpExplorerUrl: this.chain ? `${this.chain.jiffyscan}/userOpHash/${result.userOpHash}?network=${this.chain.name.toLowerCase().replace(" ", "-")}` : null
            });
        } catch (error) {
            return createResponse(false, error.message || "Batch transaction failed", null);
        }
    }

    // ════════════════════════════════════════════════════════════════════════════════
    // VIEW METHODS
    // ════════════════════════════════════════════════════════════════════════════════

    /**
     * Get the current ETH balance of the smart account
     * @returns {Promise<Object>} Response with balance in both wei (string) and ETH (formatted string)
     * @throws {Error} If initialize() has not been called first
     */
    async getBalance() {
        try {
            if (!this.address) throw new Error("Call initialize() first");

            const balance = await this.provider.getBalance(this.address);

            return createResponse(true, "success", {
                balance: balance.toString(),
                balanceEth: ethers.formatEther(balance),
                address: this.address
            });
        } catch (error) {
            return createResponse(false, error.message || "Failed to get balance", null);
        }
    }

    /**
     * Get the current smart account address
     * @returns {Promise<Object>} Response with the smart account address, owner, deployment status, and salt
     * @throws {Error} If initialize() has not been called first
     */
    async getAddress() {
        try {
            if (!this.address) throw new Error("Call initialize() first");

            return createResponse(true, "success", {
                address: this.address,
                owner: this.owner.address,
                isDeployed: this.accountExists,
                salt: this.salt,
                nonceKey: this.nonceKey
            });
        } catch (error) {
            return createResponse(false, error.message || "Failed to get address", null);
        }
    }

    /**
     * Estimate the gas cost for a transaction without executing it.
     * Includes a 20% safety buffer on top of the base estimation.
     * @param {string} _callData - Encoded call data (use encodeSingleCall or encodeBatchCall)
     * @returns {Promise<Object>} Response with estimated cost in wei and ETH (base + 20% buffer)
     */
    async estimateCost(_callData) {
        try {
            const userOp = await this.#createUserOp(_callData, !this.accountExists);

            const callGasLimit = BigInt(userOp.callGasLimit);
            const verificationGasLimit = BigInt(userOp.verificationGasLimit);
            const preVerificationGas = BigInt(userOp.preVerificationGas);
            const maxFeePerGas = BigInt(userOp.maxFeePerGas);

            const totalGas = callGasLimit + verificationGasLimit + preVerificationGas;
            const estimatedCost = totalGas * maxFeePerGas;

            // Add 20% buffer for safety
            const costWithBuffer = (estimatedCost * 120n) / 100n;

            return createResponse(true, "success", {
                estimatedCost: estimatedCost.toString(),
                estimatedCostEth: ethers.formatEther(estimatedCost),
                costWithBuffer: costWithBuffer.toString(),
                costWithBufferEth: ethers.formatEther(costWithBuffer),
                bufferPercentage: 20
            });
        } catch (error) {
            return createResponse(false, error.message || "Cost estimation failed", null);
        }
    }
    /**
     * Encode a contract function call into a transaction object for use with sendBatch.
     * Helper method to prepare transaction data for batch operations.
     * @param {string} _contract_address - Target contract address
     * @param {Array} _abi - Contract ABI (array of function definitions)
     * @param {string} _function_name - Function name to call (e.g., 'transfer')
     * @param {Array} _args - Function arguments in order
     * @param {bigint} [_value=0n] - ETH value to send with the call (default: 0n)
     * @returns {{to: string, value: bigint, data: string}} Transaction object ready for sendBatch
     * 
     * @example
     * const call = smartAccount.encodeCall(
     *   '0x123...', 
     *   ERC20_ABI, 
     *   'transfer', 
     *   ['0xRecipient...', ethers.parseEther('10')]
     * );
     */
    encodeCall(_contract_address, _abi, _function_name, _args, _value = 0n) {
        const iface = new ethers.Interface(_abi);
        const data = iface.encodeFunctionData(_function_name, _args);
        return { to: _contract_address, value: _value, data };
    }

    // ════════════════════════════════════════════════════════════════════════════════
    // INTERNAL METHODS
    // ════════════════════════════════════════════════════════════════════════════════

    /**
     * Handle funding based on strategy
     * - no-fund: Do nothing, throws error if insufficient
     * - fund-per-tx: Fund exact amount needed for transaction
     * - fund-with-threshold: Maintain target balance
     */
    async #handleFunding(_callData) {
        if (!this.address) throw new Error("Call initialize() first");

        const balance = await this.provider.getBalance(this.address);

        if (this.fundingStrategy === SmartAccount.FUNDING_STRATEGY.NO_FUND) {
            // Pre-check balance if no automatic funding
            const estimatedCostResponse = await this.estimateCost(_callData);
            if (estimatedCostResponse.success && estimatedCostResponse.data) {
                const estimatedCost = BigInt(estimatedCostResponse.data.costWithBuffer);
                if (balance < estimatedCost) {
                    const shortfall = ethers.formatEther(estimatedCost - balance);
                    throw new Error(`Insufficient balance: account has ${ethers.formatEther(balance)} ETH, needs approximately ${ethers.formatEther(estimatedCost)} ETH (shortfall: ${shortfall} ETH)`);
                }
            }
            return null; // No automatic funding
        }

        const estimatedCostResponse = await this.estimateCost(_callData);
        
        // If estimation failed, skip automatic funding
        if (!estimatedCostResponse.success || !estimatedCostResponse.data) {
            utils.log(this.verbose, `Warning: Cost estimation failed, skipping automatic funding`);
            return null;
        }
        
        const estimatedCost = BigInt(estimatedCostResponse.data.costWithBuffer);

        if (this.fundingStrategy === SmartAccount.FUNDING_STRATEGY.FUND_PER_TX) {
            // Fund exact amount needed for this transaction
            if (balance < estimatedCost) {
                const needed = estimatedCost - balance;
                const amountToFund = ethers.formatEther(needed);

                utils.log(this.verbose, "Insufficient balance detected, funding account...");
                const fundingResult = await this.fund(amountToFund);
                return fundingResult.data.txHash;
            }
        } else if (this.fundingStrategy === SmartAccount.FUNDING_STRATEGY.FUND_WITH_THRESHOLD) {
            // Maintain target balance
            if (balance < estimatedCost) {
                const amountToFund = ethers.formatEther(this.targetBalance);

                utils.log(this.verbose, "Balance below threshold, refilling to target...");
                const fundingResult = await this.fund(amountToFund);
                return fundingResult.data.txHash;
            }
        }

        return null; // No funding needed
    }

    /**
     * Execute UserOperation (internal)
     */
    async #executeUserOp(_callData) {
        utils.log(this.verbose, "Preparing UserOperation...");

        const userOp = await this.#createUserOp(_callData, !this.accountExists);

        const chainId = (await this.provider.getNetwork()).chainId;
        const signature = await utils.signUserOp(
            userOp,
            this.entryPointAddress,
            chainId,
            this.owner
        );
        userOp.signature = signature;

        utils.log(this.verbose, "Sending UserOperation to bundler...");
        const userOpHash = await utils.sendUserOp(
            this.bundlerUrl,
            userOp,
            this.entryPointAddress
        );

        utils.log(this.verbose, "Waiting for transaction confirmation...");
        const receipt = await utils.waitForUserOpReceipt(this.bundlerUrl, userOpHash);

        // Check if UserOp execution was successful
        if (receipt.success !== true) {
            throw new Error(`UserOperation failed with reason: ${receipt.reason || 'Unknown error'}`);
        }

        // Wait for additional confirmations if configured
        if (this.numberConfirmation > 1) {
            utils.log(this.verbose, `Waiting for ${this.numberConfirmation - 1} additional confirmation(s)...`);
            const txReceipt = await this.provider.getTransactionReceipt(receipt.receipt.transactionHash);
            const confirmations = this.numberConfirmation - 1;
            await this.provider.waitForTransaction(receipt.receipt.transactionHash, confirmations);
            utils.log(this.verbose, `Transaction confirmed with ${this.numberConfirmation} confirmation(s)`);
        }

        // Once mined, account exists
        this.accountExists = true;

        return {
            userOpHash,
            txHash: receipt.receipt.transactionHash,
            receipt,
        };
    }

    /**
     * Create UserOperation with gas estimation (internal)
     */
    async #createUserOp(_callData, _isNewAccount) {
        // Get nonce with the configured nonceKey
        const nonce = await utils.getNonce(
            this.provider,
            this.entryPointAddress,
            this.address,
            this.nonceKey // Pass the nonceKey here
        );

        // Create initCode only if account doesn't exist yet
        const initCode = _isNewAccount
            ? utils.createInitCode(this.factoryAddress, this.owner.address, this.salt)
            : "0x";

        // Use standard gas calculation from utils
        const gasPriceResponse = await calculateGasPrice(
            this.rpcUrl,
            this.gasPriceIncreasePercent,
            true // Always use EIP-1559 for ERC-4337
        );

        if (!gasPriceResponse.success) {
            throw new Error(`Failed to calculate gas price: ${gasPriceResponse.message}`);
        }

        const maxFeePerGas = ethers.parseUnits(gasPriceResponse.data.maxFee, 'gwei');
        const maxPriorityFeePerGas = ethers.parseUnits(gasPriceResponse.data.maxPriorityFee, 'gwei');

        // Ensure minimum priority fee for bundler (0.1 gwei)
        const minPriorityFee = ethers.parseUnits('0.1', 'gwei');
        const finalPriorityFee = maxPriorityFeePerGas > minPriorityFee ? maxPriorityFeePerGas : minPriorityFee;

        // Create temporary UserOp for gas estimation
        const tempUserOp = {
            sender: this.address,
            nonce: "0x" + nonce.toString(16),
            initCode,
            callData: _callData,
            callGasLimit: "0x0",
            verificationGasLimit: "0x0",
            preVerificationGas: "0x0",
            maxFeePerGas: "0x" + maxFeePerGas.toString(16),
            maxPriorityFeePerGas: "0x" + finalPriorityFee.toString(16),
            paymasterAndData: "0x",
            signature: "0x" + "00".repeat(65),
        };

        // Estimate gas
        const gasEstimates = await utils.estimateUserOpGas(
            this.bundlerUrl,
            tempUserOp,
            this.entryPointAddress
        );

        // For existing accounts, use fixed verificationGasLimit for better efficiency
        const verificationGasLimit = _isNewAccount
            ? BigInt(gasEstimates.verificationGasLimit)
            : 75000n;

        return {
            sender: this.address,
            nonce: "0x" + nonce.toString(16),
            initCode,
            callData: _callData,
            callGasLimit: "0x" + BigInt(gasEstimates.callGasLimit).toString(16),
            verificationGasLimit: "0x" + verificationGasLimit.toString(16),
            preVerificationGas: "0x" + BigInt(gasEstimates.preVerificationGas).toString(16),
            maxFeePerGas: "0x" + maxFeePerGas.toString(16),
            maxPriorityFeePerGas: "0x" + finalPriorityFee.toString(16),
            paymasterAndData: "0x",
            signature: "0x",
        };
    }
}