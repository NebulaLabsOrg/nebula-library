import dotenv from 'dotenv';
import { Grvt } from '../src/grvt.js';

dotenv.config();

// Initialize Grvt instance
const grvtInstance = new Grvt({
    funding: {
        address: process.env.FUNDING_ADDRESS,
        privateKey: process.env.FUNDING_PRIVATE_KEY,
        apiKey: process.env.FUNDING_API_KEY
    },
    trading: {
        address: process.env.TRADING_ADDRESS,
        accountId: process.env.TRADING_ACCOUNT_ID,
        privateKey: process.env.TRADING_PRIVATE_KEY,
        apiKey: process.env.TRADING_API_KEY
    },
    slippage: 0.5,
    usePython: true,  // Required for vault operations
    environment: 'testnet'
});

async function testVaultInvest() {
    console.log('\n=== Testing Vault Invest ===');
    
    try {
        // Invest 100 USDC in vault
        const vaultId = '2002239639';  // Example vault ID
        const amount = 100;
        const currency = 'USDC';
        
        console.log(`Investing ${amount} ${currency} in vault ${vaultId}...`);
        
        const investResult = await grvtInstance.vaultInvest(vaultId, amount, currency);
        
        console.log('Invest result:', JSON.stringify(investResult, null, 2));
        
        if (investResult.success) {
            console.log('✅ Successfully invested in vault');
        } else {
            console.error('❌ Vault invest failed:', investResult.message);
        }
    } catch (error) {
        console.error('Error during vault invest:', error.message);
    }
}

async function testVaultRedeem() {
    console.log('\n=== Testing Vault Redeem ===');
    
    try {
        // Redeem 10 LP tokens from vault
        const vaultId = '2002239639';  // Example vault ID
        const amount = 10;  // LP tokens amount
        const currency = 'USDC';
        
        console.log(`Redeeming ${amount} LP tokens from vault ${vaultId}...`);
        
        const redeemResult = await grvtInstance.vaultRedeem(vaultId, amount, currency);
        
        console.log('Redeem result:', JSON.stringify(redeemResult, null, 2));
        
        if (redeemResult.success) {
            console.log('✅ Successfully redeemed from vault');
            console.log('Note: Redemption creates a redemption request in the queue.');
            console.log('The actual redemption will be processed by the vault manager.');
        } else {
            console.error('❌ Vault redeem failed:', redeemResult.message);
        }
    } catch (error) {
        console.error('Error during vault redeem:', error.message);
    }
}

// Run tests
(async () => {
    console.log('Starting GRVT Vault Tests...');
    console.log('Environment:', process.env.GRVT_ENV || 'testnet');
    
    // Test vault invest
    await testVaultInvest();
    
    // Wait 2 seconds between operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test vault redeem
    await testVaultRedeem();
    
    console.log('\n=== Tests completed ===');
    process.exit(0);
})();
