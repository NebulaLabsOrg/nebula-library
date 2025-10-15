import { Extended, extendedEnum } from '../index.js';
import { TokenBucketThrottler } from '../../../../../utils/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../example/.env') });

const CONFIG = {
    market: 'PUMP-USD',
    quantity: 100000,
    cycles: 3,
    maxRetries: 10,
    newOrderTimeout: 120000,
    checkInterval: 1000,
    openOrderType: extendedEnum.order.type.limit,
    closeOrderType: extendedEnum.order.type.limit,
    side: extendedEnum.order.short,
    marketUnit: extendedEnum.order.quoteOnMainCoin,
    delayBetweenCycles: 2000,
    delayAfterCancel: 1000,
    onchainHedging: {
        enabled: true,
        tokenSymbol: 'PUMP',
        slippage: 0.5,
        minTradeAmount: 0.001
    }
};

const ORDER_STATUS = {
    NEW: 'NEW',
    FILLED: 'FILLED',
    UNTRIGGERED: 'UNTRIGGERED',
    CANCELLED: 'CANCELLED',
    REJECTED: 'REJECTED',
    EXPIRED: 'EXPIRED'
};

class PositionTracker {
    constructor() {
        this.perpPosition = 0;
        this.onchainPosition = 0;
        this.targetHedgeRatio = 1.0;
        this.trades = [];
    }
    updatePerpPosition(side, quantity) {
        const mult = side === extendedEnum.order.long ? 1 : -1;
        this.perpPosition += quantity * mult;
        log(`Perp updated: ${this.perpPosition.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
    }
    updateOnchainPosition(side, quantity) {
        const mult = side === 'BUY' ? 1 : -1;
        this.onchainPosition += quantity * mult;
        log(`On-chain updated: ${this.onchainPosition.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
    }
    getRequiredHedge() {
        return -this.perpPosition * this.targetHedgeRatio - this.onchainPosition;
    }
    isBalanced(tol = 0.001) {
        return Math.abs(this.getRequiredHedge()) < tol;
    }
    getStatus() {
        return {
            perpPosition: this.perpPosition,
            onchainPosition: this.onchainPosition,
            requiredHedge: this.getRequiredHedge(),
            isBalanced: this.isBalanced(),
            totalTrades: this.trades.length
        };
    }
    addTrade(trade) {
        this.trades.push({ ...trade, timestamp: new Date().toISOString() });
    }
    reset() {
        this.perpPosition = 0;
        this.onchainPosition = 0;
        this.trades = [];
        log('PositionTracker reset', 'INFO');
    }
}

async function executeOnchainTrade(side, amount, price, reason = '') {
    if (!CONFIG.onchainHedging.enabled)
        return { success: false, reason: 'On-chain disabled' };
    if (Math.abs(amount) < CONFIG.onchainHedging.minTradeAmount) {
        log(`On-chain trade too small (${amount.toFixed(6)})`, 'WARNING');
        return { success: false, reason: 'Below min trade amount' };
    }
    const priceWithSlip = side === 'BUY'
        ? price * (1 + CONFIG.onchainHedging.slippage / 100)
        : price * (1 - CONFIG.onchainHedging.slippage / 100);
    await sleep(500 + Math.random() * 1000);
    log(`${side} on-chain ${Math.abs(amount).toFixed(6)} @ $${priceWithSlip.toFixed(4)} | Reason: ${reason}`, 'SUCCESS');
    return { success: true, trade: { side, amount: Math.abs(amount), price: priceWithSlip, totalCost: Math.abs(amount)*priceWithSlip, reason, success: true } };
}

async function executeHedge(positionTracker, perpSide, perpQuantity, perpPrice, reason) {
    if (!CONFIG.onchainHedging.enabled) return { success: false };
    positionTracker.updatePerpPosition(perpSide, perpQuantity);
    const requiredHedge = positionTracker.getRequiredHedge();
    if (Math.abs(requiredHedge) < CONFIG.onchainHedging.minTradeAmount) {
        log(`No hedge needed (${requiredHedge.toFixed(6)})`, 'INFO');
        return { success: true, reason: 'No hedge needed' };
    }
    const onchainSide = requiredHedge > 0 ? 'BUY' : 'SELL';
    const tradeResult = await executeOnchainTrade(onchainSide, Math.abs(requiredHedge), perpPrice, reason);
    if (tradeResult.success) {
        positionTracker.updateOnchainPosition(onchainSide, Math.abs(requiredHedge));
        positionTracker.addTrade(tradeResult.trade);
        const status = positionTracker.getStatus();
        log(`Hedge: Perp ${status.perpPosition.toFixed(4)}, On-chain ${status.onchainPosition.toFixed(4)}, Balanced: ${status.isBalanced ? 'YES' : 'NO'}`, 'INFO');
        return { success: true, trade: tradeResult.trade, status };
    }
    return tradeResult;
}

async function executeFinalBalancing(positionTracker, marketPrice, reason) {
    if (!CONFIG.onchainHedging.enabled) return { success: false };
    const status = positionTracker.getStatus();
    if (status.isBalanced) {
        log(`Already balanced`, 'SUCCESS');
        return { success: true, reason: 'Already balanced' };
    }
    const requiredHedge = status.requiredHedge;
    const onchainSide = requiredHedge > 0 ? 'BUY' : 'SELL';
    if (Math.abs(requiredHedge) < CONFIG.onchainHedging.minTradeAmount) {
        log(`Final balancing not needed (${requiredHedge.toFixed(6)})`, 'INFO');
        return { success: true, reason: 'Within tolerance' };
    }
    log(`Final balancing: ${onchainSide} ${Math.abs(requiredHedge).toFixed(6)}`, 'WARNING');
    const tradeResult = await executeOnchainTrade(onchainSide, Math.abs(requiredHedge), marketPrice, reason);
    if (tradeResult.success) {
        positionTracker.updateOnchainPosition(onchainSide, Math.abs(requiredHedge));
        positionTracker.addTrade(tradeResult.trade);
        const finalStatus = positionTracker.getStatus();
        log(`Final: Perp ${finalStatus.perpPosition.toFixed(4)}, On-chain ${finalStatus.onchainPosition.toFixed(4)}, Balanced: ${finalStatus.isBalanced ? 'YES' : 'NO'}`, 'SUCCESS');
        return { success: true, trade: tradeResult.trade, finalStatus };
    }
    return tradeResult;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function getTimestamp() { return new Date().toISOString(); }
function log(message, type = 'INFO') {
    const colors = {
        INFO: '\x1b[36m', SUCCESS: '\x1b[32m', WARNING: '\x1b[33m', ERROR: '\x1b[31m', CYCLE: '\x1b[35m', ORDER: '\x1b[34m', REJECT: '\x1b[31m'
    };
    const reset = '\x1b[0m';
    const timestamp = getTimestamp();
    console.log(`${colors[type] || ''}[${timestamp}] [${type}] ${message}${reset}`);
}

// Waits for order to fill/finish, triggers hedge per fill
async function waitForOrderCompletion(extendedInstance, orderId, expectedStatus, timeout, positionTracker, perpSide, onStatusUpdate = null) {
    const startTime = Date.now();
    let lastStatus = null, lastExecutedQty = 0, statusCount = {};
    let hasTimeoutLogged = false;
    while (Date.now() - startTime < timeout) {
        try {
            const statusResponse = await extendedInstance.getOrderStatus(orderId);
            if (statusResponse.success) {
                const currentStatus = statusResponse.data.status;
                const currentExecutedQty = parseFloat(statusResponse.data.qtyExe || 0);
                const avgPrice = parseFloat(statusResponse.data.avgPrice || 0);
                statusCount[currentStatus] = (statusCount[currentStatus] || 0) + 1;
                if (currentStatus !== lastStatus) {
                    if (currentStatus === ORDER_STATUS.REJECTED) {
                        log(`Order status: ${lastStatus} → ${currentStatus}`, 'REJECT');
                    } else {
                        log(`Order status: ${lastStatus} → ${currentStatus}`, 'ORDER');
                    }
                    lastStatus = currentStatus;
                    if (onStatusUpdate) onStatusUpdate(currentStatus, statusResponse.data);
                }
                if (currentExecutedQty > lastExecutedQty && avgPrice > 0) {
                    const newFillQty = currentExecutedQty - lastExecutedQty;
                    await executeHedge(positionTracker, perpSide, newFillQty, avgPrice,
                        currentStatus === ORDER_STATUS.FILLED
                            ? `Full fill - Order ${orderId}`
                            : `Partial fill - Order ${orderId} (${newFillQty.toFixed(6)}/${statusResponse.data.qty})`
                    );
                    lastExecutedQty = currentExecutedQty;
                }
                if (currentStatus === expectedStatus)
                    return { success: true, status: currentStatus, data: statusResponse.data, statusCount };
                if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.EXPIRED].includes(currentStatus))
                    return { success: false, status: currentStatus, data: statusResponse.data, statusCount };
            }
        } catch (error) { log(`Order status error: ${error.message}`, 'ERROR'); }
        await sleep(CONFIG.checkInterval);
    }
    if (!hasTimeoutLogged) {
        log(`Order ${orderId} timed out after ${CONFIG.newOrderTimeout/1000}s in NEW, cancelling...`, 'WARNING');
    }
    return { success: false, status: lastStatus, timeout: true, statusCount };
}

async function placeOrderWithRetry(extendedInstance, type, symbol, side, marketUnit, quantity, maxRetries) {
    let attempt = 0;
    while (attempt < maxRetries) {
        attempt++;
        log(`Placing ${side} order - \x1b[33mAttempt ${attempt}/${maxRetries}\x1b[0m | Qty: ${quantity} ${symbol}`, 'ORDER');
        try {
            const response = await extendedInstance.submitOrder(type, symbol, side, marketUnit, quantity);
            if (response.success) {
                log(`Order opened, ID: ${response.data.orderId}`, 'SUCCESS');
                return { success: true, orderId: response.data.orderId, attempts: attempt };
            } else {
                log(`Placement failed: ${response.message}`, 'ERROR');
                if (attempt === maxRetries) return { success: false, error: response.message, attempts: attempt };
                await sleep(CONFIG.delayAfterCancel);
            }
        } catch (error) {
            log(`Placement error: ${error.message}`, 'ERROR');
            if (attempt === maxRetries) return { success: false, error: error.message, attempts: attempt };
            await sleep(CONFIG.delayAfterCancel);
        }
    }
}

async function cancelOrder(extendedInstance, orderId) {
    try {
        log(`Cancel order ${orderId}`, 'ORDER');
        const cancelResponse = await extendedInstance.submitCancelOrder(orderId);
        if (cancelResponse.success) {
            log(`Order ${orderId} cancelled`, 'SUCCESS');
            return true;
        } else {
            log(`Cancel failed: ${cancelResponse.message} [Order ID: ${orderId}]`, 'ERROR');
            return false;
        }
    } catch (error) {
        log(`Cancel error: ${error.message} [Order ID: ${orderId}]`, 'ERROR');
        return false;
    }
}

async function executeOpenCycle(extendedInstance, cycleNumber, positionTracker) {
    log(`Start OPEN cycle ${cycleNumber}/${CONFIG.cycles}`, 'CYCLE');
    let attempt = 0;
    while (attempt < CONFIG.maxRetries) {
        attempt++;
        log(`Open order \x1b[33mAttempt ${attempt}/${CONFIG.maxRetries}\x1b[0m`, 'ORDER');
        const openResult = await placeOrderWithRetry(
            extendedInstance,
            CONFIG.openOrderType,
            CONFIG.market,
            CONFIG.side,
            CONFIG.marketUnit,
            CONFIG.quantity,
            1
        );
        if (!openResult.success) {
            log(`Open failed: ${openResult.error} (Cycle ${cycleNumber})`, 'ERROR');
            if (attempt === CONFIG.maxRetries) return { success: false, error: 'Max retries open' };
            continue;
        }
        const orderId = openResult.orderId;
        const result = await waitForOrderCompletion(
            extendedInstance,
            orderId,
            ORDER_STATUS.FILLED,
            CONFIG.newOrderTimeout,
            positionTracker,
            CONFIG.side,
            (status, data) => { if (status === ORDER_STATUS.NEW) log(`Order in book`, 'INFO'); }
        );
        if (result.success && result.status === ORDER_STATUS.FILLED) {
            log(`Open FILLED (Cycle ${cycleNumber})`, 'SUCCESS');
            return { success: true, orderId, status: result.status, data: result.data };
        }
        if (result.status === ORDER_STATUS.NEW && result.timeout) {
            log(`Order ${orderId} was NEW for ${CONFIG.newOrderTimeout / 1000}s, cancelling now...`, 'WARNING');
            await cancelOrder(extendedInstance, orderId);
            await sleep(CONFIG.delayAfterCancel);
        } else if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.EXPIRED].includes(result.status)) {
            await sleep(CONFIG.delayAfterCancel);
        }
    }
    return { success: false, error: 'Max retries open' };
}

