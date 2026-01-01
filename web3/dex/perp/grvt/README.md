# GRVT Extended Integration

Production-ready GRVT DEX perpetual trading integration following the **NebulaLabs architecture pattern**.

## 🏗️ Architecture

This implementation follows the proven NebulaLabs Extended module architecture:

```
src/
├── enum.js              # extendedEnum + grvtEnum (all constants)
├── constant.js          # API URLs, TimeInForce, decimals
├── utils.js             # BigNumber calculations (calculateMidPrice, formatOrderQuantity)
├── extended.js          # Main Extended class (Python SDK integration)
├── view.model.js        # vm* functions (READ ONLY, HTTP/SDK API calls)
└── write.model.js       # wm* functions (WRITE operations with embedded monitoring)
```

### Key Principles

1. **View Layer (vm\*):** HTTP API or Python SDK calls, NO state changes
2. **Write Layer (wm\*):** Python SDK operations with embedded WebSocket monitoring
3. **BigNumber Integration:** Internal calculations use `ethers.BigNumber` for precision
4. **Embedded Monitoring:** Order state tracking built into write operations

## 📦 Installation

### Node.js Dependencies

```bash
npm install
```

### Python Dependencies

```bash
pip install -r requirements.txt
pip install -r python-service/requirements.txt
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
```

## 🔐 Account Structure

GRVT uses a two-account system:

```
┌─────────────────────────────────────────────┐
│  FUNDING ADDRESS (Treasury)                 │
│  └─ Address ONLY: 0xFundingAddress          │
│  └─ NO Account ID                           │
│  └─ Sub-Account: "0" (implicit)             │
│  └─ Purpose: Hold funds, bridge to trading  │
│                                              │
│           ↓↓↓ TRANSFER ↓↓↓                  │
│                                              │
│  TRADING ADDRESS (Operations)               │
│  ├─ Address: 0xTradingAddress               │
│  ├─ Trading Account ID: hex string          │
│  │   (1920109784202388)                     │
│  ├─ Sub-Account: Same as Account ID         │
│  ├─ Purpose: Orders, positions, margin      │
│  └─ CAN trade, CAN have positions           │
└─────────────────────────────────────────────┘
```

### Key Differences

- **Funding Account:** A treasury account that holds funds securely. It has no account ID and cannot place orders or hold positions. Its primary purpose is to store funds and transfer them to the trading account when needed.
- **Trading Account:** An operational account linked to a specific trading account ID. It can submit orders, manage positions, and handle margin requirements. Funds must be transferred from the funding account to the trading account before any trading activities can occur.

### Environment Variables

```bash
# Funding Account
GRVT_FUNDING_ADDRESS=0x...
GRVT_FUNDING_PRIVATE_KEY=0x...
GRVT_FUNDING_API_KEY=...

# Trading Account
GRVT_TRADING_ADDRESS=0x...
GRVT_TRADING_ACCOUNT_ID=1920...
GRVT_TRADING_PRIVATE_KEY=0x...
GRVT_TRADING_API_KEY=...

# Environment
GRVT_ENV=testnet
```

## 🚀 Usage

### Basic Setup

```javascript
import { Extended, extendedEnum, grvtEnum } from './src/extended.js';

const extended = new Extended({
    apiKey: process.env.GRVT_TRADING_API_KEY,
    privateKey: process.env.GRVT_TRADING_PRIVATE_KEY,
    publicKey: process.env.GRVT_TRADING_ADDRESS,
    tradingAccountId: process.env.GRVT_TRADING_ACCOUNT_ID,
    fundingAddress: process.env.GRVT_FUNDING_ADDRESS,
    tradingAddress: process.env.GRVT_TRADING_ADDRESS,
    slippage: 0.5,
    environment: 'testnet',
    usePython: true
});
```

### View Operations (Read Only)

```javascript
// Get wallet balance
const balance = await extended.getWalletBalance();
console.log('Available:', balance.data.availableForTrade);

// Get market data
const markets = await extended.getMarketData('BTC-PERP');
console.log('Ask:', markets.data[0].market_stats.ask_price);

// Get open positions
const positions = await extended.getOpenPositions();
console.log('Open positions:', positions.data.openPositions);

// Get position detail
const detail = await extended.getOpenPositionDetail('BTC-PERP');
console.log('Side:', detail.data.side);
console.log('Qty:', detail.data.qty);
```

### Write Operations (With Embedded Monitoring)

```javascript
// Submit LIMIT order (automatically monitored until terminal state)
const order = await extended.submitOrder(
    extendedEnum.order.type.limit,      // type
    'BTC-PERP',                         // symbol
    extendedEnum.order.long,            // side (BUY)
    extendedEnum.order.quoteOnMainCoin, // market unit
    0.001                               // quantity
);

console.log('Order ID:', order.data.orderId);
console.log('Status:', order.data.status);        // FILLED, CANCELLED, etc.
console.log('Filled:', order.data.filledQty);

// Close position (automatically monitored)
const close = await extended.submitCloseOrder(
    extendedEnum.order.type.market,     // type
    'BTC-PERP',                         // symbol
    extendedEnum.order.quoteOnMainCoin, // market unit
    0,                                  // quantity (ignored when closeAll=true)
    true                                // closeAll
);

// Cancel order
const cancel = await extended.submitCancelOrder(orderId);

// Submit withdrawal
const withdrawal = await extended.submitWithdrawal('100', starkAddress);
```

