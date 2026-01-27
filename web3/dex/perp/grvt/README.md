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

// Transfer funds between accounts
const transferToTrading = await extended.transferToTrading('100', 'USDT');
console.log('Transfer confirmed:', transferToTrading.data.confirmed);

const transferToFunding = await extended.transferToFunding('50', 'USDT');
console.log('Transfer confirmed:', transferToFunding.data.confirmed);
```

### Advanced Order Operations with Retry and Callbacks

#### Order Submission with Automatic Retry

Submit orders with automatic retry on rejection and real-time status updates:

```javascript
// Submit order with retry and callback
const order = await extended.submitOrder(
    extendedEnum.order.type.limit,      // type
    'BTC-PERP',                         // symbol
    extendedEnum.order.long,            // side
    extendedEnum.order.quoteOnMainCoin, // market unit
    0.001,                              // quantity
    (update) => {                       // callback (optional)
        console.log('Order Update:', {
            id: update.currentOrderId,
            status: update.status,
            filled: update.qtyExe,
            avgPrice: update.avgPrice
        });
    },
    3,                                  // retry attempts (optional, default: 0)
    60000                               // timeout ms (optional, default: 60000)
);
```

**Parameters:**
- `_onOrderUpdate`: Callback function invoked whenever order state changes (status, filled quantity, or average price updates)
- `_retry`: Number of retry attempts if order is REJECTED (default: 0, no retry)
- `_timeout`: Maximum wait time in milliseconds, resets when filled quantity increases (default: 60000ms)

**Retry Behavior:**
1. If order is REJECTED and retries remain, the order is automatically cancelled
2. A new order is submitted with the same parameters
3. Process repeats until order succeeds or max retries reached
4. Callback notified of each retry attempt

**Timeout Behavior:**
1. Timeout counter starts when order is submitted
2. Resets whenever filled quantity increases (partial fills extend timeout)
3. When timeout expires without completion, order is automatically cancelled
4. Final status returned as `TIMEOUT_CANCELLED`

#### Close Position with Retry and Callbacks

Close positions with the same advanced features:

```javascript
// Close position with monitoring and retry
const close = await extended.submitCloseOrder(
    extendedEnum.order.type.limit,      // type
    'BTC-PERP',                         // symbol
    extendedEnum.order.quoteOnMainCoin, // market unit
    0,                                  // quantity (ignored if closeAll=true)
    true,                               // closeAll
    (update) => {                       // callback (optional)
        console.log('Close Order Update:', update);
    },
    3,                                  // retry attempts (optional)
    60000                               // timeout ms (optional)
);
```

**Key Features:**
- Automatically detects current position and creates opposite side order
- Uses `reduce_only` flag to prevent opening new positions
- Supports partial closes by setting `closeAll=false` and specifying quantity
- Same retry and timeout logic as regular orders

#### Cancel Order with Retry

Cancel orders with automatic retry on failure:

```javascript
// Cancel with 2 retry attempts
const cancel = await extended.submitCancelOrder(
    orderId,   // order ID to cancel
    2          // retry attempts (optional, default: 0)
);
```

**Retry Behavior:**
- If cancellation fails, automatically retries up to specified attempts
- 1 second delay between retry attempts
- Returns success/failure with total attempt count

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
// wmSubmitOrder internally monitors order state
// Polls every 500ms until terminal state
// Terminal states: FILLED, CANCELLED, REJECTED, EXPIRED, TIMEOUT_CANCELLED
```

No manual monitoring needed - the function returns final state:

```javascript
const result = await extended.submitOrder(...);

// result.data.status contains final state:
// - 'FILLED' (success)
// - 'CANCELLED' (user cancelled)
// - 'REJECTED' (exchange rejected)
// - 'TIMEOUT_CANCELLED' (monitoring timeout exceeded)
// - 'EXPIRED' (order expired per time-in-force)
```

### Order State Lifecycle

```
SUBMITTED → NEW → OPEN → PARTIALLY_FILLED → FILLED ✅
                    ↓
                  CANCELLED ⚠️
                    ↓
                  REJECTED ❌ (can trigger retry)
                    ↓
                  EXPIRED ⏰
```

### Monitoring Features

1. **Automatic State Tracking**: Continuously polls order status until terminal state
2. **Partial Fill Detection**: Detects when filled quantity increases and resets timeout
3. **Real-time Callbacks**: Invokes callback function on any state change
4. **Smart Timeout**: Timeout resets on partial fills to allow orders to complete
5. **Automatic Cancellation**: Orders are cancelled if timeout expires without completion

### Transfer Confirmation with Retry

Transfer operations verify completion via the transfer history API:

