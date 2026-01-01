/**
 * GRVT Extended Utility Functions
 * Following NebulaLabs architecture pattern with BigInt integration
 * 
 * Architecture Principle:
 * - Input: number/string from API
 * - Internal: Convert to ethers BigInt for precision
 * - Calculate: BigInt arithmetic
 * - Output: number/string for API/SDK calls
 */

import { ethers } from 'ethers';
import { PRICE_DECIMALS, SIZE_DECIMALS, USDT_DECIMALS } from './constant.js';

/**
 * Calculate mid price between ask and bid using BigInt for precision
 * @param {number|string} _askPrice - Ask price from API
 * @param {number|string} _bidPrice - Bid price from API
 * @returns {number} Mid price
 */
export function calculateMidPrice(_askPrice, _bidPrice) {
    try {
        // Convert to BigInt (use 9 decimals for prices)
        const askBN = ethers.parseUnits(_askPrice.toString(), PRICE_DECIMALS);
        const bidBN = ethers.parseUnits(_bidPrice.toString(), PRICE_DECIMALS);
        
        // Calculate midpoint: (ask + bid) / 2
        const midBN = (askBN + bidBN) / 2n;
        
        // Convert back to number
        return parseFloat(ethers.formatUnits(midBN, PRICE_DECIMALS));
    } catch (error) {
        console.error('calculateMidPrice error:', error);
        // Fallback to simple calculation
        return (parseFloat(_askPrice) + parseFloat(_bidPrice)) / 2;
    }
}

/**
 * Count decimal places in a number
 * @param {number|string} value - Number to count decimals
 * @returns {number} Number of decimal places
 */
export function countDecimals(value) {
    const str = value.toString();
    if (str.indexOf('.') !== -1 && str.indexOf('e-') === -1) {
        return str.split('.')[1].length;
    } else if (str.indexOf('e-') !== -1) {
        const parts = str.split('e-');
        return parseInt(parts[1], 10);
    }
    return 0;
}

/**
 * Format order quantity using BigInt precision
 * Handles quote on main coin vs secondary coin
 * @param {number|string} _orderQty - Order quantity
 * @param {boolean} _isQuoteOnSecCoin - Quote on secondary coin flag
 * @param {number|string} _price - Current price
 * @param {number|string} _qtyStep - Quantity step size
 * @returns {string} Formatted quantity
 */
export function formatOrderQuantity(_orderQty, _isQuoteOnSecCoin, _price, _qtyStep) {
    try {
        let qtyBN = ethers.parseUnits(_orderQty.toString(), SIZE_DECIMALS);
        
        // If quoting on secondary coin, divide by price
        if (_isQuoteOnSecCoin) {
            const priceBN = ethers.parseUnits(_price.toString(), PRICE_DECIMALS);
            // qty = qty / price (multiply by 10^PRICE_DECIMALS to maintain precision)
            qtyBN = (qtyBN * (10n ** BigInt(PRICE_DECIMALS))) / priceBN;
        }
        
        const stepBN = ethers.parseUnits(_qtyStep.toString(), SIZE_DECIMALS);
        
        // Round down to step: qty = floor(qty / step) * step
        qtyBN = (qtyBN / stepBN) * stepBN;
        
        return ethers.formatUnits(qtyBN, SIZE_DECIMALS);
    } catch (error) {
        console.error('formatOrderQuantity error:', error);
        // Fallback to simple calculation
        let qty = parseFloat(_orderQty);
        if (_isQuoteOnSecCoin) {
            qty = qty / parseFloat(_price);
        }
        const step = parseFloat(_qtyStep);
        qty = Math.floor(qty / step) * step;
        const stepDecimals = (_qtyStep.toString().split('.')[1] || '').length;
        return qty.toFixed(stepDecimals);
    }
}

/**
 * Calculate slippage-adjusted price using BigInt
 * @param {number|string} basePrice - Base price
 * @param {number} slippagePercent - Slippage percentage (e.g., 0.5 for 0.5%)
 * @param {boolean} isBuy - True for buy, false for sell
 * @returns {number} Adjusted price
 */
