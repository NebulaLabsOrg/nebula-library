import dotenv from 'dotenv';
import { Grvt } from '../src/grvt.js';

dotenv.config();

// Initialize Grvt instance
const grvtInstance = new Grvt({
    funding: {
        address: process.env.GRVT_FUNDING_ADDRESS,
        privateKey: process.env.GRVT_FUNDING_PRIVATE_KEY,
        apiKey: process.env.GRVT_FUNDING_API_KEY
    },
    trading: {
        address: process.env.GRVT_TRADING_ADDRESS,
        accountId: process.env.GRVT_TRADING_ACCOUNT_ID,
        privateKey: process.env.GRVT_TRADING_PRIVATE_KEY,
        apiKey: process.env.GRVT_TRADING_API_KEY
    },
    slippage: 0.5,
    usePython: true,  // Required for vault operations
});

async function testGlpVaultInvest() {
    console.log('\n=== Testing GLP Vault Invest ===');
    
    try {
        const amount = 1;
        const currency = 'USDT';
        
        console.log(`Investing ${amount} ${currency} in GLP Vault...`);
        
        const investResult = await grvtInstance.glpVaultInvest(amount, currency);
        
        console.log('Invest result:', JSON.stringify(investResult, null, 2));
        
        if (investResult.success) {
            console.log('✅ Successfully invested in GLP vault');
        } else {
            console.error('❌ GLP Vault invest failed:', investResult.message);
        }
    } catch (error) {
        console.error('Error during GLP vault invest:', error.message);
    }
}

async function testGlpVaultRedeem() {
    console.log('\n=== Testing GLP Vault Redeem ===');
    
    try {
        // Redeem 1 LP token from GLP vault (vault ID is hardcoded: 1463215095)
        const amount = 1;  // LP tokens amount
        const currency = 'USDT';
        
        console.log(`Redeeming ${amount} LP tokens from GLP Vault...`);
        
        const redeemResult = await grvtInstance.glpVaultRedeem(amount, currency);
        
        console.log('Redeem result:', JSON.stringify(redeemResult, null, 2));
        
        if (redeemResult.success) {
            console.log('✅ Successfully redeemed from GLP vault');
            console.log('Note: Redemption creates a redemption request in the queue.');
            console.log('The actual redemption will be processed by the vault manager.');
        } else {
            console.error('❌ GLP Vault redeem failed:', redeemResult.message);
        }
    } catch (error) {
        console.error('Error during GLP vault redeem:', error.message);
    }
}

// Run tests
(async () => {
    console.log('Starting GRVT GLP Vault Tests...');
    console.log('GLP Vault ID: 1463215095');
    console.log('Environment: mainnet');
    
    // Wait for Python service to initialize
    console.log('\nWaiting for Python service to initialize...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test GLP vault invest
    await testGlpVaultInvest();
    
    // Wait 2 seconds between operations
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test GLP vault redeem (uncomment to test)
    // await testGlpVaultRedeem();
    
    console.log('\n=== Tests completed ===');
    
    // Cleanup
    await grvtInstance.close();
    process.exit(0);
})();
