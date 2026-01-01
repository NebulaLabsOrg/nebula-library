# GRVT Extended - Architecture Overview

## 📐 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Node.js Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Extended (Main Class)                  │    │
│  │  - Constructor: Initialize HTTP + Python service    │    │
│  │  - _sendCommand(): Communicate with Python         │    │
│  │  - Delegates to view/write models                  │    │
│  └──────────┬─────────────────────────┬────────────────┘    │
│             │                         │                      │
│             ↓                         ↓                      │
│  ┌──────────────────┐     ┌──────────────────────┐         │
│  │  view.model.js   │     │   write.model.js     │         │
│  │  ━━━━━━━━━━━━━━  │     │   ━━━━━━━━━━━━━━━━   │         │
│  │  vm* functions   │     │   wm* functions      │         │
│  │  (READ ONLY)     │     │   (WRITE + MONITOR)  │         │
│  │                  │     │                      │         │
│  │  • HTTP API      │     │  • Python SDK calls  │         │
│  │  • Python SDK    │     │  • _monitorOrderState│         │
│  │  • BigNumber     │     │  • BigNumber         │         │
│  │    calculations  │     │    calculations      │         │
│  └──────────┬───────┘     └──────────┬───────────┘         │
│             │                        │                      │
│             ↓                        ↓                      │
│  ┌──────────────────────────────────────────────────┐      │
│  │                 utils.js                         │      │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │      │
│  │  calculateMidPrice, formatOrderQuantity,         │      │
│  │  calculateSlippagePrice, roundToTickSize         │      │
│  │  (All use ethers.BigNumber internally)           │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │         HTTP Client (axios instance)             │      │
│  │  • GRVT REST API                                 │      │
│  │  • Authentication via API Key                    │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            │    stdin/stdout (JSON)    │
            └─────────────┬─────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                  Python Service                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │           service.py (Main Loop)                 │      │
│  │  • Read JSON commands from stdin                 │      │
│  │  • Execute via GrvtService                       │      │
│  │  • Write JSON responses to stdout                │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         │                                   │
│                         ↓                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │              GrvtService Class                   │      │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │      │
│  │  • get_account_info()                            │      │
│  │  • get_markets()                                 │      │
│  │  • get_positions()                               │      │
│  │  • place_order()                                 │      │
│  │  • cancel_order_by_external_id()                 │      │
│  │  • withdraw()                                    │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         │                                   │
│                         ↓                                   │
│  ┌──────────────────────────────────────────────────┐      │
│  │            GRVT Python SDK                       │      │
│  │  • GrvtRawSync                                   │      │
│  │  • Order signing                                 │      │
│  │  • API communication                             │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         │                                   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │   GRVT DEX Platform   │
              │   • Testnet           │
              │   • Mainnet           │
              │   • Staging           │
              └───────────────────────┘
```

## 🔄 Data Flow

### View Operation (Read Only)

```
User Code
    ↓ extended.getMarketData('BTC-PERP')
Extended Class
    ↓ await vmGetMarketData(this, 'BTC-PERP')
view.model.js
    ↓ await _extended._sendCommand('get_markets')
Python Service (stdin/stdout)
    ↓ { "command": "get_markets", "params": {...} }
GRVT SDK
    ↓ api.get_all_instruments_v1(...)
GRVT API
    ↓ HTTP Response
GRVT SDK
    ↓ Parsed instruments
Python Service
    ↓ { "data": [...markets...] }
view.model.js
    ↓ createResponse(true, 'success', markets, 'grvt.getMarketData')
User Code
    ↓ { success: true, data: [...] }
```

### Write Operation (With Monitoring)

```
User Code
    ↓ extended.submitOrder(...)
Extended Class
    ↓ await wmSubmitOrder(this, slippage, type, symbol, ...)
write.model.js
    ↓ 1. Call vmGetMarketData() for market info
    ↓ 2. Calculate price with BigNumber (utils.js)
    ↓ 3. Format quantity with BigNumber (utils.js)
    ↓ 4. Validate order parameters
    ↓ 5. await _extended._sendCommand('place_order', {...})
Python Service
    ↓ Execute place_order()
GRVT SDK
    ↓ Sign and submit order
    ↓ Return order_id
