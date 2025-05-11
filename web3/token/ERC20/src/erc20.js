import fs from 'fs';
import { ethers } from 'ethers';
import { estimateGasLimit, calculateGasPrice } from '../../../../utils/src/gas.utils.js';
import { createResponse } from '../../../../utils/src/response.utils.js';
import { getTxGasOptions } from '../../../../utils/src/tx.utils.js';
import { resolveSigner } from '../../../../utils/src/ethers.utils.js';

const erc20Abi = JSON.parse(fs.readFileSync(new URL('../../../../abi/ERC20.json', import.meta.url)));
/**
 * @class ERC20
 * @description A utility class for interacting with ERC20 tokens on the Ethereum blockchain. 
 * Provides methods for querying token details, balances, allowances, and performing transactions 
 * such as approvals and transfers.
 */
export class ERC20 {
    /**
     * @constructor
     * @param {string|ethers.Signer} _signerOrKey - A private key as a string or an ethers Signer object.
     * @param {string|null} [_rpcProvider=null] - The RPC provider URL. Required if a private key is provided.
     * @param {number} [_numberConfirmation=1] - The number of confirmations required for transactions.
     * @param {boolean} [_EIP1559=true] - Indicates whether to use EIP-1559 transaction format.
     * @throws {Error} If neither a valid private key with a provider nor a Signer object is provided.
     */
    constructor(_signerOrKey, _rpcProvider = null, _numberConfirmation = 1, _EIP1559 = true) {
        this.signer = resolveSigner(_signerOrKey, _rpcProvider);
        this.rpcProvider = _rpcProvider || (this.signer.provider ? this.signer.provider.connection.url : null);
        this.erc20Abi = erc20Abi;
        this.numberConfirmation = _numberConfirmation;
        this.EIP1559 = _EIP1559;
    }
    /**
     * @async
     * @method name
     * @description Retrieves the name of the ERC20 token.
     * @param {string} _token - The address of the ERC20 token contract.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the token name.
     */
    async name(_token) {
        try {
            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const response = await contract.name();
            return createResponse(true, 'success', response, 'ERC20.name');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to get name',
                null,
                'ERC20.name'
            );
        }
    }
    /**
     * @async
     * @method symbol
     * @description Retrieves the symbol of the ERC20 token.
     * @param {string} _token - The address of the ERC20 token contract.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the token symbol.
     */
    async symbol(_token) {
        try {
            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const response = await contract.symbol();
            return createResponse(true, 'success', response, 'ERC20.symbol');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to get symbol',
                null,
                'ERC20.symbol'
            );
        }
    }
    /**
     * @async
     * @method decimals
     * @description Retrieves the number of decimals used by the ERC20 token.
     * @param {string} _token - The address of the ERC20 token contract.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the token decimals.
     */
    async decimals(_token) {
        try {
            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const response = await contract.decimals();
            return createResponse(true, 'success', response, 'ERC20.decimals');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to get decimals',
                null,
                'ERC20.decimals'
            );
        }
    }
    /**
     * @async
     * @method allowance
     * @description Retrieves the remaining number of tokens that the spender is allowed to spend 
     * on behalf of the owner for the specified ERC20 token.
     * @param {string} _token - The address of the ERC20 token contract.
     * @param {string} _owner - The address of the token owner.
     * @param {string} _spender - The address of the spender.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the allowance amount.
     */
    async allowance(_token, _owner, _spender) {
        try {
            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const response = await contract.allowance(_owner, _spender);
            return createResponse(true, 'success', response, 'ERC20.allowance');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to get allowance',
                null,
                'ERC20.allowance'
            );
        }
    }
    /**
     * @async
     * @method balanceOf
     * @description Retrieves the balance of the specified account for the given ERC20 token.
     * @param {string} _token - The address of the ERC20 token contract.
     * @param {string} _account - The address of the account whose balance is to be retrieved.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the account balance.
     */
    async balanceOf(_token, _account) {
        try {
            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const response = await contract.balanceOf(_account);
            return createResponse(true, 'success', response, 'ERC20.balanceOf');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to get balance',
                null,
                'ERC20.balanceOf'
            );
        }
    }
    /**
     * @async
     * @method feApprove
     * @description Approves the specified spender to spend a certain amount of tokens on behalf of the caller.
     * @param {string} _token - The address of the ERC20 token contract.
     * @param {string} _amount - The amount of tokens to approve.
     * @param {string} _spender - The address of the spender.
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the transaction hash.
     */
    async feApprove(_token, _amount, _spender) {
        try {
            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const tx = await contract.approve(_spender, _amount);
            await tx.wait(this.numberConfirmation);
            return createResponse(true, 'success', tx.hash, 'ERC20.feApprove');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to approve',
                null,
                'ERC20.feApprove'
            );
        }
    }
    /**
     * @async
     * @method bkApprove
     * @description Approves the specified spender to spend a certain amount of tokens on behalf of the caller, 
     * with customizable gas price and gas price increase percentage.
     * @param {string} _token - The address of the ERC20 token contract.
     * @param {string} _amount - The amount of tokens to approve.
     * @param {string} _spender - The address of the spender.
     * @param {number} [_gasPriceIncreasePercent=0] - The percentage by which to increase the gas price (optional).
     * @param {string|undefined} [_gasPrice=undefined] - The custom gas price in gwei (optional).
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the transaction hash.
     */
    async bkApprove(_token, _amount, _spender, _gasPriceIncreasePercent = 0, _gasPrice = undefined) { 
        try {
            let gasPrice;
            if (_gasPrice) {
                gasPrice = ethers.parseUnits(_gasPrice, 'gwei');
            } else {
                gasPrice = await calculateGasPrice(this.rpcProvider, _gasPriceIncreasePercent, this.EIP1559);
                if (!gasPrice.success) {
                    return createResponse(
                        false,
                        gasPrice.message,
                        gasPrice.data,
                        `ERC20.bkApprove -- ${gasPrice.source}`
                    );
                }
            }

            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const gasLimit = await estimateGasLimit(contract, 'approve', [_spender, _amount]);
            if (!gasLimit.success) {
                return createResponse(
                    false,
                    gasLimit.message,
                    gasLimit.data,
                    `ERC20.bkApprove -- ${gasLimit.source}`
                );
            }

            const txGasOptions = getTxGasOptions(this.EIP1559, gasLimit, gasPrice);
            const tx = await contract.approve(_spender, _amount, txGasOptions);
            await tx.wait(this.numberConfirmation);

            return createResponse(true, 'success', { hash: tx.hash }, 'ERC20.bkApprove');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to approve',
                null,
                'ERC20.bkApprove'
            );
        }
    }
    /**
     * @async
     * @method bkTransfer
     * @description Transfers a specified amount of tokens to a recipient address, with customizable gas price 
     * and gas price increase percentage.
     * @param {string} _token - The address of the ERC20 token contract.
     * @param {string} _to - The address of the recipient.
     * @param {string} _amount - The amount of tokens to transfer.
     * @param {number} [_gasPriceIncreasePercent=0] - The percentage by which to increase the gas price (optional).
     * @param {string|undefined} [_gasPrice=undefined] - The custom gas price in gwei (optional).
     * @returns {Promise<Object>} A Promise that resolves with a response object containing the transaction hash.
     */
    async bkTransfer(_token, _to, _amount, _gasPriceIncreasePercent = 0, _gasPrice = undefined) { 
        try {
            let gasPrice;
            if (_gasPrice) {
                gasPrice = ethers.parseUnits(_gasPrice, 'gwei');
            } else {
                gasPrice = await calculateGasPrice(this.rpcProvider, _gasPriceIncreasePercent, this.EIP1559);
                if (!gasPrice.success) {
                    return createResponse(
                        false,
                        gasPrice.message,
                        gasPrice.data,
                        `ERC20.bkTransfer -- ${gasPrice.source}`
                    );
                }
            }
    
            const contract = new ethers.Contract(_token, this.erc20Abi, this.signer);
            const gasLimit = await estimateGasLimit(contract, 'transfer', [_to, _amount]);
            if (!gasLimit.success) {
                return createResponse(
                    false,
                    gasLimit.message,
                    gasLimit.data,
                    `ERC20.bkTransfer -- ${gasLimit.source}`
                );
            }
    
            const txGasOptions = getTxGasOptions(this.EIP1559, gasLimit, gasPrice);
            const tx = await contract.transfer(_to, _amount, txGasOptions);
            await tx.wait(this.numberConfirmation);
    
            return createResponse(true, 'success', { hash: tx.hash }, 'ERC20.bkTransfer');
        } catch (error) {
            return createResponse(
                false,
                error.message || 'Failed to transfer tokens',
                null,
                'ERC20.bkTransfer'
            );
        }
    }    
}