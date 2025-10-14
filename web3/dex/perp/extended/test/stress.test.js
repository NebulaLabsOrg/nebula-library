import { Extended, extendedEnum } from '../index.js'
import { TokenBucketThrottler, formatPerpMarket } from '../../../../../utils/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the example folder
dotenv.config({ path: path.join(__dirname, '../example/.env') });

// ========== STRESS TEST CONFIGURATION ==========
const CONFIG = {
    // Trading configuration
    market: 'POPCAT-USD',                          // Market to trade
    quantity: 400,                              // Quantity per trade
    cycles: 3,                                  // Number of complete cycles (open -> close)
    
    // Order management configuration
    maxRetries: 5,                              // Max retries for failed orders
    newOrderTimeout: 5 * 60 * 1000,             // 5 minutes - timeout for NEW orders before cancel/retry
    checkInterval: 1000,                        // 1 second - interval to check order status
    
    // Order types
    openOrderType: extendedEnum.order.type.limit,   // Use limit orders for opening
    closeOrderType: extendedEnum.order.type.limit,  // Use limit orders for closing
    side: extendedEnum.order.short,                   // Side for opening positions
    marketUnit: extendedEnum.order.quoteOnMainCoin,
    
    // Delays
    delayBetweenCycles: 2000,                   // 2 seconds delay between cycles
    delayAfterCancel: 1000,                     // 1 second delay after canceling order
    
    // On-chain hedging configuration
    onchainHedging: {
        enabled: true,                           // Enable on-chain hedging
        tokenSymbol: 'POPCAT',                     // Token symbol for on-chain operations
        slippage: 0.5,                          // Slippage tolerance for on-chain trades (%)
        minTradeAmount: 0.001                   // Minimum amount to trade on-chain
    }
};

// Order status constants
const ORDER_STATUS = {
    NEW: 'NEW',                    // Order in the order book, unfilled
    FILLED: 'FILLED',              // Order fully filled
    UNTRIGGERED: 'UNTRIGGERED',    // Conditional order waiting for trigger price
    CANCELLED: 'CANCELLED',        // Order cancelled
    REJECTED: 'REJECTED',          // Order rejected
    EXPIRED: 'EXPIRED'             // Order expired
};

// ========== ON-CHAIN HEDGING SYSTEM ==========

/**
 * Position tracker for maintaining hedge balance
 */
class PositionTracker {
    constructor() {
        this.perpPosition = 0;          // Current perpetual position
        this.onchainPosition = 0;       // Current on-chain position
        this.targetHedgeRatio = 1.0;    // 1:1 hedge ratio
        this.trades = [];               // History of all trades
    }
    
