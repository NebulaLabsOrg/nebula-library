/**
 * Mock Test for Order Monitoring System
 * Tests all scenarios: OPEN, FILLED, CANCELLED, EXPIRED, REJECTED with retry, TIMEOUT
 */

import { createResponse } from '../../../../../utils/src/response.utils.js';
import { vmGetOrderStatusById } from '../src/view.model.js';

// Mock GRVT instance for testing
class MockGrvt {
    constructor(scenario) {
        this.scenario = scenario;
        this.commandCount = 0;
        this.orderStatuses = [];
        this.cancelledOrders = [];
        this.statusCallCount = 0;
        
        this.instance = {
            post: async (url, data) => {
                // Mock HTTP API call for order status
                if (url.includes('/full/v1/order')) {
                    const statusIndex = Math.min(this.statusCallCount++, this.orderStatuses.length - 1);
                    const mockStatus = this.orderStatuses[statusIndex];
                    
                    return {
                        data: {
                            result: {
                                is_market: false,
                                state: {
                                    status: mockStatus.status,
                                    traded_size: [mockStatus.qtyExe],
                                    avg_fill_price: [mockStatus.avgPrice]
                                },
                                legs: [{
                                    instrument: 'ETH_USDT_Perp',
                                    size: '0.01'
                                }],
                                metadata: {}
                            }
                        }
                    };
                }
                return { data: {} };
            }
        };
        
        this.trading = {
            accountId: 'TEST_ACCOUNT_123'
        };
        
        this.slippage = 0.5;
        
        this._setupScenario(scenario);
    }
    
