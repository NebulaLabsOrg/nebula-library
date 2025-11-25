import { ExtendedMinimal } from '../index.js';
import { TokenBucketThrottler } from '../../../../../utils/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '.env') });

/**
 * ExtendedMinimal Example - Web/Serverless Optimized Client
 * 
 * Perfect for:
 * - Gelato Functions
 * - AWS Lambda
 * - Vercel Serverless Functions
 * - Browser environments
 * 
 * Features:
 * - Zero Python dependencies
 * - No child_process imports
 * - Lightweight and fast
 * - HTTP API only
 * 
 * Limitations:
 * - Cannot place orders (use Extended class for trading)
 * - Cannot get positions (use Extended class)
 * - Cannot get wallet balance (use Extended class)
 * - Read-only operations via HTTP API
 */

async function main() {
    console.log('🌐 ExtendedMinimal Example - Web/Serverless Client');
    console.log('='.repeat(50));

    // Initialize with minimal configuration
    const extendedThrottler = new TokenBucketThrottler(1000);
    const client = new ExtendedMinimal({
        apiKey: process.env.API_KEY,
        throttler: extendedThrottler
    });

    console.log('\n✅ Client initialized (HTTP-only mode)');
    console.log('   No Python process spawned');
    console.log('   No child_process imports');

    // Get wallet status (HTTP endpoint)
    console.log('\n📊 Getting wallet status...');
    const walletStatus = await client.getWalletStatus();
    console.log('Wallet Status:', walletStatus);


    // Get earned points (HTTP endpoint)
    console.log('\n🎯 Getting earned points...');
    const points = await client.getEarnedPoints();
    console.log('Points:', points);

    console.log('\n✅ Example completed successfully');
    console.log('='.repeat(50));
}

main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
});