## 🔍 BigNumber Calculations

All internal calculations use `ethers.BigNumber` for precision:

```javascript
// Input: number/string from API
const askPrice = '50000.123456789';
const bidPrice = '49999.987654321';

// Internal: BigNumber arithmetic
const midPrice = calculateMidPrice(askPrice, bidPrice);

// Output: number for display/API
console.log(midPrice); // 50000.0556055555
```

### Utility Functions

- **`calculateMidPrice(ask, bid)`** - Calculate mid price with BigNumber
- **`formatOrderQuantity(qty, isQuoteOnSec, price, step)`** - Format quantity with step size
- **`calculateSlippagePrice(price, slippage, isBuy)`** - Apply slippage adjustment
- **`roundToTickSize(price, tickSize)`** - Round price to valid tick
- **`validateOrderParams(params)`** - Validate order before submission

## 🔄 Embedded WebSocket Monitoring

Write operations automatically monitor order state:

```javascript
// wmSubmitOrder internally calls _monitorOrderState()
// Polls every 500ms until terminal state
// Terminal states: FILLED, CANCELLED, REJECTED, EXPIRED, TIMEOUT
```

No manual monitoring needed - the function returns final state:

```javascript
const result = await extended.submitOrder(...);

// result.data.status contains final state:
// - 'FILLED' (success)
// - 'CANCELLED' (user cancelled)
// - 'REJECTED' (exchange rejected)
// - 'TIMEOUT' (monitoring timeout after 120s)
```

## 📊 Response Format

All functions return standardized responses:

```javascript
{
    success: true,
    message: 'success',
    data: { /* response data */ },
    source: 'grvt.functionName',
    timestamp: '2026-01-01T00:00:00.000Z',
    trace: null  // Only present on errors
}
```

## 🧪 Examples

Run the complete workflow example:

```bash
npm run example
```

This demonstrates:
1. Check wallet balance (VIEW)
2. Get market data (VIEW)
3. Submit LIMIT order (WRITE + monitoring)
4. Check positions (VIEW)
5. Get position detail (VIEW)
6. Close position (WRITE + monitoring)
7. Get order history (VIEW)

## 🏛️ Architecture Comparison

| Layer | NebulaLabs Pattern | GRVT Implementation |
|-------|-------------------|---------------------|
| **View** | HTTP API via axios | HTTP API + Python SDK |
| **Write** | Python SDK via subprocess | Python SDK via subprocess |
| **Calculations** | BigNumber internally | BigNumber internally |
| **Monitoring** | Embedded in write ops | Embedded in write ops |
| **Response** | createResponse() | createResponse() |

## 🔧 Python Service

The Python service runs as a subprocess:

```
Node.js (extended.js)
    ↓
    stdin/stdout (JSON)
    ↓
Python (service.py)
    ↓
    GRVT Python SDK
```

Communication protocol:

```javascript
// Request
{ "command": "place_order", "params": { /* ... */ } }

// Response
{ "data": { "order_id": "...", "status": "NEW" } }
// or
{ "error": "Error message" }
```

## 🛡️ Error Handling

All operations include comprehensive error handling:

```javascript
try {
    const result = await extended.submitOrder(...);
    if (!result.success) {
        console.error('Error:', result.message);
        console.error('Trace:', result.trace);
    }
} catch (error) {
    console.error('Exception:', error.message);
}
```

## 📝 Order Types & Sides

```javascript
// Order Types
extendedEnum.order.type.market  // MARKET
extendedEnum.order.type.limit   // LIMIT

// Order Sides
extendedEnum.order.long         // BUY
extendedEnum.order.short        // SELL

// Market Unit
extendedEnum.order.quoteOnMainCoin      // Quote in main coin
extendedEnum.order.quoteOnSecCoin       // Quote in secondary coin

// Order States (GRVT-specific)
grvtEnum.orderState.new
grvtEnum.orderState.partially_filled
grvtEnum.orderState.filled
grvtEnum.orderState.cancelled
grvtEnum.orderState.rejected
grvtEnum.orderState.expired
```

## 🔐 Security Notes

- Never commit `.env` file to version control
- Keep private keys secure
- Use separate funding and trading accounts
- Test on testnet before mainnet deployment

## 📚 Additional Resources

- [GRVT API Documentation](https://docs.grvt.io)
- [GRVT Python SDK](https://github.com/gravity-technologies/grvt-pysdk)
- [NebulaLabs Repository](https://github.com/NebulaLabsOrg/nebula-library)

## 🤝 Contributing

This implementation follows NebulaLabs standards. Maintain:
- View/Write separation
- BigNumber calculations
- Embedded monitoring
- Standardized responses

## 📄 License

MIT

---

**Built with ❤️ following NebulaLabs architecture pattern**