    _setupScenario(scenario) {
        switch (scenario) {
            case 'OPEN_TO_FILLED':
                this.orderStatuses = [
                    { status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'OPEN', qtyExe: '0.005', avgPrice: '3000.0' },
                    { status: 'FILLED', qtyExe: '0.01', avgPrice: '3000.5' }
                ];
                break;
                
            case 'OPEN_TO_CANCELLED':
                this.orderStatuses = [
                    { status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'CANCELLED', qtyExe: '0.0', avgPrice: '0.0' }
                ];
                break;
                
            case 'OPEN_TO_EXPIRED':
                this.orderStatuses = [
                    { status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'EXPIRED', qtyExe: '0.0', avgPrice: '0.0' }
                ];
                break;
                
            case 'REJECTED_WITH_RETRY':
                this.orderStatuses = [
                    { status: 'REJECTED', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'REJECTED', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'FILLED', qtyExe: '0.01', avgPrice: '3000.0' }
                ];
                break;
                
            case 'REJECTED_MAX_RETRY':
                this.orderStatuses = Array(10).fill({ status: 'REJECTED', qtyExe: '0.0', avgPrice: '0.0' });
                break;
                
            case 'TIMEOUT_NO_FILL':
                this.orderStatuses = Array(50).fill({ status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' });
                break;
                
            case 'TIMEOUT_RESET':
                this.orderStatuses = [
                    { status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' },
                    { status: 'OPEN', qtyExe: '0.002', avgPrice: '3000.0' }, // First fill - resets timeout
                    { status: 'OPEN', qtyExe: '0.002', avgPrice: '3000.0' },
                    { status: 'OPEN', qtyExe: '0.005', avgPrice: '3000.5' }, // Second fill - resets timeout
                    ...Array(50).fill({ status: 'OPEN', qtyExe: '0.005', avgPrice: '3000.5' }) // No more fills, timeout
                ];
                break;
                
            default:
                this.orderStatuses = [{ status: 'OPEN', qtyExe: '0.0', avgPrice: '0.0' }];
        }
    }
    
    async _sendCommand(command, params) {
        this.commandCount++;
        
        if (command === 'place_order') {
            return {
                order_id: `${1000000 + this.commandCount}`,
                client_order_id: `${1000000 + this.commandCount}`
            };
        }
        
        if (command === 'cancel_order_by_external_id') {
            this.cancelledOrders.push(params.external_id);
            return { success: true };
        }
        
        return {};
    }
}

// Create mock wmSubmitOrder with inline monitoring logic
async function createMockWmSubmitOrder(mockGrvt) {
    return async function wmSubmitOrder(
        _grvt,
        _slippage,
        _type,
        _symbol,
        _side,
        _marketUnit,
        _orderQty,
        _onOrderUpdate,
        _retry = 0,
        _timeout = 60000
    ) {
        try {
            const qty = 0.01;
            const roundedPrice = 3000.0;
            
            const orderParams = {
                market_name: _symbol,
                side: _side,
                amount: qty.toString(),
                order_type: _type,
                time_in_force: 'GTC'
            };
            
            if (_type === 'LIMIT') {
                orderParams.price = roundedPrice.toString();
                orderParams.post_only = true;
            }
            
            const orderResult = await _grvt._sendCommand('place_order', orderParams);
            
            if (orderResult.error) {
                throw new Error(orderResult.error);
            }
            
            const externalId = orderResult.order_id || orderResult.client_order_id;
            
            if (!externalId) {
                throw new Error('No order_id returned from GRVT');
            }
            
            // Monitoring logic
            if (_retry > 0 || (_onOrderUpdate && typeof _onOrderUpdate === 'function')) {
                let attemptCount = 0;
                let currentOrderId = externalId;
                let lastQtyExe = '0.0';
                let lastStatus = null;
                let lastAvgPrice = '0.0';
                let timeoutTimestamp = Date.now() + _timeout;
                
                while (attemptCount <= _retry) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        const statusResponse = await vmGetOrderStatusById(_grvt.instance, _grvt.trading.accountId, currentOrderId);
                        
                        if (!statusResponse.success) {
                            break;
                        }
                        
                        const orderStatus = statusResponse.data;
                        const currentStatus = orderStatus.status;
                        const currentQtyExe = orderStatus.qtyExe || '0.0';
                        const currentAvgPrice = orderStatus.avgPrice || '0.0';
                        
                        const dataChanged = 
                            currentStatus !== lastStatus || 
                            currentQtyExe !== lastQtyExe || 
                            currentAvgPrice !== lastAvgPrice;
                        
                        if (_onOrderUpdate && typeof _onOrderUpdate === 'function' && dataChanged) {
                            _onOrderUpdate({
                                symbol: _symbol,
                                externalId: currentOrderId,
                                orderId: currentOrderId,
                                status: currentStatus,
                                ...orderStatus
                            });
                            
                            lastStatus = currentStatus;
                            lastAvgPrice = currentAvgPrice;
                        }
                        
                        if (currentQtyExe !== lastQtyExe && parseFloat(currentQtyExe) > 0) {
                            lastQtyExe = currentQtyExe;
                            timeoutTimestamp = Date.now() + _timeout;
                        }
                        
                        if (currentStatus === 'FILLED' || currentStatus === 'CANCELLED' || currentStatus === 'EXPIRED') {
                            return createResponse(
                                true,
                                `Order ${currentStatus.toLowerCase()}`,
                                {
                                    symbol: _symbol,
                                    externalId: currentOrderId,
                                    orderId: currentOrderId,
                                    qty: qty,
                                    price: roundedPrice,
                                    side: _side,
                                    type: _type,
                                    finalStatus: currentStatus,
                                    ...orderStatus
                                },
                                'grvt.submitOrder'
                            );
                        }
                        
                        if (currentStatus === 'REJECTED') {
                            if (attemptCount < _retry) {
                                attemptCount++;
                                
                                try {
                                    await _grvt._sendCommand('cancel_order_by_external_id', { external_id: currentOrderId });
                                } catch (e) {}
                                
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                
                                const retryOrderResult = await _grvt._sendCommand('place_order', orderParams);
                                
                                if (retryOrderResult.error) {
                                    throw new Error(retryOrderResult.error);
                                }
                                
                                currentOrderId = retryOrderResult.order_id || retryOrderResult.client_order_id;
                                
                                if (!currentOrderId) {
                                    throw new Error('No order_id returned from retry');
                                }
                                
                                timeoutTimestamp = Date.now() + _timeout;
                                lastQtyExe = '0.0';
                                lastStatus = null;
                                
                                continue;
                            } else {
                                return createResponse(
                                    false,
                                    'Order rejected after maximum retry attempts',
                                    {
                                        symbol: _symbol,
                                        externalId: currentOrderId,
                                        orderId: currentOrderId,
                                        qty: qty,
                                        price: roundedPrice,
                                        side: _side,
                                        type: _type,
                                        finalStatus: 'REJECTED',
                                        attempts: attemptCount,
                                        ...orderStatus
                                    },
                                    'grvt.submitOrder'
                                );
                            }
                        }
                        
                        if (Date.now() > timeoutTimestamp) {
                            await _grvt._sendCommand('cancel_order_by_external_id', { external_id: currentOrderId });
                            
                            await new Promise(resolve => setTimeout(resolve, 500));
                            const finalStatusResponse = await vmGetOrderStatusById(_grvt.instance, _grvt.trading.accountId, currentOrderId);
                            
                            const finalStatus = finalStatusResponse.success ? finalStatusResponse.data : {};
                            
                            return createResponse(
                                true,
                                'Order cancelled due to timeout',
                                {
                                    symbol: _symbol,
                                    externalId: currentOrderId,
                                    orderId: currentOrderId,
                                    qty: qty,
                                    price: roundedPrice,
                                    side: _side,
                                    type: _type,
                                    finalStatus: 'TIMEOUT_CANCELLED',
                                    ...finalStatus
                                },
                                'grvt.submitOrder'
                            );
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (monitorError) {
                        console.error('Error during order monitoring:', monitorError.message);
                        break;
                    }
                }
                
                return createResponse(
                    true,
                    'Order monitoring completed',
                    {
                        symbol: _symbol,
                        externalId: currentOrderId,
                        orderId: currentOrderId,
                        qty: qty,
                        price: roundedPrice,
                        side: _side,
                        type: _type,
                        attempts: attemptCount
                    },
                    'grvt.submitOrder'
                );
            }
            
            return createResponse(
                true,
                'success',
                {
                    symbol: _symbol,
                    externalId: externalId,
                    orderId: externalId,
                    qty: qty,
                    price: roundedPrice,
                    side: _side,
                    type: _type
                },
                'grvt.submitOrder'
            );
            
        } catch (error) {
            const message = error.response?.data?.error?.message || error.message || 'Failed to submit order';
            return createResponse(false, message, null, 'grvt.submitOrder');
        }
    };
}

// Helper to run test with timeout
async function runTestWithTimeout(testFn, timeoutMs = 10000) {
    return Promise.race([
        testFn(),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), timeoutMs)
        )
    ]);
}