    /**
     * Update perpetual position based on fill
     */
    updatePerpPosition(side, quantity) {
        const multiplier = side === extendedEnum.order.long ? 1 : -1;
        this.perpPosition += quantity * multiplier;
        log(`📊 Perp position updated: ${this.perpPosition.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
    }
    
    /**
     * Update on-chain position after trade
     */
    updateOnchainPosition(side, quantity) {
        const multiplier = side === 'BUY' ? 1 : -1;
        this.onchainPosition += quantity * multiplier;
        log(`🔗 On-chain position updated: ${this.onchainPosition.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
    }
    
    /**
     * Calculate required hedge amount
     */
    getRequiredHedge() {
        const targetOnchainPosition = -this.perpPosition * this.targetHedgeRatio; // Opposite to perp
        const requiredTrade = targetOnchainPosition - this.onchainPosition;
        return requiredTrade;
    }
    
    /**
     * Check if hedge is balanced
     */
    isBalanced(tolerance = 0.001) {
        const requiredHedge = Math.abs(this.getRequiredHedge());
        return requiredHedge < tolerance;
    }
    
    /**
     * Get current status
     */
    getStatus() {
        return {
            perpPosition: this.perpPosition,
            onchainPosition: this.onchainPosition,
            requiredHedge: this.getRequiredHedge(),
            isBalanced: this.isBalanced(),
            totalTrades: this.trades.length
        };
    }
    
    /**
     * Add trade to history
     */
    addTrade(trade) {
        this.trades.push({
            ...trade,
            timestamp: new Date().toISOString()
        });
    }
    
    /**
     * Reset positions (for new cycle)
     */
    reset() {
        this.perpPosition = 0;
        this.onchainPosition = 0;
        this.trades = [];
        log('🔄 Position tracker reset for new cycle', 'INFO');
    }
}

/**
 * Simulated on-chain token purchase/sale function
 */
async function executeOnchainTrade(side, amount, price, reason = '') {
    if (!CONFIG.onchainHedging.enabled) {
        return { success: false, reason: 'On-chain hedging disabled' };
    }
    
    if (Math.abs(amount) < CONFIG.onchainHedging.minTradeAmount) {
        log(`⚠️  On-chain trade amount ${amount.toFixed(6)} below minimum ${CONFIG.onchainHedging.minTradeAmount}`, 'WARNING');
        return { success: false, reason: 'Below minimum trade amount' };
    }
    
    const action = side === 'BUY' ? 'BUYING' : 'SELLING';
    const priceWithSlippage = side === 'BUY' 
        ? price * (1 + CONFIG.onchainHedging.slippage / 100)
        : price * (1 - CONFIG.onchainHedging.slippage / 100);
    
    const totalCost = Math.abs(amount) * priceWithSlippage;
    
    log(`\n💰 === ON-CHAIN TRADE EXECUTION ===`, 'SUCCESS');
    log(`🎯 Action: ${action} ${Math.abs(amount).toFixed(6)} ${CONFIG.onchainHedging.tokenSymbol}`, 'SUCCESS');
    log(`💲 Price: $${price.toFixed(4)} (with ${CONFIG.onchainHedging.slippage}% slippage: $${priceWithSlippage.toFixed(4)})`, 'SUCCESS');
    log(`💵 Total Cost: $${totalCost.toFixed(2)}`, 'SUCCESS');
    log(`📝 Reason: ${reason}`, 'SUCCESS');
    log(`⏰ Timestamp: ${new Date().toISOString()}`, 'SUCCESS');
    log(`💰 ================================\n`, 'SUCCESS');
    
    // Simulate network delay
    await sleep(500 + Math.random() * 1000);
    
    const trade = {
        side,
        amount: Math.abs(amount),
        price: priceWithSlippage,
        totalCost,
        reason,
        success: true
    };
    
    return { success: true, trade };
}

/**
 * Execute hedge based on perp position change
 */
async function executeHedge(positionTracker, perpSide, perpQuantity, perpPrice, reason) {
    if (!CONFIG.onchainHedging.enabled) return { success: false };
    
    // Update perp position first
    positionTracker.updatePerpPosition(perpSide, perpQuantity);
    
    // Calculate required hedge
    const requiredHedge = positionTracker.getRequiredHedge();
    
    if (Math.abs(requiredHedge) < CONFIG.onchainHedging.minTradeAmount) {
        log(`✅ No hedge needed - required: ${requiredHedge.toFixed(6)} (below minimum)`, 'INFO');
        return { success: true, reason: 'No hedge needed' };
    }
    
    // Determine on-chain trade side (opposite to perp)
    const onchainSide = requiredHedge > 0 ? 'BUY' : 'SELL';
    const onchainAmount = Math.abs(requiredHedge);
    
    log(`🎯 Hedge calculation: Perp ${perpSide} ${perpQuantity} → On-chain ${onchainSide} ${onchainAmount.toFixed(6)}`, 'ORDER');
    
    // Execute on-chain trade
    const tradeResult = await executeOnchainTrade(onchainSide, onchainAmount, perpPrice, reason);
    
    if (tradeResult.success) {
        // Update on-chain position
        positionTracker.updateOnchainPosition(onchainSide, onchainAmount);
        positionTracker.addTrade(tradeResult.trade);
        
        // Log final status
        const status = positionTracker.getStatus();
        log(`📊 Hedge Status: Perp: ${status.perpPosition.toFixed(4)}, On-chain: ${status.onchainPosition.toFixed(4)}, Balanced: ${status.isBalanced ? '✅' : '❌'}`, 'INFO');
        
        return { success: true, trade: tradeResult.trade, status };
    }
    
    return tradeResult;
}

/**
 * Execute final balancing trade to ensure perfect hedge alignment
 */
async function executeFinalBalancing(positionTracker, marketPrice, reason) {
    if (!CONFIG.onchainHedging.enabled) return { success: false };
    
    const status = positionTracker.getStatus();
    
    if (status.isBalanced) {
        log(`✅ Positions already balanced - Perp: ${status.perpPosition.toFixed(4)}, On-chain: ${status.onchainPosition.toFixed(4)}`, 'SUCCESS');
        return { success: true, reason: 'Already balanced' };
    }
    
    const requiredHedge = status.requiredHedge;
    const onchainSide = requiredHedge > 0 ? 'BUY' : 'SELL';
    const onchainAmount = Math.abs(requiredHedge);
    
    if (onchainAmount < CONFIG.onchainHedging.minTradeAmount) {
        log(`✅ Final balance within tolerance - required: ${requiredHedge.toFixed(6)} (below minimum)`, 'INFO');
        return { success: true, reason: 'Within tolerance' };
    }
    
    log(`🎯 FINAL BALANCING TRADE: ${onchainSide} ${onchainAmount.toFixed(6)} ${CONFIG.onchainHedging.tokenSymbol}`, 'WARNING');
    
    // Execute final balancing trade
    const tradeResult = await executeOnchainTrade(onchainSide, onchainAmount, marketPrice, reason);
    
    if (tradeResult.success) {
        positionTracker.updateOnchainPosition(onchainSide, onchainAmount);
        positionTracker.addTrade(tradeResult.trade);
        
        const finalStatus = positionTracker.getStatus();
        log(`📊 Final Balance: Perp: ${finalStatus.perpPosition.toFixed(4)}, On-chain: ${finalStatus.onchainPosition.toFixed(4)}, Balanced: ${finalStatus.isBalanced ? '✅' : '❌'}`, 'SUCCESS');
        
        return { success: true, trade: tradeResult.trade, finalStatus };
    }
    
    return tradeResult;
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Sleep function for delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format timestamp for logging
 */
function getTimestamp() {
    return new Date().toISOString();
}

/**
 * Enhanced console log with timestamp and styling
 */
function log(message, type = 'INFO') {
    const colors = {
        INFO: '\x1b[36m',     // Cyan
        SUCCESS: '\x1b[32m',   // Green
        WARNING: '\x1b[33m',   // Yellow
        ERROR: '\x1b[31m',     // Red
        CYCLE: '\x1b[35m',     // Magenta
        ORDER: '\x1b[34m'      // Blue
    };
    const reset = '\x1b[0m';
    const timestamp = getTimestamp();
    console.log(`${colors[type]}[${timestamp}] [${type}] ${message}${reset}`);
}

/**
 * Wait for order to reach final status with timeout and monitoring
 * Includes on-chain hedging for partial and full fills
 */
async function waitForOrderCompletion(extendedInstance, orderId, expectedStatus, timeout, positionTracker, perpSide, onStatusUpdate = null) {
    const startTime = Date.now();
    let lastStatus = null;
    let lastExecutedQty = 0;
    let statusCount = {};
    
    log(`Monitoring order ${orderId} - waiting for ${expectedStatus} (timeout: ${timeout/1000}s)`, 'ORDER');
    
    while (Date.now() - startTime < timeout) {
        try {
            const statusResponse = await extendedInstance.getOrderStatus(orderId);
            
            if (statusResponse.success) {
                const currentStatus = statusResponse.data.status;
                const currentExecutedQty = parseFloat(statusResponse.data.qtyExe || 0);
                const avgPrice = parseFloat(statusResponse.data.avgPrice || 0);
                
                // Count status occurrences
                statusCount[currentStatus] = (statusCount[currentStatus] || 0) + 1;
                
                if (currentStatus !== lastStatus) {
                    log(`Order ${orderId} status: ${lastStatus} → ${currentStatus}`, 'ORDER');
                    lastStatus = currentStatus;
                    
                    if (onStatusUpdate) {
                        onStatusUpdate(currentStatus, statusResponse.data);
                    }
                }
                
                // Check for new executions (partial or full fills)
                if (currentExecutedQty > lastExecutedQty && avgPrice > 0) {
                    const newFillQty = currentExecutedQty - lastExecutedQty;
                    
                    log(`🎯 NEW FILL DETECTED: ${newFillQty.toFixed(6)} @ $${avgPrice.toFixed(4)} (Total: ${currentExecutedQty.toFixed(6)})`, 'SUCCESS');
                    
                    // Execute hedge for the new fill
                    if (positionTracker && CONFIG.onchainHedging.enabled) {
                        const hedgeReason = currentStatus === ORDER_STATUS.FILLED 
                            ? `Full fill completion - Order ${orderId}`
                            : `Partial fill - Order ${orderId} (${newFillQty.toFixed(6)}/${statusResponse.data.qty})`;
                        
                        log(`🔗 Executing hedge for new fill...`, 'ORDER');
                        const hedgeResult = await executeHedge(
                            positionTracker,
                            perpSide,
                            newFillQty,
                            avgPrice,
                            hedgeReason
                        );
                        
                        if (hedgeResult.success) {
                            log(`✅ Hedge executed successfully for ${newFillQty.toFixed(6)} fill`, 'SUCCESS');
                        } else {
                            log(`⚠️  Hedge execution failed: ${hedgeResult.reason || 'Unknown error'}`, 'WARNING');
                        }
                    }
                    
                    lastExecutedQty = currentExecutedQty;
                }
                
                // Check if we reached the expected status
                if (currentStatus === expectedStatus) {
                    log(`✅ Order ${orderId} reached expected status: ${expectedStatus}`, 'SUCCESS');
                    return { success: true, status: currentStatus, data: statusResponse.data, statusCount };
                }
                
                // Check for terminal failure states
                if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.EXPIRED].includes(currentStatus)) {
                    log(`❌ Order ${orderId} reached terminal state: ${currentStatus}`, 'ERROR');
                    return { success: false, status: currentStatus, data: statusResponse.data, statusCount };
                }
                
            } else {
                log(`Failed to get order status: ${statusResponse.message}`, 'WARNING');
            }
            
        } catch (error) {
            log(`Error checking order status: ${error.message}`, 'ERROR');
        }
        
        await sleep(CONFIG.checkInterval);
    }
    
    log(`⏰ Timeout waiting for order ${orderId} to reach ${expectedStatus}`, 'WARNING');
    return { success: false, status: lastStatus, timeout: true, statusCount };
}

/**
 * Place order with retry logic
 */
async function placeOrderWithRetry(extendedInstance, type, symbol, side, marketUnit, quantity, maxRetries) {
    let attempt = 0;
    
    while (attempt < maxRetries) {
        attempt++;
        log(`Placing ${side} order - Attempt ${attempt}/${maxRetries} | Qty: ${quantity} ${symbol}`, 'ORDER');
        
        try {
            const response = await extendedInstance.submitOrder(type, symbol, side, marketUnit, quantity);
            
            if (response.success) {
                log(`✅ Order placed successfully - ID: ${response.data.orderId}`, 'SUCCESS');
                return { success: true, orderId: response.data.orderId, attempts: attempt };
            } else {
                log(`❌ Order placement failed: ${response.message}`, 'ERROR');
                
                // If it's the last attempt, return failure
                if (attempt === maxRetries) {
                    return { success: false, error: response.message, attempts: attempt };
                }
                
                log(`Retrying in ${CONFIG.delayAfterCancel}ms...`, 'WARNING');
                await sleep(CONFIG.delayAfterCancel);
            }
            
        } catch (error) {
            log(`❌ Order placement error: ${error.message}`, 'ERROR');
            
            if (attempt === maxRetries) {
                return { success: false, error: error.message, attempts: attempt };
            }
            
            await sleep(CONFIG.delayAfterCancel);
        }
    }
}

/**
 * Cancel order safely
 */
async function cancelOrder(extendedInstance, orderId) {
    try {
        log(`Cancelling order ${orderId}...`, 'ORDER');
        const cancelResponse = await extendedInstance.submitCancelOrder(orderId);
        
        if (cancelResponse.success) {
            log(`✅ Order ${orderId} cancelled successfully`, 'SUCCESS');
            return true;
        } else {
            log(`❌ Failed to cancel order ${orderId}: ${cancelResponse.message}`, 'ERROR');
            return false;
        }
    } catch (error) {
        log(`❌ Error cancelling order ${orderId}: ${error.message}`, 'ERROR');
        return false;
    }
}

/**
 * Execute a complete trading cycle (open position -> wait for fill -> close position)
 */
async function executeOpenCycle(extendedInstance, cycleNumber, positionTracker) {
    log(`🔄 Starting OPEN cycle ${cycleNumber}/${CONFIG.cycles}`, 'CYCLE');
    
    let attempt = 0;
    
    while (attempt < CONFIG.maxRetries) {
        attempt++;
        
        // Step 1: Place opening order
        const openResult = await placeOrderWithRetry(
            extendedInstance,
            CONFIG.openOrderType,
            CONFIG.market,
            CONFIG.side,
            CONFIG.marketUnit,
            CONFIG.quantity,
            1 // Single attempt per retry loop
        );
        
        if (!openResult.success) {
            log(`❌ Failed to place opening order on attempt ${attempt}: ${openResult.error}`, 'ERROR');
            if (attempt === CONFIG.maxRetries) {
                return { success: false, error: 'Max retries reached for opening order' };
            }
            continue;
        }
        
        const orderId = openResult.orderId;
        
        // Step 2: Monitor order until FILLED or timeout/failure (with hedging)
        const result = await waitForOrderCompletion(
            extendedInstance,
            orderId,
            ORDER_STATUS.FILLED,
            CONFIG.newOrderTimeout,
            positionTracker,
            CONFIG.side,
            (status, data) => {
                if (status === ORDER_STATUS.NEW) {
                    log(`Order ${orderId} is in order book, waiting for fill...`, 'INFO');
                }
            }
        );
        
        if (result.success && result.status === ORDER_STATUS.FILLED) {
            log(`🎯 Opening position FILLED successfully - Order: ${orderId}`, 'SUCCESS');
            
            // Log final hedge status
            const hedgeStatus = positionTracker.getStatus();
            log(`🔗 Final hedge status - Perp: ${hedgeStatus.perpPosition.toFixed(4)}, On-chain: ${hedgeStatus.onchainPosition.toFixed(4)}`, 'INFO');
            
            return { success: true, orderId, status: result.status, data: result.data };
        }
        
        // Step 3: Handle non-filled orders
        if (result.status === ORDER_STATUS.NEW && result.timeout) {
            log(`⏰ Order ${orderId} remained NEW for ${CONFIG.newOrderTimeout/1000}s, cancelling and retrying...`, 'WARNING');
            await cancelOrder(extendedInstance, orderId);
            await sleep(CONFIG.delayAfterCancel);
        } else if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.EXPIRED].includes(result.status)) {
            log(`❌ Order ${orderId} failed with status: ${result.status}, retrying...`, 'ERROR');
            await sleep(CONFIG.delayAfterCancel);
        }
        
