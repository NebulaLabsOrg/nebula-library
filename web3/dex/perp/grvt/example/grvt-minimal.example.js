import 'dotenv/config';
import { GrvtMinimal, grvtEnum } from '../index.js';

/**
 * Example: GrvtMinimal - HTTP API Only (No Python SDK)
 * 
 * This example demonstrates the lightweight GrvtMinimal class for web/serverless environments.
 * Perfect for:
 * - Gelato Functions
 * - AWS Lambda
 * - Vercel Functions
 * - Browser applications
 * - Environments without Python runtime
 * 
 * Features available:
 * ✅ Wallet status and balance
 * ✅ Market data (prices, funding rates, open interest)
 * ✅ Position monitoring
 * ✅ Order status checking
 * ✅ Transfer status verification
 * 
 * Not available (requires full Grvt class with Python SDK):
 * ❌ Order submission
 * ❌ Order cancellation
 * ❌ Fund transfers
 */

async function main() {
    try {
        console.log('='.repeat(60));
        console.log('GRVT MINIMAL - HTTP API ONLY');
        console.log('='.repeat(60));

        // Initialize GrvtMinimal (only needs API key and account ID)
        const grvt = new GrvtMinimal({
            apiKey: process.env.GRVT_TRADING_API_KEY,
            accountId: process.env.GRVT_TRADING_ACCOUNT_ID,
        });

        console.log('\n✅ GrvtMinimal initialized (HTTP API only)');
        console.log('   No Python SDK required - perfect for serverless!');

        // ========================================
        // 1. WALLET STATUS & BALANCE
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('1. Checking Wallet Status');
        console.log('='.repeat(60));

        const walletStatus = await grvt.getWalletStatus();
        if (walletStatus.success) {
            console.log('✅ Wallet Status:', {
                totalEquity: walletStatus.data.totalEquity,
                availableBalance: walletStatus.data.availableBalance,
                totalMargin: walletStatus.data.totalMargin
            });
        } else {
            console.error('❌ Failed to get wallet status:', walletStatus.message);
        }

        const walletBalance = await grvt.getWalletBalance();
        if (walletBalance.success) {
            console.log('✅ Available for Trading:', walletBalance.data.availableForTrade);
        }

        // ========================================
        // 2. MARKET DATA (PUBLIC API)
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('2. Fetching Market Data');
        console.log('='.repeat(60));

        const symbol = 'ETH_USDT_Perp';

        // Real-time prices
        const prices = await grvt.getMarketDataPrices(symbol);
        if (prices.success) {
            console.log(`✅ ${symbol} Prices:`, {
                midPrice: prices.data.midPrice,
                bestBid: prices.data.bestBidPrice,
                bestAsk: prices.data.bestAskPrice,
                lastPrice: prices.data.lastPrice
            });
        }

        // Order size configuration
        const orderSize = await grvt.getMarketOrderSize(symbol);
        if (orderSize.success) {
            console.log(`✅ ${symbol} Order Size:`, {
                minQty: orderSize.data.mainCoin.minQty,
                qtyStep: orderSize.data.mainCoin.qtyStep,
                priceDecimals: orderSize.data.priceDecimals
            });
        }

        // Funding rate
        const fundingRate = await grvt.getFundingRateHour(symbol);
        if (fundingRate.success) {
            console.log(`✅ ${symbol} Funding Rate:`, fundingRate.data.fundingRateHour);
        }

        // Open interest
        const openInterest = await grvt.getMarketOpenInterest(symbol);
        if (openInterest.success) {
            console.log(`✅ ${symbol} Open Interest:`, openInterest.data.totalOi);
        }

        // ========================================
        // 3. POSITIONS MONITORING
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('3. Monitoring Positions');
        console.log('='.repeat(60));

        const positions = await grvt.getOpenPositions();
        if (positions.success) {
            if (positions.data.openPositions.length > 0) {
                console.log(`✅ Found ${positions.data.openPositions.length} open position(s):`);
                positions.data.openPositions.forEach(pos => {
                    console.log(`   - ${pos.symbol}: ${pos.side} ${pos.qty} @ ${pos.entryPrice}`);
                });

                // Get detailed info for first position
                const firstPosition = positions.data.openPositions[0];
                const posDetail = await grvt.getOpenPositionDetail(firstPosition.symbol);
                if (posDetail.success) {
                    console.log(`\n✅ ${firstPosition.symbol} Position Details:`, {
                        side: posDetail.data.side,
                        qty: posDetail.data.qty,
                        entryPrice: posDetail.data.entryPrice,
                        markPrice: posDetail.data.markPrice,
                        pnl: posDetail.data.pnl,
                        pnlPercent: posDetail.data.pnlPercent
                    });
                }
            } else {
                console.log('ℹ️  No open positions');
            }
        }

        // ========================================
        // 4. ORDER STATUS CHECKING
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('4. Order Status Checking');
        console.log('='.repeat(60));
        console.log('ℹ️  To check order status, provide an order ID:');
        console.log('   const orderStatus = await grvt.getOrderStatusById("order_id");');

        // Example (uncomment to test with real order ID):
        // const orderStatus = await grvt.getOrderStatusById('your_order_id');
        // if (orderStatus.success) {
        //     console.log('✅ Order Status:', {
        //         status: orderStatus.data.status,
        //         qty: orderStatus.data.qty,
        //         qtyExe: orderStatus.data.qtyExe,
        //         avgPrice: orderStatus.data.avgPrice
        //     });
        // }

        // ========================================
        // 5. TRANSFER STATUS CHECKING
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('5. Transfer Status Checking');
        console.log('='.repeat(60));
        console.log('ℹ️  To check transfer status, provide a transaction ID:');
        console.log('   const transferStatus = await grvt.getTransferStatusByTxId("tx_id");');

        // Example (uncomment to test with real transfer ID):
        // const transferStatus = await grvt.getTransferStatusByTxId('your_tx_id');
        // if (transferStatus.success) {
        //     console.log('✅ Transfer Status:', {
        //         completed: transferStatus.data.completed,
        //         amount: transferStatus.data.amount,
        //         currency: transferStatus.data.currency
        //     });
        // }

        // ========================================
        // SUMMARY
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY - GrvtMinimal Capabilities');
        console.log('='.repeat(60));
        console.log('\n✅ Available (HTTP API):');
        console.log('   • Wallet status and balance queries');
        console.log('   • Market data (prices, funding, open interest)');
        console.log('   • Position monitoring');
        console.log('   • Order status checking');
        console.log('   • Transfer status verification');
        
        console.log('\n❌ Not Available (requires Python SDK in full Grvt class):');
        console.log('   • Order submission (market/limit)');
        console.log('   • Order cancellation');
        console.log('   • Fund transfers between accounts');
        
        console.log('\n💡 Use Cases:');
        console.log('   • Gelato Functions (task automation)');
        console.log('   • AWS Lambda (serverless)');
        console.log('   • Vercel Functions (edge computing)');
        console.log('   • Browser applications (monitoring dashboards)');
        console.log('   • Mobile apps (read-only operations)');

        console.log('\n='.repeat(60));
        console.log('✅ Example completed successfully!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    }
}

main();
