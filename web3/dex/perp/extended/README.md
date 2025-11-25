# Extended trading client

##  Prerequisites

- **Node.js**: ≥16.0.0
- **Python**: ≥3.11.0
- **npm**: Latest stable version
- **pip**: Python package installer

## 🛠️ Setup

### 1. Create Requirements File

Create a `requirements.txt` file in the project root with the following content:

```txt
# Requirements for Extended Trading Python dependencies
x10-python-trading-starknet
```

### 2. Create Setup Script

Create a `setup.sh` file in the project root:

```bash
#!/bin/bash

echo "🔧 Setting up project environment..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies  
echo "📦 Installing Node.js dependencies..."
npm install

echo "🎉 Setup completed successfully!"
```

### 3. Run Setup

Execute the setup script:

```bash
sh ./setup.sh
```

## 📖 Usage

### Full SDK Mode (with Python)

For complete trading functionality including order placement, positions, and balance:

```javascript
import { Extended } from '@nebula-library/web3/dex/perp/extended';

const extended = new Extended({
    apiKey: process.env.API_KEY,
    privateKey: process.env.STARK_KEY_PRIVATE,
    publicKey: process.env.STARK_KEY_PUBLIC,
    vault: parseInt(process.env.VAULT_NUMBER),
    environment: 'testnet' // or 'mainnet'
});

// Full SDK functionality available
const balance = await extended.getWalletBalance();
const markets = await extended.getMarketData();
const order = await extended.submitOrder(
    'market', 'BTC-USD-PERP', 'long', 'usd', 100
);

// IMPORTANT: Always close the connection when done
await extended.close();
```

### 🌐 Web/Serverless Mode (ExtendedWeb - HTTP Only)

**Perfect for serverless environments** like Gelato, AWS Lambda, Vercel Functions, or browser environments.

**Zero dependencies on:**
- ❌ Python
- ❌ child_process
- ❌ file system
- ✅ Pure HTTP API calls

```javascript
import { ExtendedWeb } from '@nebula-library/web3/dex/perp/extended';

const client = new ExtendedWeb({
    apiKey: process.env.API_KEY,
    environment: 'testnet' // or 'mainnet'
});

// ✅ Read-only operations via HTTP:
const walletStatus = await client.getWalletStatus();
const orderStatus = await client.getOrderStatus(orderId);
const points = await client.getEarnedPoints();
const withdrawals = await client.getWithdrawalStatus();

// No cleanup needed (no processes)
await client.close();
```

**ExtendedWeb Limitations:**
- ❌ Cannot place orders (no Starknet signing without SDK)
- ❌ Cannot get wallet balance (SDK only)
- ❌ Cannot get positions (SDK only)
- ✅ Perfect for monitoring, status checks, webhooks

### Hybrid Mode (usePython flag)

Use the full `Extended` class with Python disabled for specific cases:

```javascript
const extended = new Extended({
    apiKey: process.env.API_KEY,
    privateKey: process.env.STARK_KEY_PRIVATE,
    publicKey: process.env.STARK_KEY_PUBLIC,
    vault: parseInt(process.env.VAULT_NUMBER),
    environment: 'testnet',
    usePython: false // 🔥 Disable Python - HTTP only
});

// ✅ These work without Python (HTTP direct):
const walletStatus = await extended.getWalletStatus();
const orderStatus = await extended.getOrderStatus(orderId);

// ❌ These require Python SDK (will throw error):
// await extended.submitOrder(...)  // Needs Python for Starknet signing
// await extended.getWalletBalance() // Uses Python SDK
```

### Backward Compatibility (Legacy)

The old constructor signature still works:

```javascript
const extended = new Extended(
    apiKey,
    privateKey,
    publicKey,
    vault,
    0.1,      // slippage
    throttler,
    'testnet'
);
```

After setup, you can use the library modules as needed. Each module is located in its respective directory with examples provided.

