import {v4 as uuidv4} from 'uuid';
import { createResponse } from '../../../../utils/src/response.utils.js';
import { vmGetMaketOrderSize, vmGetMarketData, vmGetOpenPositionDetail, vmGetOutWithdrawableAmount } from './viewModel.js';
import { bybitEnum } from './enum.js';
import { getBybitChainName } from './utils.js';

/**
 * @async
 * @function wmSetInternalTranfer
 * @description Executes an internal transfer between two Bybit accounts.
 *
 * This function creates an internal transfer of a specified coin and amount between two accounts
 * (either transferring in or out), with the option to transfer the entire available balance.
 *
 * @param {Object} _restClientV5 - The Bybit API client instance.
 * @param {string} _settleCoin - The coin symbol to transfer (e.g., 'BTC').
 * @param {string} _inAcc - The account type to transfer into.
 * @param {string} _outAcc - The account type to transfer out from.
 * @param {string} _to - Direction of transfer, based on bybitEnum.TransfertToOut.
 * @param {number} _amount - The amount to transfer.
 * @param {boolean} _transferAll - If true, transfers the entire available balance.
 * @returns {Object} Response object indicating success or failure of the transfer.
 */
export async function wmSetInternalTranfer(_restClientV5, _settleCoin, _inAcc, _outAcc, _to, _amount, _transferAll) {
    try {
        const transferId = uuidv4();
        const from = _to === bybitEnum.transfer.toOut ? _inAcc : _outAcc;
        const toAcc = _to === bybitEnum.transfer.toOut ? _outAcc : _inAcc;

        let transferAmount = _amount;

        if (_transferAll) {
            const balanceRes = await _restClientV5.getAllCoinsBalance({ accountType: from, coin: _settleCoin });
            if (balanceRes.retCode !== 0) {
                return createResponse(false, balanceRes.retMsg, null, 'bybit.setInternalTransfer');
            }
            transferAmount = balanceRes.result.balance[0].transferBalance;
        }

        if (transferAmount <= 0) {
            return createResponse(false, 'No amount to transfer / amount value', null, 'bybit.setInternalTransfer');
        }

        const response = await _restClientV5.createInternalTransfer(
            transferId,
            _settleCoin,
            transferAmount,
            from,
            toAcc,
        );
        return response.retCode === 0 || response.result.status === 'SUCCESS'
            ? createResponse(true, 'success', {coin: _settleCoin, amount: transferAmount, from: from, to: toAcc, transferId: response.result.transferId}, 'bybit.setInternalTransfer')
            : createResponse(false, response.retMsg, null, 'bybit.setInternalTransfer');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to set internal transfer';
        return createResponse(false, message, null, 'bybit.setInternalTransfer');
    }
}
/**
 * @async
 * @function wmSubmitMarketOrder
 * @description Submits a market order to Bybit using the provided REST client.
 *
 * This function sends a market order for a specified symbol, side, market unit, and quantity,
 * with a defined slippage tolerance. It returns a response object indicating the success or failure
 * of the order submission.
 *
 * @param {Object} _restClientV5 - The Bybit API client instance.
 * @param {number|string} _slippage - The slippage tolerance for the order (as percent).
 * @param {string} _symbol - The trading symbol (e.g., 'BTCUSDT').
 * @param {string} _side - The order side ('Buy' or 'Sell').
 * @param {string} _marketUnit - The market unit for the order (e.g., 'base' or 'quote').
 * @param {number|string} _orderQty - The quantity to order.
 * @returns {Object} Response object indicating success or failure of the market order submission.
 */