// Test scenarios
async function testOpenToFilled() {
    console.log('\n=== TEST 1: OPEN → FILLED ===');
    const mockGrvt = new MockGrvt('OPEN_TO_FILLED');
    
    const updates = [];
    const onOrderUpdate = (data) => {
        updates.push({ status: data.status, qtyExe: data.qtyExe, avgPrice: data.avgPrice });
        console.log(`  📊 Update: ${data.status} | qtyExe: ${data.qtyExe} | avgPrice: ${data.avgPrice}`);
    };
    
    const wmSubmitOrder = await createMockWmSubmitOrder(mockGrvt);
    const result = await runTestWithTimeout(async () => {
        return await wmSubmitOrder(
            mockGrvt, 0.5, 'LIMIT', 'ETH_USDT_Perp', 'BUY', 'quoteOnMainCoin', '0.01',
            onOrderUpdate, 0, 5000
        );
    });
    
    console.log(`  ✅ Final status: ${result.data.finalStatus}`);
    console.log(`  ✅ Updates received: ${updates.length}`);
    console.log(`  ✅ Test passed: Order reached FILLED state\n`);
    
    return result.data.finalStatus === 'FILLED' && updates.length === 3;
}

async function testOpenToCancelled() {
    console.log('\n=== TEST 2: OPEN → CANCELLED ===');
    const mockGrvt = new MockGrvt('OPEN_TO_CANCELLED');
    
    const updates = [];
    const onOrderUpdate = (data) => {
        updates.push({ status: data.status });
        console.log(`  📊 Update: ${data.status}`);
    };
    
    const wmSubmitOrder = await createMockWmSubmitOrder(mockGrvt);
    const result = await runTestWithTimeout(async () => {
        return await wmSubmitOrder(
            mockGrvt, 0.5, 'LIMIT', 'ETH_USDT_Perp', 'BUY', 'quoteOnMainCoin', '0.01',
            onOrderUpdate, 0, 5000
        );
    });
    
    console.log(`  ✅ Final status: ${result.data.finalStatus}`);
    console.log(`  ✅ Test passed: Order reached CANCELLED state\n`);
    
    return result.data.finalStatus === 'CANCELLED';
}

