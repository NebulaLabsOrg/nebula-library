import { createResponse } from '../../../../../utils/src/response.utils.js';
import { extendedEnum } from './enum.js';

/**
 * @async
 * @function wmSubmitOrder
 * @description Submits order using Python SDK internally but maintains same response format
 * @param {Function} callPythonService - Configured Python service method
 * @param {number} _slippage - The allowed slippage percentage for market orders.
 * @param {Object} _account - The user's account object containing vault number and Stark key information.
 * @param {string} _type - The order type (e.g., market or limit).
 * @param {string} _symbol - The market symbol for which to submit the order.
 * @param {string} _side - The order side (e.g., long or short).
 * @param {string} _marketUnit - The unit in which the order quantity is specified.
 * @param {number|string} _orderQty - The quantity of the order to submit.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the order ID and symbol, or an error message.
 */
export async function wmSubmitOrder(callPythonService, _slippage, _account, _type, _symbol, _side, _marketUnit, _orderQty) {
    try {
        // Usa il servizio Python già configurato
        // Converti i parametri al formato Python SDK
        const pythonSide = _side === extendedEnum.order.long ? "BUY" : "SELL";
        const pythonType = _type === extendedEnum.order.type.market ? "MARKET" : "LIMIT";
        
        // Calcola il prezzo per ordini limit (per market sarà ignorato)
        let price = "0"; // Default per market orders
        if (_type === extendedEnum.order.type.limit) {
            // Per ora usiamo un prezzo di mercato, in futuro si può migliorare
            try {
                const marketData = await extendedInstance._callPythonService('get_market_data', {
                    market_name: _symbol
                });
                price = marketData.mark_price || marketData.last_price || "50000"; // Fallback
            } catch (error) {
                price = "50000"; // Fallback price
            }
        }
        
        // Converti quantity se necessario
        let amount = _orderQty.toString();
        
        // Piazza l'ordine usando il servizio Python
        const orderResult = await extendedInstance._callPythonService('place_order', {
            market_name: _symbol,
            side: pythonSide,
            amount: amount,
            price: price,
            order_type: pythonType,
            time_in_force: "GTC"
        });
        
        if (orderResult.success) {
            // Formato risposta compatibile con Extended originale
            return createResponse(true, 'success', { 
                symbol: _symbol, 
                orderId: orderResult.order.id || crypto.randomUUID() 
            }, 'extended.submitOrder');
        } else {
            return createResponse(false, orderResult.error || 'Failed to place order', null, 'extended.submitOrder');
        }
    } catch (error) {
        const message = error.message || 'Failed to submit order';
        return createResponse(
            false,
            message,
            null,
            'extended.submitOrder'
        );
    }
}

/**
 * Cancels an existing order using Python SDK
 *
 * @async
 * @function wmSubmitCancelOrder
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {string|number} _orderId - The unique identifier of the order to cancel.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the order ID on success, or an error message on failure.
 */
export async function wmSubmitCancelOrder(extendedInstance, _orderId) {
    try {
        // Usa il servizio Python configurato nell'istanza Extended
        const cancelResult = await extendedInstance._callPythonService('cancel_order', {
            order_id: _orderId.toString()
        });
        
        if (cancelResult.success) {
            return createResponse(true, 'success', { orderId: _orderId }, 'extended.submitCancelOrder');
        } else {
            return createResponse(false, cancelResult.error || 'Failed to cancel order', null, 'extended.submitCancelOrder');
        }
    } catch (error) {
        const message = error.message || 'Failed to cancel order';
        return createResponse(false, message, null, 'extended.submitCancelOrder');
    }
}

/**
 * Submits a close order for an open position using Python SDK
 *
 * @async
 * @function wmSubmitCloseOrder
 * @param {Object} extendedInstance - Extended instance with configured Python service
 * @param {number} _slippage - Allowed slippage percentage for market orders.
 * @param {Object} _account - User account object containing vault number and Stark key information.
 * @param {string} _type - Order type (e.g., market or limit).
 * @param {string} _symbol - Market symbol for the order (e.g., 'BTC-USD').
 * @param {number} _orderQty - Quantity to close (ignored if _closeAll is true).
 * @param {string} _marketUnit - Unit type for the market (e.g., base or quote).
 * @param {boolean} _closeAll - If true, closes the entire position; otherwise, closes the specified quantity.
 * @returns {Promise<Object>} A promise that resolves to a response object indicating success or failure, including the symbol and order ID on success, or an error message on failure.
 */
export async function wmSubmitCloseOrder(extendedInstance, _slippage, _account, _type, _symbol, _orderQty, _marketUnit, _closeAll) {
    try {
        // Prima otteniamo le posizioni per determinare quale chiudere
        const positions = await extendedInstance._callPythonService('get_positions');
        const position = positions.find(p => p.market_name === _symbol);
        
        if (!position) {
            return createResponse(false, 'No open position found', null, 'extended.submitCloseOrder');
        }

        const positionSize = Math.abs(parseFloat(position.size));
        if (positionSize === 0) {
            return createResponse(false, 'Position size is zero', null, 'extended.submitCloseOrder');
        }

        // Determina la quantità da chiudere
        let closeQty = _closeAll ? positionSize : _orderQty;
        if (closeQty > positionSize) {
            closeQty = positionSize;
        }

        // Determina il lato opposto per chiudere
        const positionSide = position.side; // "BUY" o "SELL" dal SDK Python
        const closeSide = positionSide === "BUY" ? "SELL" : "BUY";
        
        // Converti il tipo di ordine
        const pythonType = _type === extendedEnum.order.type.market ? "MARKET" : "LIMIT";
        
        // Calcola il prezzo per ordini limit
        let price = "0"; // Default per market orders
        if (_type === extendedEnum.order.type.limit) {
            try {
                const marketData = await extendedInstance._callPythonService('get_market_data', {
                    market_name: _symbol
                });
                price = marketData.mark_price || marketData.last_price || "50000";
            } catch (error) {
                price = "50000"; // Fallback price
            }
        }

        // Chiudi la posizione usando il servizio Python
        const closeResult = await extendedInstance._callPythonService('place_order', {
            market_name: _symbol,
            side: closeSide,
            amount: closeQty.toString(),
            price: price,
            order_type: pythonType,
            time_in_force: "GTC",
            reduce_only: true // Importante per gli ordini di chiusura
        });
        
        if (closeResult.success) {
            return createResponse(true, 'success', { 
                symbol: _symbol, 
                orderId: closeResult.order.id || crypto.randomUUID() 
            }, 'extended.submitCloseOrder');
        } else {
            return createResponse(false, closeResult.error || 'Failed to close position', null, 'extended.submitCloseOrder');
        }
    } catch (error) {
        const message = error.message || 'Failed to submit close order';
        return createResponse(
            false,
            message,
            null,
            'extended.submitCloseOrder'
        );
    }
}
