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
    market: 'HYPE-USD',                          // Market to trade
    quantity: 1,                              // Quantity per trade
    cycles: 3,                                  // Number of complete cycles (open -> close)
    
    // Order management configuration
    maxRetries: 5,                              // Max retries for failed orders
    newOrderTimeout: 5 * 60 * 1000,             // 5 minutes - timeout for NEW orders before cancel/retry
    checkInterval: 1000,                        // 1 second - interval to check order status
    
    // Order types
    openOrderType: extendedEnum.order.type.limit,   // Use limit orders for opening
    closeOrderType: extendedEnum.order.type.limit,  // Use limit orders for closing
    side: extendedEnum.order.long,                   // Side for opening positions
    marketUnit: extendedEnum.order.quoteOnMainCoin,
    
    // Delays
    delayBetweenCycles: 2000,                   // 2 seconds delay between cycles
    delayAfterCancel: 1000,                     // 1 second delay after canceling order
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
 */
async function waitForOrderCompletion(extendedInstance, orderId, expectedStatus, timeout, onStatusUpdate = null) {
    const startTime = Date.now();
    let lastStatus = null;
    let statusCount = {};
    
    log(`Monitoring order ${orderId} - waiting for ${expectedStatus} (timeout: ${timeout/1000}s)`, 'ORDER');
    
    while (Date.now() - startTime < timeout) {
        try {
            const statusResponse = await extendedInstance.getOrderStatus(orderId);
            
            if (statusResponse.success) {
                const currentStatus = statusResponse.data.status;
                
                // Count status occurrences
                statusCount[currentStatus] = (statusCount[currentStatus] || 0) + 1;
                
                if (currentStatus !== lastStatus) {
                    log(`Order ${orderId} status: ${lastStatus} → ${currentStatus}`, 'ORDER');
                    lastStatus = currentStatus;
                    
                    if (onStatusUpdate) {
                        onStatusUpdate(currentStatus, statusResponse.data);
                    }
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
async function executeOpenCycle(extendedInstance, cycleNumber) {
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
        
        // Step 2: Monitor order until FILLED or timeout/failure
        const result = await waitForOrderCompletion(
            extendedInstance,
            orderId,
            ORDER_STATUS.FILLED,
            CONFIG.newOrderTimeout,
            (status, data) => {
                if (status === ORDER_STATUS.NEW) {
                    log(`Order ${orderId} is in order book, waiting for fill...`, 'INFO');
                }
                if (data.qtyExe && parseFloat(data.qtyExe) > 0) {
                    log(`📊 Partial fill detected - Executed: ${data.qtyExe} / ${data.qty} @ ${data.avgPrice}`, 'ORDER');
                }
            }
        );
        
        if (result.success && result.status === ORDER_STATUS.FILLED) {
            log(`🎯 Opening position FILLED successfully - Order: ${orderId}`, 'SUCCESS');
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
async function executeCloseCycle(extendedInstance, cycleNumber) {
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
            log(`✅ Close order placed successfully - ID: ${orderId}`, 'SUCCESS');
            
            // Step 2: Monitor close order
            const result = await waitForOrderCompletion(
                extendedInstance,
                orderId,
                ORDER_STATUS.FILLED,
                CONFIG.newOrderTimeout,
                (status, data) => {
                    if (status === ORDER_STATUS.NEW) {
                        log(`Close order ${orderId} is in order book, waiting for fill...`, 'INFO');
                    }
                    if (data.qtyExe && parseFloat(data.qtyExe) > 0) {
                        log(`📊 Partial close detected - Executed: ${data.qtyExe} / ${data.qty} @ ${data.avgPrice}`, 'ORDER');
                    }
                }
            );
            
            if (result.success && result.status === ORDER_STATUS.FILLED) {
                log(`🎯 Position CLOSED successfully - Order: ${orderId}`, 'SUCCESS');
                return { success: true, orderId, status: result.status, data: result.data };
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
        failedOrders: 0
    };
    
    try {
        // Test connection first
        log('Testing connection...', 'INFO');
        const connectionTest = await extendedInstance.checkPythonService();
        log('✅ Connection test successful', 'SUCCESS');
        
        // Main test loop
        for (let cycle = 1; cycle <= CONFIG.cycles; cycle++) {
            const cycleStart = Date.now();
            log(`\n${'='.repeat(60)}`, 'CYCLE');
            log(`🔄 CYCLE ${cycle}/${CONFIG.cycles} - STARTING`, 'CYCLE');
            log(`${'='.repeat(60)}`, 'CYCLE');
            
            const cycleResult = {
                cycleNumber: cycle,
                startTime: cycleStart,
                openPhase: null,
                closePhase: null,
                duration: 0,
                success: false
            };
            
            // Phase 1: Open position
            log(`\n📈 PHASE 1: Opening position...`, 'CYCLE');
            const openResult = await executeOpenCycle(extendedInstance, cycle);
            cycleResult.openPhase = openResult;
            testResults.totalOrders++;
            
            if (openResult.success) {
                testResults.successfulOrders++;
                log(`✅ Open phase completed successfully`, 'SUCCESS');
                
                // Small delay before closing
                await sleep(CONFIG.delayBetweenCycles);
                
                // Phase 2: Close position
                log(`\n📉 PHASE 2: Closing position...`, 'CYCLE');
                const closeResult = await executeCloseCycle(extendedInstance, cycle);
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
            
            cycleResult.duration = Date.now() - cycleStart;
            testResults.cycles.push(cycleResult);
            
            // Summary for this cycle
            log(`\n📊 CYCLE ${cycle} SUMMARY:`, 'INFO');
            log(`  Duration: ${(cycleResult.duration / 1000).toFixed(2)}s`, 'INFO');
            log(`  Open: ${openResult.success ? '✅' : '❌'}`, 'INFO');
            log(`  Close: ${cycleResult.closePhase ? (cycleResult.closePhase.success ? '✅' : '❌') : '➖'}`, 'INFO');
            
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