export async function wmSubmitMarketOrder(_restClientV5, _slippage, _symbol, _side, _marketUnit, _orderQty) {
    try {
        const marketOrderSize = await vmGetMaketOrderSize(_restClientV5, _symbol);
        if (!marketOrderSize.success)
            return createResponse(false, marketOrderSize.message, null, 'bybit.submitMarketOrder');

        // Parse the order quantity as a float
        let qty = parseFloat(_orderQty);

        // If the market unit is quoted in the secondary coin, convert the quantity to base units using the last price
        if (_marketUnit === bybitEnum.order.quoteOnSecCoin) {
            // Usa vmGetMarketData invece di getTickers e prendi avgPrice
            const marketData = await vmGetMarketData(_restClientV5, _symbol);
            const lastPrice = parseFloat(marketData?.data?.list[0].lastPrice);
            if (!lastPrice)
            return createResponse(false, 'No price', null, 'bybit.submitMarketOrder');
            qty = qty / lastPrice;
        }

        // Adjust the quantity to the nearest valid step size
        const qtyStep = parseFloat(marketOrderSize.data.qtyStep);
        qty = Math.floor(qty / qtyStep) * qtyStep;

        // Format the quantity to the correct number of decimal places based on the step size
        const stepDecimals = (qtyStep.toString().split('.')[1] || '').length;
        qty = qty.toFixed(stepDecimals);

        if (parseFloat(qty) < marketOrderSize.data.minOrderQty)
            return createResponse(false, `Order quantity must be greater than ${marketOrderSize.data.minOrderQty}`, null, 'bybit.submitMarketOrder');

        const response = await _restClientV5.submitOrder({
            category: 'linear',
            symbol: _symbol,
            side: _side,
            orderType: 'Market',
            qty,
            marketUnit: _marketUnit,
            timeInForce: 'IOC',
            slippageToleranceType: 'Percent',
            slippageTolerance: _slippage.toString(),
        });

        return response.retCode === 0
            ? createResponse(true, 'success', {symbol: _symbol, orderId: response.result.orderId}, 'bybit.submitMarketOrder')
            : createResponse(false, response.retMsg, null, 'bybit.submitMarketOrder');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to submit market order';
        return createResponse(false, message, null, 'bybit.submitMarketOrder');
    }
}
/**
 * @async
 * @function wmSubmitCancelOrder
 * @description Submits a cancel order request to Bybit using the provided REST client.
 *
 * This function attempts to cancel an existing order for a specified symbol and order ID
 * on Bybit's linear contract market. It returns a response object indicating the success
 * or failure of the cancellation request.
 *
 * @param {Object} _restClientV5 - The Bybit API client instance.
 * @param {string} _symbol - The trading symbol (e.g., 'BTCUSDT').
 * @param {string} _orderId - The unique identifier of the order to cancel.
 * @returns {Object} Response object indicating success or failure of the cancel order request.
 */
export async function wmSubmitCancelOrder(_restClientV5, _symbol, _orderId) {
    try {
        const response = await _restClientV5.cancelOrder({
            category: 'linear',
            symbol: _symbol,
            orderId: _orderId,
        });

        return response.retCode === 0
            ? createResponse(true, 'success', {symbol: _symbol, orderId: response.result.orderId}, 'bybit.submitCancelOrder')
            : createResponse(false, response.retMsg, null, 'bybit.submitCancelOrder');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to cancel order';
        return createResponse(false, message, null, 'bybit.submitCancelOrder');
    }
}
/**
 * @function wmSubmitCloseMarketOrder
 * @description Submits a market order to close an open position on Bybit, either fully or partially, with support for market unit conversion and slippage tolerance.
 *
 * @param {Object} _restClientV5 - The Bybit API client instance.
 * @param {string} _settleCoin - The settlement coin (e.g., 'USDT').
 * @param {number|string} _slippage - The slippage tolerance for the order (as percent).
 * @param {string} _symbol - The trading symbol (e.g., 'BTCUSDT').
 * @param {number|string} _orderQty - The quantity to close (ignored if _closeAll is true).
 * @param {string} _marketUnit - The market unit for the order (e.g., 'base' or 'quote').
 * @param {boolean} _closeAll - If true, closes the entire position.
 * @returns {Object} Response object indicating success or failure of the close order.
 */