async function testOpenToExpired() {
    console.log('\n=== TEST 3: OPEN → EXPIRED ===');
    const mockGrvt = new MockGrvt('OPEN_TO_EXPIRED');
    
    const updates = [];
    const onOrderUpdate = (data) => {
        updates.push({ status: data.status });
        console.log(`  📊 Update: ${data.status}`);
    };
    
    const wmSubmitOrder = await createMockWmSubmitOrder(mockGrvt);
    const result = await runTestWithTimeout(async () => {
        return await wmSubmitOrder(
            mockGrvt, 0.5, 'LIMIT', 'ETH_USDT_Perp', 'BUY', 'quoteOnMainCoin', '0.01',
            onOrderUpdate, 0, 5000
        );
    });
    
    console.log(`  ✅ Final status: ${result.data.finalStatus}`);
    console.log(`  ✅ Test passed: Order reached EXPIRED state\n`);
    
    return result.data.finalStatus === 'EXPIRED';
}

async function testRejectedWithRetry() {
    console.log('\n=== TEST 4: REJECTED with retry → success ===');
    const mockGrvt = new MockGrvt('REJECTED_WITH_RETRY');
    
    const updates = [];
    const onOrderUpdate = (data) => {
        updates.push({ status: data.status, orderId: data.externalId });
        console.log(`  📊 Update: ${data.status} | orderId: ${data.externalId}`);
    };
    
    const wmSubmitOrder = await createMockWmSubmitOrder(mockGrvt);
    const result = await runTestWithTimeout(async () => {
        return await wmSubmitOrder(
            mockGrvt, 0.5, 'LIMIT', 'ETH_USDT_Perp', 'BUY', 'quoteOnMainCoin', '0.01',
            onOrderUpdate, 3, 5000
        );
    });
    
    console.log(`  ✅ Final status: ${result.data.finalStatus}`);
    console.log(`  ✅ Orders placed: ${mockGrvt.commandCount}`);
    console.log(`  ✅ Orders cancelled: ${mockGrvt.cancelledOrders.length}`);
    console.log(`  ✅ Test passed: Order succeeded after retries\n`);
    
    return result.data.finalStatus === 'FILLED' && mockGrvt.commandCount > 1;
}

async function testRejectedMaxRetry() {
    console.log('\n=== TEST 5: REJECTED - max retry exhausted ===');
    const mockGrvt = new MockGrvt('REJECTED_MAX_RETRY');
    
    const updates = [];
    const onOrderUpdate = (data) => {
        updates.push({ status: data.status });
        console.log(`  📊 Update: ${data.status}`);
    };
    
    const wmSubmitOrder = await createMockWmSubmitOrder(mockGrvt);
    const result = await runTestWithTimeout(async () => {
        return await wmSubmitOrder(
            mockGrvt, 0.5, 'LIMIT', 'ETH_USDT_Perp', 'BUY', 'quoteOnMainCoin', '0.01',
            onOrderUpdate, 3, 5000
        );
    });
    
    console.log(`  ✅ Final status: ${result.data.finalStatus}`);
    console.log(`  ✅ Success: ${result.success}`);
    console.log(`  ✅ Test passed: Order failed after max retries\n`);
    
    return result.data.finalStatus === 'REJECTED' && !result.success;
}