export function calculateSlippagePrice(basePrice, slippagePercent, isBuy) {
    try {
        const priceBN = ethers.parseUnits(basePrice.toString(), PRICE_DECIMALS);
        
        // For buy: price * (1 + slippage%), for sell: price * (1 - slippage%)
        const slippageMultiplier = isBuy 
            ? BigInt(10000 + Math.floor(slippagePercent * 100))  // 1 + slippage%
            : BigInt(10000 - Math.floor(slippagePercent * 100)); // 1 - slippage%
        
        const adjustedPriceBN = (priceBN * slippageMultiplier) / 10000n;
        
        return parseFloat(ethers.formatUnits(adjustedPriceBN, PRICE_DECIMALS));
    } catch (error) {
        console.error('calculateSlippagePrice error:', error);
        // Fallback to simple calculation
        const adjustment = isBuy 
            ? (slippagePercent / 100) 
            : -(slippagePercent / 100);
        return parseFloat(basePrice) * (1 + adjustment);
    }
}

/**
 * Round price to tick size using BigInt
 * @param {number|string} price - Price to round
 * @param {number|string} tickSize - Tick size
 * @returns {string} Rounded price
 */
export function roundToTickSize(price, tickSize) {
    try {
        const priceBN = ethers.parseUnits(price.toString(), PRICE_DECIMALS);
        const tickBN = ethers.parseUnits(tickSize.toString(), PRICE_DECIMALS);
        
        // Round to nearest tick: round(price / tick) * tick
        const roundedBN = ((priceBN + tickBN / 2n) / tickBN) * tickBN;
        
        return ethers.formatUnits(roundedBN, PRICE_DECIMALS);
    } catch (error) {
        console.error('roundToTickSize error:', error);
        const p = parseFloat(price);
        const t = parseFloat(tickSize);
        return (Math.round(p / t) * t).toFixed(countDecimals(tickSize));
    }
}

/**
 * Convert USDT amount to contract units (with 6 decimals)
 * @param {number|string} amount - USDT amount
 * @returns {string} Contract units
 */
export function toUsdtUnits(amount) {
    try {
        return ethers.parseUnits(amount.toString(), USDT_DECIMALS).toString();
    } catch (error) {
        console.error('toUsdtUnits error:', error);
        return (parseFloat(amount) * Math.pow(10, USDT_DECIMALS)).toString();
    }
}

/**
 * Convert contract units to USDT amount (with 6 decimals)
 * @param {string|BigNumber} units - Contract units
 * @returns {string} USDT amount
 */
export function fromUsdtUnits(units) {
    try {
        return ethers.formatUnits(units.toString(), USDT_DECIMALS);
    } catch (error) {
        console.error('fromUsdtUnits error:', error);
        return (parseFloat(units) / Math.pow(10, USDT_DECIMALS)).toString();
    }
}

/**
 * Validate order parameters
 * @param {Object} params - Order parameters
 * @returns {Object} Validation result with success flag and message
 */
export function validateOrderParams(params) {
    const { symbol, side, type, qty, price, minQty, maxQty } = params;
    
    if (!symbol) {
        return { success: false, message: 'Symbol is required' };
    }
    
    if (!side || !['BUY', 'SELL'].includes(side)) {
        return { success: false, message: 'Invalid side (must be BUY or SELL)' };
    }
    
    if (!type || !['MARKET', 'LIMIT'].includes(type)) {
        return { success: false, message: 'Invalid order type (must be MARKET or LIMIT)' };
    }
    
    if (!qty || parseFloat(qty) <= 0) {
        return { success: false, message: 'Quantity must be greater than zero' };
    }
    
    if (minQty && parseFloat(qty) < parseFloat(minQty)) {
        return { success: false, message: `Quantity ${qty} must be >= ${minQty}` };
    }
    
    if (maxQty && parseFloat(qty) > parseFloat(maxQty)) {
        return { success: false, message: `Quantity ${qty} must be <= ${maxQty}` };
    }
    
    if (type === 'LIMIT' && (!price || parseFloat(price) <= 0)) {
        return { success: false, message: 'Limit orders require a valid price' };
    }
    
    return { success: true, message: 'Valid' };
}