export async function wmSubmitCloseMarketOrder(_restClientV5, _settleCoin, _slippage, _symbol, _orderQty, _marketUnit, _closeAll) {
    try {
        // Get current position info using vmGetOpenPositionDetail
        const posRes = await vmGetOpenPositionDetail(_restClientV5, _settleCoin, _symbol);
        if (!posRes.success || !posRes.data)
            return createResponse(false, posRes.message || 'No open position found', null, 'bybit.submitCloseMarketOrder');
        const position = posRes.data;
        const positionSide = position.side; // 'Buy' or 'Sell'
        const closeSide = positionSide === bybitEnum.order.long ? bybitEnum.order.short : bybitEnum.order.long;
        const positionQty = Math.abs(parseFloat(position.qty));

        if (positionQty === 0)
            return createResponse(false, 'Position size is zero', null, 'bybit.submitCloseMarketOrder');

        // Get market order size info
        const marketOrderSize = await vmGetMaketOrderSize(_restClientV5, _symbol);
        if (!marketOrderSize.success)
            return createResponse(false, marketOrderSize.message, null, 'bybit.submitCloseMarketOrder');

        // Determine qty to close
        let qty;
        if (_closeAll) {
            qty = positionQty;
        } else {
            qty = parseFloat(_orderQty);
            // If the market unit is quoted in the secondary coin, convert the quantity to base units using the last price
            if (_marketUnit === bybitEnum.order.quoteOnSecCoin) {
                // Usa vmGetMarketData invece di getTickers e prendi avgPrice
                const marketData = await vmGetMarketData(_restClientV5, _symbol);
                const lastPrice = parseFloat(marketData?.data?.list[0].lastPrice);
                if (!lastPrice)
                    return createResponse(false, 'No price', null, 'bybit.submitCloseMarketOrder');
                qty = qty / lastPrice;
            }
            if (qty > positionQty) qty = positionQty;
        }

        // Adjust qty to step size
        const qtyStep = parseFloat(marketOrderSize.data.qtyStep);
        qty = Math.floor(qty / qtyStep) * qtyStep;

        // Format the quantity to the correct number of decimal places based on the step size
        const stepDecimals = (qtyStep.toString().split('.')[1] || '').length;
        qty = qty.toFixed(stepDecimals);

        if (parseFloat(qty) < marketOrderSize.data.minOrderQty)
            return createResponse(false, `Order quantity must be greater than ${marketOrderSize.data.minOrderQty}`, null, 'bybit.submitCloseMarketOrder');

        // Submit market order to close position
        const response = await _restClientV5.submitOrder({
            category: 'linear',
            symbol: _symbol,
            side: closeSide,
            orderType: 'Market',
            qty,
            marketUnit: _marketUnit,
            timeInForce: 'IOC',
            slippageToleranceType: 'Percent',
            slippageTolerance: _slippage.toString(),
            reduceOnly: true
        });

        return response.retCode === 0
            ? createResponse(true, 'success', {symbol: _symbol, orderId: response.result.orderId, closedQty: qty}, 'bybit.submitCloseMarketOrder')
            : createResponse(false, response.retMsg, null, 'bybit.submitCloseMarketOrder');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to submit close market order';
        return createResponse(false, message, null, 'bybit.submitCloseMarketOrder');
    }
}
/**
 * @async
 * @function wmSubmitWihdraw
 * @description Submits a withdrawal request to Bybit for a specified coin, chain, and address.
 *
 * This function initiates a withdrawal from the Bybit account to an external address. It supports withdrawing a specific amount or the entire available withdrawable balance.
 *
 * @param {Object} _restClientV5 - The Bybit API client instance.
 * @param {string} _settleCoin - The coin symbol to withdraw (e.g., 'USDT').
 * @param {string} _chain - The blockchain network to use for withdrawal (e.g., 'ETH', 'TRX').
 * @param {number|string} _amount - The amount to withdraw.
 * @param {string} _address - The destination address for the withdrawal.
 * @param {boolean} [_withdrawAll=false] - If true, withdraws the entire available balance.
 * @returns {Object} Response object indicating success or failure of the withdrawal request.
 */
export async function wmSubmitWihdraw(_restClientV5, _settleCoin, _chain, _amount, _address, _withdrawAll = false) {
    try {
        const chain = getBybitChainName(_settleCoin, _chain);
        if (chain && chain.success === false) {
            return createResponse(false, chain.message || 'Invalid chain', null, 'bybit.submitWithdraw');
        }

        // Get withdrawable amount
        const withdrawableRes = await vmGetOutWithdrawableAmount(_restClientV5, _settleCoin);
        if (!withdrawableRes.success) {
            return createResponse(false, withdrawableRes.message || 'Unable to fetch withdrawable amount', null, 'bybit.submitWithdraw');
        }
        const withdrawableAmount = parseFloat(withdrawableRes.data.withdrawableAmount);

        let amount = parseFloat(_amount);
        if (_withdrawAll) {
            amount = withdrawableAmount;
        } else if (amount > withdrawableAmount) {
            return createResponse(false, `Requested amount exceeds withdrawable amount (${withdrawableAmount})`, null, 'bybit.submitWithdraw');
        }

        if (amount <= 0) {
            return createResponse(false, 'No amount to withdraw', null, 'bybit.submitWithdraw');
        }

        const response = await _restClientV5.submitWithdrawal({
            coin: _settleCoin.toUpperCase(),
            chain: chain.chainName.toUpperCase(),
            address: _address,
            amount: amount.toString(),
            timestamp: Date.now(),
            forceChain: 0,
            accountType: 'FUND',
            feeType: 1,
        });

        return response.retCode === 0
            ? createResponse(true, 'success', {coin: _settleCoin, id: response.result.id} , 'bybit.submitWithdraw')
            : createResponse(false, response.retMsg, null, 'bybit.submitWithdraw');
    } catch (error) {
        const message = error.response?.data?.message || error.message || 'Failed to submit withdrawal';
        return createResponse(false, message, null, 'bybit.submitWithdraw');
    }
}