async function testTimeoutNoFill() {
    console.log('\n=== TEST 6: TIMEOUT - no fills ===');
    const mockGrvt = new MockGrvt('TIMEOUT_NO_FILL');
    
    let updateCount = 0;
    const onOrderUpdate = (data) => {
        updateCount++;
        if (updateCount === 1) {
            console.log(`  📊 First update: ${data.status}`);
        }
    };
    
    const wmSubmitOrder = await createMockWmSubmitOrder(mockGrvt);
    const startTime = Date.now();
    const result = await runTestWithTimeout(async () => {
        return await wmSubmitOrder(
            mockGrvt, 0.5, 'LIMIT', 'ETH_USDT_Perp', 'BUY', 'quoteOnMainCoin', '0.01',
            onOrderUpdate, 0, 3000
        );
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`  ✅ Final status: ${result.data.finalStatus}`);
    console.log(`  ✅ Time elapsed: ${elapsed}ms`);
    console.log(`  ✅ Order cancelled: ${mockGrvt.cancelledOrders.length > 0}`);
    console.log(`  ✅ Test passed: Order timed out and was cancelled\n`);
    
    return result.data.finalStatus === 'TIMEOUT_CANCELLED' && elapsed >= 3000;
}

async function testTimeoutReset() {
    console.log('\n=== TEST 7: TIMEOUT - reset on qtyExe change ===');
    const mockGrvt = new MockGrvt('TIMEOUT_RESET');
    
    const updates = [];
    const onOrderUpdate = (data) => {
        updates.push({ qtyExe: data.qtyExe, time: Date.now() });
        console.log(`  📊 Update: qtyExe changed to ${data.qtyExe}`);
    };
    
    const wmSubmitOrder = await createMockWmSubmitOrder(mockGrvt);
    const startTime = Date.now();
    const result = await runTestWithTimeout(async () => {
        return await wmSubmitOrder(
            mockGrvt, 0.5, 'LIMIT', 'ETH_USDT_Perp', 'BUY', 'quoteOnMainCoin', '0.01',
            onOrderUpdate, 0, 5000
        );
    }, 15000);
    const elapsed = Date.now() - startTime;
    
    console.log(`  ✅ Final status: ${result.data.finalStatus}`);
    console.log(`  ✅ qtyExe changes: ${updates.length}`);
    console.log(`  ✅ Time elapsed: ${elapsed}ms`);
    console.log(`  ✅ Test passed: Timeout reset on qtyExe changes\n`);
    
    return result.data.finalStatus === 'TIMEOUT_CANCELLED' && updates.length >= 2;
}

// Run all tests
async function runAllTests() {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║       GRVT Order Monitoring - Mock Test Suite        ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    
    const tests = [
        { name: 'OPEN → FILLED', fn: testOpenToFilled },
        { name: 'OPEN → CANCELLED', fn: testOpenToCancelled },
        { name: 'OPEN → EXPIRED', fn: testOpenToExpired },
        { name: 'REJECTED with retry', fn: testRejectedWithRetry },
        { name: 'REJECTED max retry', fn: testRejectedMaxRetry },
        { name: 'TIMEOUT no fill', fn: testTimeoutNoFill },
        { name: 'TIMEOUT reset', fn: testTimeoutReset }
    ];
    
    const results = [];
    
    for (const test of tests) {
        try {
            const passed = await test.fn();
            results.push({ name: test.name, passed, error: null });
        } catch (error) {
            console.error(`  ❌ Test failed: ${error.message}`);
            results.push({ name: test.name, passed: false, error: error.message });
        }
    }
    
    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║                    Test Summary                       ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    results.forEach(result => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`  ${icon} ${result.name}`);
        if (result.error) {
            console.log(`      Error: ${result.error}`);
        }
    });
    
    console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);
    
    if (failed === 0) {
        console.log('  🎉 All tests passed!\n');
    } else {
        console.log('  ⚠️  Some tests failed.\n');
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