        log(`Retry attempt ${attempt}/${CONFIG.maxRetries} for opening order...`, 'WARNING');
    }
    
    return { success: false, error: 'Max retries reached for opening order' };
}

/**
 * Execute close cycle
 */
async function executeCloseCycle(extendedInstance, cycleNumber, positionTracker) {
    log(`🔄 Starting CLOSE cycle ${cycleNumber}/${CONFIG.cycles}`, 'CYCLE');
    
    let attempt = 0;
    
    while (attempt < CONFIG.maxRetries) {
        attempt++;
        
        // Step 1: Place closing order
        log(`Placing close order - Attempt ${attempt}/${CONFIG.maxRetries}`, 'ORDER');
        
        try {
            const closeResponse = await extendedInstance.submitCloseOrder(
                CONFIG.closeOrderType,
                CONFIG.market,
                CONFIG.quantity,
                CONFIG.marketUnit,
                false // Don't close all, use specified quantity
            );
            
            if (!closeResponse.success) {
                log(`❌ Failed to place closing order: ${closeResponse.message}`, 'ERROR');
                if (attempt === CONFIG.maxRetries) {
                    return { success: false, error: 'Max retries reached for closing order' };
                }
                await sleep(CONFIG.delayAfterCancel);
                continue;
            }
            
            const orderId = closeResponse.data.orderId;
            
            // Determine the close side correctly:
            // If we opened SHORT, we close with LONG (BUY)
            // If we opened LONG, we close with SHORT (SELL)
            const originalSide = CONFIG.side;
            const closeSide = originalSide === extendedEnum.order.long ? extendedEnum.order.short : extendedEnum.order.long;
            
            log(`✅ Close order placed successfully - ID: ${orderId} | Original: ${originalSide} → Close: ${closeSide}`, 'SUCCESS');
            
            // Step 2: Monitor close order (with hedging)
            const result = await waitForOrderCompletion(
                extendedInstance,
                orderId,
                ORDER_STATUS.FILLED,
                CONFIG.newOrderTimeout,
                positionTracker,
                closeSide,
                (status, data) => {
                    if (status === ORDER_STATUS.NEW) {
                        log(`Close order ${orderId} is in order book, waiting for fill...`, 'INFO');
                    }
                }
            );
            
            if (result.success && result.status === ORDER_STATUS.FILLED) {
                log(`🎯 Position CLOSED successfully - Order: ${orderId}`, 'SUCCESS');
                
                // Step 3: Execute final balancing to ensure perfect hedge
                log(`🔗 Executing final balancing check...`, 'ORDER');
                const avgPrice = parseFloat(result.data.avgPrice || 0);
                const balancingResult = await executeFinalBalancing(
                    positionTracker, 
                    avgPrice, 
                    `Final balance check after close - Cycle ${cycleNumber}`
                );
                
                if (balancingResult.success) {
                    log(`✅ Final balancing completed successfully`, 'SUCCESS');
                } else {
                    log(`⚠️  Final balancing failed: ${balancingResult.reason || 'Unknown error'}`, 'WARNING');
                }
                
                // Log final hedge status
                const hedgeStatus = positionTracker.getStatus();
                log(`🔗 Final hedge status - Perp: ${hedgeStatus.perpPosition.toFixed(4)}, On-chain: ${hedgeStatus.onchainPosition.toFixed(4)}`, 'INFO');
                log(`🎯 Expected final state: Both positions should be ~0 (perfectly balanced)`, 'INFO');
                
                if (Math.abs(hedgeStatus.perpPosition) > 0.001 || Math.abs(hedgeStatus.onchainPosition) > 0.001) {
                    log(`⚠️  WARNING: Positions not fully closed! Perp: ${hedgeStatus.perpPosition.toFixed(6)}, On-chain: ${hedgeStatus.onchainPosition.toFixed(6)}`, 'WARNING');
                } else {
                    log(`✅ Perfect cycle completion - All positions closed and balanced`, 'SUCCESS');
                }
                
                return { 
                    success: true, 
                    orderId, 
                    status: result.status, 
                    data: result.data,
                    finalBalance: hedgeStatus,
                    balancingTrade: balancingResult.trade || null
                };
            }
            
            // Handle non-filled close orders
            if (result.status === ORDER_STATUS.NEW && result.timeout) {
                log(`⏰ Close order ${orderId} remained NEW for ${CONFIG.newOrderTimeout/1000}s, cancelling and retrying...`, 'WARNING');
                await cancelOrder(extendedInstance, orderId);
                await sleep(CONFIG.delayAfterCancel);
            } else if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.EXPIRED].includes(result.status)) {
                log(`❌ Close order ${orderId} failed with status: ${result.status}, retrying...`, 'ERROR');
                await sleep(CONFIG.delayAfterCancel);
            }
            
        } catch (error) {
            log(`❌ Error in close cycle: ${error.message}`, 'ERROR');
            if (attempt === CONFIG.maxRetries) {
                return { success: false, error: error.message };
            }
            await sleep(CONFIG.delayAfterCancel);
        }
        
        log(`Retry attempt ${attempt}/${CONFIG.maxRetries} for closing order...`, 'WARNING');
    }
    
    return { success: false, error: 'Max retries reached for closing order' };
}

