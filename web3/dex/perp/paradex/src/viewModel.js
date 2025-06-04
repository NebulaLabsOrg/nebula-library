import { createResponse } from '../../../../../utils/src/response.utils.js';

/**
 * @async
 * @function vmGetAccountInfo
 * @description Retrieves the user's account information from the Paradex API.
 * @param {Object} _instance - Axios instance configured for Paradex API.
 * @returns {Promise<Object>} A Promise that resolves with a response object containing the account information or an error message.
 */
export async function vmGetAccountInfo(_instance) {
    try {
        const response = await _instance.get('/account');
        return createResponse(true, 'success', response.data, 'paradex.getAccountInfo');
    } catch (error) {
        return createResponse(false, error.message || 'Failed to get account info', null, 'paradex.getAccountInfo');
    }
}


export async function test(_instance) {
    try {
        // morde detail on most of the respocnes: https://github.com/issues/assigned?issue=NebulaLabsOrg%7Cnebula-library%7C8
        // account related stuff
        //const response = await _instance.get('/account'); //account balacne and  margins
        //const response = await _instance.get('/balance'); //balances list
        //const response = await _instance.get('/positions'); //position list eeven closed
        // markets related stuff
        //const response = await _instance.get('/markets'); //market data : use a parameter ?market=ARB-USD-PERP tp get data of only a single perp
        //const response = await _instance.get('/markets/summary?market=ARB-USD-PERP'); //market data (openinterest and fundign rate)
        // orders related stuff
        //const response = await _instance.get('/orders'); //get open orders
        //const response = await _instance.post('/orders'); //set order parameters : https://docs.paradex.trade/api/prod/orders/new
        //const response = await _instance.del('/orders'); //delete all orders: or use a parameter ?market=ARB-USD-PERP to delete data of only a single perp
        //const response = await _instance.get('/orders-history'); //get ordere history
        //const response = await _instance.get('/orders/{order_id}'); //get order by order id //only NEW and OPEN will return
        //const response = await _instance.put('/orders/{order_id}'); //modify order by order id parameters : https://docs.paradex.trade/api/prod/orders/modify
        //const response = await _instance.del('/orders/{order_id}'); //delete order by order id

        return createResponse(true, 'success', response.data.results[0], 'paradex.getMarketData');
    } catch (error) {
        return createResponse(false, error.message, null, 'paradex.getMarketData');
    }
}