write.model.js
    ↓ 6. Call _monitorOrderState(orderId, symbol, timeout)
    ↓    ↓ Poll every 500ms
    ↓    ↓ Check order status via get_positions
    ↓    ↓ Wait for terminal state (FILLED/CANCELLED/etc.)
    ↓ 7. Return final state
    ↓ createResponse(true, message, { orderId, status, ... })
User Code
    ↓ { success: true, data: { status: 'FILLED', ... } }
```

## 🧮 BigNumber Calculation Flow

```
API Response (string)
    ↓ "50000.123456789"
utils.js
    ↓ ethers.utils.parseUnits(price, PRICE_DECIMALS)
    ↓ BigNumber { _hex: "0x..." }
    ↓ Arithmetic operations (add, mul, div)
    ↓ BigNumber result
    ↓ ethers.utils.formatUnits(result, PRICE_DECIMALS)
    ↓ "50000.123456789"
Application
    ↓ parseFloat() for display or further use
```

## 🔌 Python Service Communication

### Request Format
```json
{
    "command": "place_order",
    "params": {
        "market_name": "BTC-PERP",
        "side": "BUY",
        "amount": "0.001",
        "price": "50000.5",
        "order_type": "LIMIT",
        "time_in_force": "GTT",
        "post_only": true,
        "api_key": "...",
        "private_key": "...",
        "account_id": "...",
        "environment": "testnet"
    }
}
```

### Response Format
```json
{
    "data": {
        "external_id": "order_123",
        "order_id": "order_123",
        "status": "NEW"
    }
}
```

### Error Format
```json
{
    "error": "Failed to place order: insufficient balance"
}
```

## 📊 Component Responsibilities

| Component | Responsibility | State Changes | External Calls |
|-----------|---------------|---------------|----------------|
| **Extended** | Orchestration, Python service management | No | HTTP, Python |
| **view.model.js** | Read-only operations | No | HTTP, Python |
| **write.model.js** | Write operations + monitoring | Yes | Python |
| **utils.js** | BigNumber calculations | No | None |
| **enum.js** | Constants | No | None |
| **constant.js** | Configuration | No | None |
| **service.py** | Python SDK wrapper | No | GRVT SDK |

## 🎯 Key Design Patterns

### 1. View/Write Separation
- **View (vm\*):** Read-only, idempotent, cacheable
- **Write (wm\*):** State-changing, monitored, transactional

### 2. Embedded Monitoring
- No separate monitoring calls needed
- State tracking built into write operations
- Automatic cleanup on completion/timeout

### 3. Subprocess Isolation
- Python SDK runs in separate process
- JSON communication over stdin/stdout
- Clean separation of concerns
- Easy to debug and maintain

### 4. Precision Arithmetic
- All financial calculations use BigNumber
- Input: strings/numbers from API
- Processing: BigNumber arithmetic
- Output: strings/numbers for API

### 5. Standardized Responses
```javascript
{
    success: boolean,
    message: string,
    data: object | null,
    source: string,
    timestamp: string,
    trace: string | null  // Only on errors
}
```

## 🔒 Security Architecture

```
┌─────────────────────────────────────────┐
│         Environment Variables           │
│  • GRVT_FUNDING_PRIVATE_KEY             │
│  • GRVT_TRADING_PRIVATE_KEY             │
│  • GRVT_TRADING_API_KEY                 │
│  (Never logged, never exposed)          │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│          Extended Constructor           │
│  • Validates required parameters        │
│  • Stores credentials securely          │
│  • Initializes encrypted connections    │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│         Python Service (subprocess)     │
│  • Receives credentials via stdin       │
│  • Signs orders locally                 │
│  • No credentials in logs               │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│              GRVT API                   │
│  • HTTPS only                           │
│  • API key authentication               │
│  • Signed requests                      │
└─────────────────────────────────────────┘
```

## 🚀 Deployment Considerations

### Development
- Use testnet environment
- Enable detailed logging
- Short order monitoring timeouts

### Production
- Use mainnet environment
- Reduced logging (no credentials)
- Longer monitoring timeouts
- Error alerting system
- Rate limiting awareness

### Monitoring
- Track Python service health
- Monitor order success rates
- Alert on monitoring timeouts
- Track BigNumber calculation errors

---

**This architecture ensures:**
- ✅ Separation of concerns
- ✅ Type safety with BigNumber
- ✅ Embedded state monitoring
- ✅ Clean error handling
- ✅ Production-ready patterns