// ========== MAIN STRESS TEST ==========

async function runStressTest() {
    log('🚀 Starting Extended Trading Stress Test', 'CYCLE');
    log(`Configuration: ${CONFIG.cycles} cycles, ${CONFIG.quantity} ${CONFIG.market}, ${CONFIG.maxRetries} max retries`, 'INFO');
    
    // Initialize Extended instance
    const extendedThrottler = new TokenBucketThrottler(1000);
    const extendedInstance = new Extended(
        process.env.API_KEY,
        process.env.STARK_KEY_PRIVATE,
        process.env.STARK_KEY_PUBLIC,
        process.env.VAULT_NUMBER,
        0.1,
        extendedThrottler
    );
    
    const testResults = {
        startTime: Date.now(),
        cycles: [],
        totalCycles: CONFIG.cycles,
        successfulCycles: 0,
        failedCycles: 0,
        totalOrders: 0,
        successfulOrders: 0,
        failedOrders: 0,
        hedgeStats: {
            totalHedgeTrades: 0,
            successfulHedges: 0,
            failedHedges: 0
        }
    };
    
    try {
        // Test connection first
        log('Testing connection...', 'INFO');
        const connectionTest = await extendedInstance.checkPythonService();
        log('✅ Connection test successful', 'SUCCESS');
        
        // Initialize position tracker for hedging
        const positionTracker = new PositionTracker();
        log(`🔗 On-chain hedging ${CONFIG.onchainHedging.enabled ? 'ENABLED' : 'DISABLED'}`, 'INFO');
        if (CONFIG.onchainHedging.enabled) {
            log(`🎯 Hedging token: ${CONFIG.onchainHedging.tokenSymbol}, Min trade: ${CONFIG.onchainHedging.minTradeAmount}, Slippage: ${CONFIG.onchainHedging.slippage}%`, 'INFO');
        }
        
        // Main test loop
        for (let cycle = 1; cycle <= CONFIG.cycles; cycle++) {
            const cycleStart = Date.now();
            log(`\n${'='.repeat(60)}`, 'CYCLE');
            log(`🔄 CYCLE ${cycle}/${CONFIG.cycles} - STARTING`, 'CYCLE');
            log(`${'='.repeat(60)}`, 'CYCLE');
            
            // Reset position tracker for new cycle
            positionTracker.reset();
            
            const cycleResult = {
                cycleNumber: cycle,
                startTime: cycleStart,
                openPhase: null,
                closePhase: null,
                hedgingStats: {
                    tradesExecuted: 0,
                    totalHedgeVolume: 0,
                    finalBalance: null
                },
                duration: 0,
                success: false
            };
            
            // Phase 1: Open position
            log(`\n📈 PHASE 1: Opening position...`, 'CYCLE');
            const openResult = await executeOpenCycle(extendedInstance, cycle, positionTracker);
            cycleResult.openPhase = openResult;
            testResults.totalOrders++;
            
            if (openResult.success) {
                testResults.successfulOrders++;
                log(`✅ Open phase completed successfully`, 'SUCCESS');
                
                // Small delay before closing
                await sleep(CONFIG.delayBetweenCycles);
                
                // Phase 2: Close position
                log(`\n📉 PHASE 2: Closing position...`, 'CYCLE');
                const closeResult = await executeCloseCycle(extendedInstance, cycle, positionTracker);
                cycleResult.closePhase = closeResult;
                testResults.totalOrders++;
                
                if (closeResult.success) {
                    testResults.successfulOrders++;
                    cycleResult.success = true;
                    testResults.successfulCycles++;
                    log(`✅ Close phase completed successfully`, 'SUCCESS');
                    log(`🎉 CYCLE ${cycle} COMPLETED SUCCESSFULLY`, 'SUCCESS');
                } else {
                    testResults.failedOrders++;
                    testResults.failedCycles++;
                    log(`❌ Close phase failed: ${closeResult.error}`, 'ERROR');
                    log(`💔 CYCLE ${cycle} FAILED (close phase)`, 'ERROR');
                }
                
            } else {
                testResults.failedOrders++;
                testResults.failedCycles++;
                log(`❌ Open phase failed: ${openResult.error}`, 'ERROR');
                log(`💔 CYCLE ${cycle} FAILED (open phase)`, 'ERROR');
            }
            
            // Collect hedging statistics for this cycle
            const hedgeStatus = positionTracker.getStatus();
            cycleResult.hedgingStats = {
                tradesExecuted: hedgeStatus.totalTrades,
                totalHedgeVolume: positionTracker.trades.reduce((sum, trade) => sum + trade.amount, 0),
                finalBalance: hedgeStatus
            };
            
            // Update global hedge statistics
            testResults.hedgeStats.totalHedgeTrades += hedgeStatus.totalTrades;
            testResults.hedgeStats.successfulHedges += positionTracker.trades.filter(t => t.success).length;
            testResults.hedgeStats.failedHedges += positionTracker.trades.filter(t => !t.success).length;
            
            cycleResult.duration = Date.now() - cycleStart;
            testResults.cycles.push(cycleResult);
            
            // Summary for this cycle
            log(`\n📊 CYCLE ${cycle} SUMMARY:`, 'INFO');
            log(`  Duration: ${(cycleResult.duration / 1000).toFixed(2)}s`, 'INFO');
            log(`  Open: ${openResult.success ? '✅' : '❌'}`, 'INFO');
            log(`  Close: ${cycleResult.closePhase ? (cycleResult.closePhase.success ? '✅' : '❌') : '➖'}`, 'INFO');
            
            if (CONFIG.onchainHedging.enabled) {
                log(`  Hedge Trades: ${cycleResult.hedgingStats.tradesExecuted}`, 'INFO');
                log(`  Hedge Volume: ${cycleResult.hedgingStats.totalHedgeVolume.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
                log(`  Final Balance: ${hedgeStatus.isBalanced ? '✅ Balanced' : '❌ Unbalanced'}`, 'INFO');
                
                if (closeResult.success && closeResult.finalBalance) {
                    const finalPerp = Math.abs(closeResult.finalBalance.perpPosition);
                    const finalOnchain = Math.abs(closeResult.finalBalance.onchainPosition);
                    const isPerfectClose = finalPerp < 0.001 && finalOnchain < 0.001;
                    log(`  Perfect Close: ${isPerfectClose ? '✅' : '❌'} (Perp: ${finalPerp.toFixed(6)}, On-chain: ${finalOnchain.toFixed(6)})`, 'INFO');
                }
                
                if (closeResult.balancingTrade) {
                    log(`  Final Balancing Trade: ${closeResult.balancingTrade.side} ${closeResult.balancingTrade.amount.toFixed(6)} @ $${closeResult.balancingTrade.price.toFixed(4)}`, 'INFO');
                }
            }
            
            // Delay between cycles (except last one)
            if (cycle < CONFIG.cycles) {
                log(`\n⏳ Waiting ${CONFIG.delayBetweenCycles}ms before next cycle...`, 'INFO');
                await sleep(CONFIG.delayBetweenCycles);
            }
        }
        
    } catch (error) {
        log(`💥 Fatal error in stress test: ${error.message}`, 'ERROR');
        testResults.fatalError = error.message;
    }
    
    // Final results
    testResults.endTime = Date.now();
    testResults.totalDuration = testResults.endTime - testResults.startTime;
    
    log(`\n${'='.repeat(80)}`, 'CYCLE');
    log(`🏁 STRESS TEST COMPLETED`, 'CYCLE');
    log(`${'='.repeat(80)}`, 'CYCLE');
    
    log(`\n📈 FINAL RESULTS:`, 'SUCCESS');
    log(`  Total Duration: ${(testResults.totalDuration / 1000).toFixed(2)}s`, 'INFO');
    log(`  Successful Cycles: ${testResults.successfulCycles}/${testResults.totalCycles} (${((testResults.successfulCycles/testResults.totalCycles)*100).toFixed(1)}%)`, 'SUCCESS');
    log(`  Failed Cycles: ${testResults.failedCycles}/${testResults.totalCycles}`, 'ERROR');
    log(`  Successful Orders: ${testResults.successfulOrders}/${testResults.totalOrders} (${((testResults.successfulOrders/testResults.totalOrders)*100).toFixed(1)}%)`, 'SUCCESS');
    log(`  Failed Orders: ${testResults.failedOrders}/${testResults.totalOrders}`, 'ERROR');
    
    if (CONFIG.onchainHedging.enabled) {
        log(`\n🔗 HEDGING STATISTICS:`, 'SUCCESS');
        log(`  Total Hedge Trades: ${testResults.hedgeStats.totalHedgeTrades}`, 'INFO');
        log(`  Successful Hedges: ${testResults.hedgeStats.successfulHedges}/${testResults.hedgeStats.totalHedgeTrades} (${testResults.hedgeStats.totalHedgeTrades > 0 ? ((testResults.hedgeStats.successfulHedges/testResults.hedgeStats.totalHedgeTrades)*100).toFixed(1) : 0}%)`, 'SUCCESS');
        log(`  Failed Hedges: ${testResults.hedgeStats.failedHedges}`, 'ERROR');
        
        // Calculate total hedge volume across all cycles
        const totalHedgeVolume = testResults.cycles.reduce((sum, cycle) => sum + (cycle.hedgingStats?.totalHedgeVolume || 0), 0);
        log(`  Total Hedge Volume: ${totalHedgeVolume.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
    }
    
    if (testResults.cycles.length > 0) {
        const avgCycleDuration = testResults.cycles.reduce((sum, cycle) => sum + cycle.duration, 0) / testResults.cycles.length;
        log(`  Average Cycle Duration: ${(avgCycleDuration / 1000).toFixed(2)}s`, 'INFO');
    }
    
    return testResults;
}

// Run the stress test
if (import.meta.url === `file://${process.argv[1]}`) {
    runStressTest()
        .then(results => {
            log('✅ Stress test execution completed', 'SUCCESS');
            process.exit(results.successfulCycles === results.totalCycles ? 0 : 1);
        })
        .catch(error => {
            log(`💥 Stress test failed: ${error.message}`, 'ERROR');
            process.exit(1);
        });
}

export { runStressTest, CONFIG };