async function executeCloseCycle(extendedInstance, cycleNumber, positionTracker) {
    log(`Start CLOSE cycle ${cycleNumber}/${CONFIG.cycles}`, 'CYCLE');
    let attempt = 0;
    while (attempt < CONFIG.maxRetries) {
        attempt++;
        log(`Close order \x1b[33mAttempt ${attempt}/${CONFIG.maxRetries}\x1b[0m`, 'ORDER');
        try {
            const closeResponse = await extendedInstance.submitCloseOrder(
                CONFIG.closeOrderType,
                CONFIG.market,
                CONFIG.marketUnit,
                CONFIG.quantity,
                false
            );
            if (!closeResponse.success) {
                log(`Close failed: ${closeResponse.message} (Cycle ${cycleNumber})`, 'ERROR');
                if (attempt === CONFIG.maxRetries) return { success: false, error: 'Max retries close' };
                await sleep(CONFIG.delayAfterCancel);
                continue;
            }
            const orderId = closeResponse.data.orderId;
            log(`Close order opened, ID: ${orderId}`, 'SUCCESS');
            const closeSide = CONFIG.side === extendedEnum.order.long ? extendedEnum.order.short : extendedEnum.order.long;
            const result = await waitForOrderCompletion(
                extendedInstance,
                orderId,
                ORDER_STATUS.FILLED,
                CONFIG.newOrderTimeout,
                positionTracker,
                closeSide,
                (status, data) => { if (status === ORDER_STATUS.NEW) log(`Close in book`, 'INFO'); }
            );
            if (result.success && result.status === ORDER_STATUS.FILLED) {
                log(`CLOSE FILLED (Cycle ${cycleNumber})`, 'SUCCESS');
                const avgPrice = parseFloat(result.data.avgPrice || 0);
                const balancingResult = await executeFinalBalancing(
                    positionTracker,
                    avgPrice,
                    `Final after close - Cycle ${cycleNumber}`
                );
                if (balancingResult.success) log(`Final balancing OK (Cycle ${cycleNumber})`, 'SUCCESS');
                else log(`Final balancing failed: ${balancingResult.reason || 'Error'} (Cycle ${cycleNumber})`, 'WARNING');
                return {
                    success: true,
                    orderId,
                    status: result.status,
                    data: result.data,
                    finalBalance: positionTracker.getStatus(),
                    balancingTrade: balancingResult.trade || null
                };
            }
            if (result.status === ORDER_STATUS.NEW && result.timeout) {
                log(`Order ${orderId} was NEW for ${CONFIG.newOrderTimeout / 1000}s, cancelling now...`, 'WARNING');
                await cancelOrder(extendedInstance, orderId);
                await sleep(CONFIG.delayAfterCancel);
            } else if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.EXPIRED].includes(result.status)) {
                await sleep(CONFIG.delayAfterCancel);
            }
        } catch (error) {
            log(`Close error: ${error.message} (Cycle ${cycleNumber})`, 'ERROR');
            if (attempt === CONFIG.maxRetries) return { success: false, error: error.message };
            await sleep(CONFIG.delayAfterCancel);
        }
    }
    return { success: false, error: 'Max retries close' };
}