```javascript
// Transfers automatically check completion status with 3 retry attempts
const transfer = await extended.transferToTrading('100', 'USDT');

console.log('TX ID:', transfer.data.txId);
console.log('Submitted:', transfer.data.submitted);  // API accepted transfer
console.log('Confirmed:', transfer.data.confirmed);  // Transfer in history (verified)
```

**Retry Logic:**
- Makes up to 3 attempts to verify transfer appears in history
- 2 second delay between verification attempts
- Returns `confirmed: true` if transfer found in history
- Returns `confirmed: false` if transfer not found after 3 attempts
- Database processing may take time, retry ensures accurate status

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

### Basic Workflow Example

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

### Advanced Examples

#### Order with Callback and Retry
```bash
node example/grvt.open-order.example.js
```

Demonstrates:
- Real-time order status updates via callback
- Automatic retry on rejection
- Timeout handling with automatic cancellation

#### Position Closing with Monitoring
```bash
node example/grvt.close-order.example.js
```

Demonstrates:
- Automatic position detection
- Reduce-only order placement
- Close monitoring until completion

#### Fund Transfers with Verification
```bash
node example/grvt.transfer.example.js
```

Demonstrates:
- Transfer from Funding to Trading account
- Transfer from Trading to Funding account
- Automatic confirmation verification with retry
- Status checking via transfer history API

### Custom Implementation Examples

#### Simple Order Without Monitoring
```javascript
// For fire-and-forget orders (no monitoring, no retry)
const order = await extended.submitOrder(
    extendedEnum.order.type.market,
    'BTC-PERP',
    extendedEnum.order.long,
    extendedEnum.order.quoteOnMainCoin,
    0.001
    // No callback, no retry, no timeout - defaults to basic submission
);
```

#### Order with Custom Timeout
```javascript
// 30 second timeout for fast execution
const order = await extended.submitOrder(
    extendedEnum.order.type.limit,
    'ETH-PERP',
    extendedEnum.order.short,
    extendedEnum.order.quoteOnMainCoin,
    0.01,
    null,   // no callback
    0,      // no retry
    30000   // 30 second timeout
);
```

#### Advanced Order with Full Features
```javascript
// Production-ready order with all features
let lastUpdate = null;

const order = await extended.submitOrder(
    extendedEnum.order.type.limit,
    'BTC-PERP',
    extendedEnum.order.long,
    extendedEnum.order.quoteOnMainCoin,
    0.001,
    (update) => {
        // Track order progress
        if (lastUpdate?.status !== update.status) {
            console.log(`Status changed: ${lastUpdate?.status || 'NONE'} → ${update.status}`);
        }
        if (lastUpdate?.qtyExe !== update.qtyExe) {
            console.log(`Filled: ${update.qtyExe} @ ${update.avgPrice}`);
        }
        lastUpdate = update;
    },
    5,      // 5 retry attempts on rejection
    120000  // 2 minute timeout (resets on partial fills)
);

if (order.success) {
    console.log('Final Status:', order.data.finalStatus);
    console.log('Total Filled:', order.data.qtyExe);
    console.log('Average Price:', order.data.avgPrice);
    console.log('Retry Attempts:', order.data.attempts || 0);
}
```

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

## 🔑 Key Features Summary

### Order Management
- ✅ **Automatic Monitoring**: Orders tracked until completion without manual polling
- ✅ **Smart Retry**: Failed orders automatically retried with configurable attempts
- ✅ **Real-time Callbacks**: Live updates on order status, fills, and price
- ✅ **Dynamic Timeout**: Timeout resets on partial fills to allow completion
- ✅ **Auto-Cancel**: Orders cancelled on timeout to prevent orphaned orders

### Transfer Operations
- ✅ **Bidirectional Transfers**: Between Funding and Trading accounts
- ✅ **Automatic Verification**: Transfer history checked with retry logic
- ✅ **Correct Credentials**: Direction-based credential selection (Funding→Trading uses Funding key, Trading→Funding uses Trading key)
- ✅ **Confirmation Status**: Returns both submission and confirmation status

### Architecture Benefits
- ✅ **Separation of Concerns**: View (read) and Write (modify) layers clearly separated
- ✅ **BigNumber Precision**: All calculations use ethers.BigNumber internally
- ✅ **Standardized Responses**: Consistent response format across all operations
- ✅ **Error Handling**: Comprehensive error handling with detailed traces
- ✅ **Python SDK Integration**: Seamless subprocess communication for SDK operations

### Production-Ready Features
- ✅ **Environment Support**: Testnet and Mainnet configurations
- ✅ **Security**: Private key isolation in Python service
- ✅ **Reliability**: Automatic retry and timeout handling
- ✅ **Observability**: Real-time callbacks and detailed logging
- ✅ **Type Safety**: Enums for order types, sides, and states

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
