/**
 * GRVT - Complete Order Workflow Example
 * Following NebulaLabs architecture pattern
 */

import { Grvt, extendedEnum, grvtEnum } from '../src/grvt.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function completeOrderWorkflow() {
    // 1. Initialize Grvt client
    console.log('='.repeat(60));
    console.log('GRVT - Complete Order Workflow');
    console.log('='.repeat(60));
    
    const grvt = new Grvt({
        apiKey: process.env.GRVT_TRADING_API_KEY,
        privateKey: process.env.GRVT_TRADING_PRIVATE_KEY,
        publicKey: process.env.GRVT_TRADING_ADDRESS,
        tradingAccountId: process.env.GRVT_TRADING_ACCOUNT_ID,
        fundingAddress: process.env.GRVT_FUNDING_ADDRESS,
        tradingAddress: process.env.GRVT_TRADING_ADDRESS,
        slippage: 0.5,
        environment: process.env.GRVT_ENV || 'testnet',
        usePython: true
    });
    
    try {
        // 2. Check wallet balance (VIEW)
        console.log('\n[1] Checking wallet balance...');
        const balanceResp = await grvt.getWalletBalance();
        if (!balanceResp.success) {
            throw new Error(balanceResp.message);
        }
        console.log('✓ Available for trade:', balanceResp.data.availableForTrade);
        console.log('✓ Unrealised PnL:', balanceResp.data.unrealisedPnl);
        
        // 3. Get market data (VIEW)
        console.log('\n[2] Fetching market data for BTC-PERP...');
        const marketResp = await grvt.getMarketData('BTC-PERP');
        if (!marketResp.success) {
            throw new Error(marketResp.message);
        }
        const market = marketResp.data[0];
        console.log('✓ Market:', market.name || market.instrument);
        console.log('✓ Ask Price:', market.market_stats?.ask_price || market.ask_price);
        console.log('✓ Bid Price:', market.market_stats?.bid_price || market.bid_price);
        
        // 4. Submit LIMIT BUY order (WRITE + EMBEDDED WEBSOCKET MONITORING)
        console.log('\n[3] Submitting LIMIT BUY order...');
        const orderResp = await grvt.submitOrder(
            extendedEnum.order.type.limit,           // type
            'BTC-PERP',                              // symbol
            extendedEnum.order.long,                 // side (BUY)
            extendedEnum.order.quoteOnMainCoin,      // market unit
            0.001                                    // quantity
        );
        
        if (!orderResp.success) {
            console.error('✗ Order failed:', orderResp.message);
        } else {
            console.log('✓ Order submitted:', orderResp.data.orderId);
            console.log('✓ Final status:', orderResp.data.status);
            console.log('✓ Filled qty:', orderResp.data.filledQty);
            console.log('✓ Avg price:', orderResp.data.avgPrice);
        }
        
        // 5. Check open positions (VIEW)
        console.log('\n[4] Checking open positions...');
        const positionsResp = await grvt.getOpenPositions();
        if (positionsResp.success) {
            console.log('✓ Open positions:', positionsResp.data.openPositions);
            console.log('✓ Markets:', positionsResp.data.markets.join(', '));
        }
        
        // 6. Get position detail (VIEW)
        if (positionsResp.data.openPositions > 0 && positionsResp.data.markets.includes('BTC-PERP')) {
            console.log('\n[5] Getting position detail for BTC-PERP...');
            const posDetailResp = await grvt.getOpenPositionDetail('BTC-PERP');
            if (posDetailResp.success) {
                const detail = posDetailResp.data;
                console.log('✓ Side:', detail.side);
                console.log('✓ Quantity:', detail.qty);
                console.log('✓ Avg Price:', detail.avgPrice);
                console.log('✓ Unrealised PnL:', detail.unrealisedPnl);
            }
        }
        
        // 7. Close position (WRITE + EMBEDDED WEBSOCKET MONITORING)
        if (positionsResp.data.openPositions > 0 && positionsResp.data.markets.includes('BTC-PERP')) {
            console.log('\n[6] Closing position...');
            const closeResp = await grvt.submitCloseOrder(
                extendedEnum.order.type.market,      // type
                'BTC-PERP',                          // symbol
                extendedEnum.order.quoteOnMainCoin,  // market unit
                0,                                   // quantity (ignored when closeAll=true)
                true                                 // closeAll
            );
            
            if (closeResp.success) {
                console.log('✓ Position closed:', closeResp.data.orderId);
                console.log('✓ Final status:', closeResp.data.status);
                console.log('✓ Closed qty:', closeResp.data.closedQty);
            } else {
                console.error('✗ Close failed:', closeResp.message);
            }
        }
        
        // 8. Get order history (VIEW)
        console.log('\n[7] Fetching order history...');
        const historyResp = await grvt.getOrderHistory('BTC-PERP', 10);
        if (historyResp.success) {
            console.log('✓ Order count:', historyResp.data.count);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('WORKFLOW COMPLETED SUCCESSFULLY');
        console.log('='.repeat(60) + '\n');
        
    } catch (error) {
        console.error('\n✗ Workflow error:', error.message);
        console.error(error.stack);
    } finally {
        // Close Python service
        grvt.close();
    }
}

// Run the workflow
completeOrderWorkflow();