async function runStressTest() {
    log('Starting stress test', 'CYCLE');
    log(`Config: ${CONFIG.cycles} cycles, ${CONFIG.quantity} ${CONFIG.market}, ${CONFIG.maxRetries} retries`, 'INFO');
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
        log('Test connection...', 'INFO');
        await extendedInstance.checkPythonService();
        log('Connection OK', 'SUCCESS');
        const positionTracker = new PositionTracker();
        log(`Hedging ${CONFIG.onchainHedging.enabled ? 'ON' : 'OFF'}`, 'INFO');
        for (let cycle = 1; cycle <= CONFIG.cycles; cycle++) {
            let closeResult = null;
            const cycleStart = Date.now();
            log('='.repeat(60), 'CYCLE');
            log(`CYCLE ${cycle}/${CONFIG.cycles} - START`, 'CYCLE');
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
            log(`OPEN... (Cycle ${cycle})`, 'CYCLE');
            const openResult = await executeOpenCycle(extendedInstance, cycle, positionTracker);
            cycleResult.openPhase = openResult;
            testResults.totalOrders++;
            if (openResult.success) {
                testResults.successfulOrders++;
                await sleep(CONFIG.delayBetweenCycles);
                log(`CLOSE... (Cycle ${cycle})`, 'CYCLE');
                closeResult = await executeCloseCycle(extendedInstance, cycle, positionTracker);
                cycleResult.closePhase = closeResult;
                testResults.totalOrders++;
                if (closeResult.success) {
                    testResults.successfulOrders++;
                    cycleResult.success = true;
                    testResults.successfulCycles++;
                    log(`CYCLE ${cycle} OK`, 'SUCCESS');
                } else {
                    testResults.failedOrders++;
                    testResults.failedCycles++;
                    log(`Close failed: ${closeResult.error} (Cycle ${cycle})`, 'ERROR');
                }
            } else {
                testResults.failedOrders++;
                testResults.failedCycles++;
                log(`Open failed: ${openResult.error} (Cycle ${cycle})`, 'ERROR');
            }
            const hedgeStatus = positionTracker.getStatus();
            cycleResult.hedgingStats = {
                tradesExecuted: hedgeStatus.totalTrades,
                totalHedgeVolume: positionTracker.trades.reduce((sum, trade) => sum + trade.amount, 0),
                finalBalance: hedgeStatus
            };
            testResults.hedgeStats.totalHedgeTrades += hedgeStatus.totalTrades;
            testResults.hedgeStats.successfulHedges += positionTracker.trades.filter(t => t.success).length;
            testResults.hedgeStats.failedHedges += positionTracker.trades.filter(t => !t.success).length;
            cycleResult.duration = Date.now() - cycleStart;
            testResults.cycles.push(cycleResult);
            log(`CYCLE ${cycle} SUMMARY:`, 'INFO');
            log(`  Duration: ${(cycleResult.duration / 1000).toFixed(2)}s`, 'INFO');
            log(`  Open: ${openResult.success ? 'YES' : 'NO'}`, 'INFO');
            log(`  Close: ${closeResult && closeResult.success ? 'YES' : (closeResult ? 'NO' : '-')}`, 'INFO');
            if (CONFIG.onchainHedging.enabled) {
                log(`  Hedge Trades: ${cycleResult.hedgingStats.tradesExecuted}`, 'INFO');
                log(`  Hedge Volume: ${cycleResult.hedgingStats.totalHedgeVolume.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
                log(`  Final: ${hedgeStatus.isBalanced ? 'YES' : 'NO'}`, 'INFO');
            }
            if (cycle < CONFIG.cycles) {
                log(`Wait ${CONFIG.delayBetweenCycles}ms before next cycle...`, 'INFO');
                await sleep(CONFIG.delayBetweenCycles);
            }
        }
    } catch (error) {
        log(`Fatal error: ${error.message}`, 'ERROR');
        testResults.fatalError = error.message;
    }
    testResults.endTime = Date.now();
    testResults.totalDuration = testResults.endTime - testResults.startTime;
    log('='.repeat(80), 'CYCLE');
    log(`STRESS TEST COMPLETED`, 'CYCLE');
    log('='.repeat(80), 'CYCLE');
    log(`FINAL RESULTS:`, 'SUCCESS');
    log(`  Total Duration: ${(testResults.totalDuration / 1000).toFixed(2)}s`, 'INFO');
    log(`  Successful Cycles: ${testResults.successfulCycles}/${testResults.totalCycles}`, 'SUCCESS');
    log(`  Failed Cycles: ${testResults.failedCycles}/${testResults.totalCycles}`, 'ERROR');
    log(`  Successful Orders: ${testResults.successfulOrders}/${testResults.totalOrders}`, 'SUCCESS');
    log(`  Failed Orders: ${testResults.failedOrders}/${testResults.totalOrders}`, 'ERROR');
    if (CONFIG.onchainHedging.enabled) {
        log(`HEDGING:`, 'SUCCESS');
        log(`  Hedge Trades: ${testResults.hedgeStats.totalHedgeTrades}`, 'INFO');
        log(`  Hedge OK: ${testResults.hedgeStats.successfulHedges}/${testResults.hedgeStats.totalHedgeTrades}`, 'SUCCESS');
        log(`  Hedge FAIL: ${testResults.hedgeStats.failedHedges}`, 'ERROR');
        const totalHedgeVolume = testResults.cycles.reduce((sum, cycle) => sum + (cycle.hedgingStats?.totalHedgeVolume || 0), 0);
        log(`  Total hedge volume: ${totalHedgeVolume.toFixed(4)} ${CONFIG.onchainHedging.tokenSymbol}`, 'INFO');
    }
    if (testResults.cycles.length > 0) {
        const avgCycleDuration = testResults.cycles.reduce((sum, cycle) => sum + cycle.duration, 0) / testResults.cycles.length;
        log(`  Avg cycle duration: ${(avgCycleDuration / 1000).toFixed(2)}s`, 'INFO');
    }
    return testResults;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runStressTest()
        .then(results => {
            log('Stress test completed', 'SUCCESS');
            process.exit(results.successfulCycles === results.totalCycles ? 0 : 1);
        })
        .catch(error => {
            log(`Stress test failed: ${error.message}`, 'ERROR');
            process.exit(1);
        });
}

export { runStressTest, CONFIG };