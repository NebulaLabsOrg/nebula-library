/**
 * GRVT Transfer Flow Example
 * 
 * Complete workflow:
 * 1. Check balances (Funding + Trading accounts)
 * 2. Transfer from Funding → Trading
 * 3. Trade on perp market
 * 4. Transfer from Trading → Funding (before withdrawal)
 * 5. Submit withdrawal
 * 6. Check transfer history
 */

import { Grvt, grvtEnum } from '../index.js';
import 'dotenv/config';

const grvt = new Grvt({
    apiKey: process.env.GRVT_API_KEY,
    privateKey: process.env.GRVT_PRIVATE_KEY,
    publicKey: process.env.GRVT_PUBLIC_KEY,
    tradingAccountId: process.env.GRVT_TRADING_ACCOUNT_ID,
    fundingAddress: process.env.GRVT_FUNDING_ADDRESS,
    tradingAddress: process.env.GRVT_TRADING_ADDRESS,
    slippage: 0.5,
    environment: 'testnet',
    usePython: true
});

async function demonstrateTransferFlow() {
    console.log('\n=== GRVT TRANSFER FLOW DEMONSTRATION ===\n');
    
    try {
        // ====================================
        // 1. CHECK INITIAL BALANCES
        // ====================================
        console.log('📊 Step 1: Check account balances');
        console.log('─'.repeat(50));
        
        const accountInfo = await grvt.getAccountInfo();
        if (accountInfo.success) {
            console.log('Account Info:', {
                availableForTrade: accountInfo.data.available_for_trade,
                availableForWithdrawal: accountInfo.data.available_for_withdrawal,
                totalBalance: accountInfo.data.total_balance,
                unrealisedPnl: accountInfo.data.unrealised_pnl
            });
        } else {
            console.error('Failed to get account info:', accountInfo.message);
        }
        
        // ====================================
        // 2. TRANSFER TO TRADING ACCOUNT
        // ====================================
        console.log('\n💸 Step 2: Transfer funds to Trading account');
        console.log('─'.repeat(50));
        
        const transferAmount = '10'; // 10 USDC
        const transferToTrading = await grvt.transferToTrading(transferAmount, 'USDC');
        
        if (transferToTrading.success) {
            console.log('✅ Transfer to Trading successful:', {
                amount: transferToTrading.data.amount,
                direction: transferToTrading.data.direction,
                txId: transferToTrading.data.tx_id
            });
        } else {
            console.error('❌ Transfer failed:', transferToTrading.message);
            return;
        }
        
        // Wait a bit for transfer to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ====================================
        // 3. CHECK TRADING ACCOUNT BALANCE
        // ====================================
        console.log('\n📈 Step 3: Verify Trading account balance');
        console.log('─'.repeat(50));
        
        const walletBalance = await grvt.getWalletBalance();
        if (walletBalance.success) {
            console.log('Trading Account Balance:', {
                availableBalance: walletBalance.data.available_balance,
                totalEquity: walletBalance.data.total_equity
            });
        }
        
        // ====================================
        // 4. PLACE A TRADE (OPTIONAL)
        // ====================================
        console.log('\n🎯 Step 4: Place a small trade');
        console.log('─'.repeat(50));
        
        const symbol = 'BTC_USDT_Perp';
        const orderQty = '0.001'; // Small BTC amount
        
        const order = await grvt.submitOrder(
            grvtEnum.order.market,
            symbol,
            grvtEnum.order.long,
            grvtEnum.order.quoteOnMainCoin,
            orderQty
        );
        
        if (order.success) {
            console.log('✅ Order placed:', {
                orderId: order.data.external_id,
                status: order.data.status,
                symbol: symbol,
                side: 'LONG',
                quantity: orderQty
            });
            
            // Wait for order to fill
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check position
            const positions = await grvt.getOpenPositions();
            if (positions.success && positions.data.length > 0) {
                console.log('Open Positions:', positions.data.map(p => ({
                    market: p.market,
                    side: p.side,
                    size: p.size,
                    unrealisedPnl: p.unrealised_pnl
                })));
            }
        } else {
            console.log('⚠️  Order placement skipped or failed:', order.message);
        }
        
        // ====================================
        // 5. TRANSFER BACK TO FUNDING (BEFORE WITHDRAWAL)
        // ====================================
        console.log('\n🔄 Step 5: Transfer funds back to Funding account');
        console.log('─'.repeat(50));
        console.log('⚠️  NOTE: You must transfer to Funding before withdrawing!');
        
        const withdrawAmount = '5'; // 5 USDC
        const transferToFunding = await grvt.transferToFunding(withdrawAmount, 'USDC');
        
        if (transferToFunding.success) {
            console.log('✅ Transfer to Funding successful:', {
                amount: transferToFunding.data.amount,
                direction: transferToFunding.data.direction,
                txId: transferToFunding.data.tx_id
            });
        } else {
            console.error('❌ Transfer failed:', transferToFunding.message);
            return;
        }
        
        // Wait for transfer to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // ====================================
        // 6. SUBMIT WITHDRAWAL (OPTIONAL - COMMENTED OUT)
        // ====================================
        console.log('\n🏦 Step 6: Submit withdrawal (DEMO - not executed)');
        console.log('─'.repeat(50));
        console.log('To withdraw, uncomment the following code and provide recipient address:');
        console.log(`
        const withdrawal = await grvt.submitWithdrawal(
            '${withdrawAmount}',
            'YOUR_RECIPIENT_STARK_ADDRESS'
        );
        `);
        
        /*
        // Uncomment to actually withdraw
        const withdrawal = await grvt.submitWithdrawal(
            withdrawAmount,
            process.env.RECIPIENT_STARK_ADDRESS
        );
        
        if (withdrawal.success) {
            console.log('✅ Withdrawal submitted:', {
                withdrawalId: withdrawal.data.withdrawal_id,
                amount: withdrawal.data.amount,
                status: withdrawal.data.status
            });
        } else {
            console.error('❌ Withdrawal failed:', withdrawal.message);
        }
        */
        
        // ====================================
        // 7. CHECK TRANSFER HISTORY
        // ====================================
        console.log('\n📜 Step 7: View transfer history');
        console.log('─'.repeat(50));
        
        const history = await grvt.getTransferHistory(10);
        if (history.success && history.data.transfers) {
            console.log(`Found ${history.data.transfers.length} transfers:`);
            history.data.transfers.forEach((transfer, index) => {
                console.log(`\nTransfer #${index + 1}:`);
                console.log({
                    txId: transfer.tx_id,
                    from: `${transfer.from_account.slice(0, 6)}... (sub: ${transfer.from_sub_account})`,
                    to: `${transfer.to_account.slice(0, 6)}... (sub: ${transfer.to_sub_account})`,
                    amount: transfer.amount,
                    currency: transfer.currency,
                    type: transfer.type,
                    timestamp: new Date(parseInt(transfer.timestamp) / 1000000).toISOString()
                });
            });
        } else {
            console.log('No transfer history found or error:', history.message);
        }
        
        // ====================================
        // SUMMARY
        // ====================================
        console.log('\n\n=== WORKFLOW SUMMARY ===');
        console.log('─'.repeat(50));
        console.log('✅ Checked account balances');
        console.log('✅ Transferred to Trading account');
        console.log('✅ Placed trade (if enabled)');
        console.log('✅ Transferred back to Funding account');
        console.log('📋 Withdrawal flow demonstrated (not executed)');
        console.log('✅ Reviewed transfer history');
        
        console.log('\n💡 KEY TAKEAWAY:');
        console.log('   Deposits → Funding Account');
        console.log('   Trading requires → Trading Account');
        console.log('   Withdrawals require → Funding Account');
        console.log('   Use transfer functions to move funds between accounts!');
        
    } catch (error) {
        console.error('\n❌ Error in transfer flow:', error);
    } finally {
        // Cleanup: close Python service
        if (grvt.pythonService) {
            grvt.pythonService.kill();
        }
    }
}

// Run the demonstration
demonstrateTransferFlow()
    .then(() => {
        console.log('\n✅ Transfer flow demonstration completed!\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Demonstration failed:', error);
        process.exit(1);
    });
