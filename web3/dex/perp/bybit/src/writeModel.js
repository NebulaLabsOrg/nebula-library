import {v4 as uuidv4} from 'uuid';
import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetMaketOrderSize } from './viewModel.js';
import { bybitEnum } from './bybit.enum.js';

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
        return createResponse(false, error.message, null, 'bybit.setInternalTransfer');
    }
}

/**
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

        let qty = parseFloat(_orderQty);
        if (_marketUnit === bybitEnum.position.quoteOnSecCoin) {
            const marketData = await _restClientV5.getTickers({ category: 'linear', symbol: _symbol });
            const lastPrice = parseFloat(marketData?.result?.list[0]?.lastPrice);
            if (!lastPrice) return createResponse(false, 'No last price', null, 'bybit.submitMarketOrder');
            qty = qty / lastPrice;
        }

        const qtyStep = parseFloat(marketOrderSize.data.qtyStep);
        qty = Math.floor(qty / qtyStep) * qtyStep;
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
            ? createResponse(true, 'success', response.result.orderId, 'bybit.submitMarketOrder')
            : createResponse(false, response.retMsg, null, 'bybit.submitMarketOrder');
    } catch (error) {
        return createResponse(false, error.message, null, 'bybit.submitMarketOrder');
    }
}
