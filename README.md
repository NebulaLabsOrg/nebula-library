# Nebula Library

🌌 **Nebula Library**  
A robust and versatile JavaScript toolkit crafted for Web3 applications and essential utilities.

---

## Overview

Nebula Library delivers a comprehensive suite of tools tailored for modern blockchain development. Its mission is to streamline Web3 integrations and equip developers with reliable, production-ready utilities.

---

## Available Modules

### 🚀 Bot & Notification Services

Automate communication and streamline notifications with seamless integrations.

| **Module**           | **Purpose**                                         | **Dependencies**           | **Path**                                |
|----------------------|-----------------------------------------------------|----------------------------|-----------------------------------------|
| `TgNotifier`   | Telegram bot client for sending and managing notifications | `node-telegram-bot-api`    | `nebula-library/telegram-bot/index.js`    |

---

### 🔗 Web3 & Cryptocurrency Utilities

Effortlessly integrate blockchain technology. Crypto operation modules include:

#### 🏦 Centralized Exchanges (CEX)

| **Module**   | **Purpose**                 | **Dependencies**      | **Path**                                   |
|--------------|-----------------------------|-----------------------|--------------------------------------------|
| `Bybit`      | REST/WebSocket client for Bybit exchange (spot, futures, account) | `bybit-api`, `uuid`   | `nebula-library/web3/cex/bybit/index.js`   |

#### 🏦 Decentralized Exchanges (DEX) Aggregators

| **Module**     | **Purpose**                         | **Dependencies**        | **Path**                                              |
|----------------|-------------------------------------|-------------------------|-------------------------------------------------------|
| `Kyberswap`    | Aggregator for DEX swaps and quotes via Kyberswap API | `ethers`, `axios`       | `nebula-library/web3/dex/aggregator/kyberswap/index.js` |

#### 📈 Perpetual Exchanges (Perp)

| **Module**   | **Purpose**                              | **Dependencies**                  | **Path**                                               |
|--------------|------------------------------------------|-----------------------------------|--------------------------------------------------------|
| `Paradex`    | Starknet-based perpetual DEX client for Paradex | `starknet`, `axios`, `bignumber.js` | `nebula-library/web3/dex/perp/paradex/index.js`         |
| `Extended`   | Advanced perpetual DEX client (StarkNet, Python SDK, auto-signatures) | `axios`,`x10-python-trading-starknet`   | `nebula-library/web3/dex/perp/extended/index.js`        |
| `DefX`       | Perpetual DEX client for DefX protocol       | `axios`                             | `nebula-library/web3/dex/perp/defx/index.js`            |

#### 🌉 Bridges

| **Module**   | **Purpose**                                   | **Dependencies**                          | **Path**                                         |
|--------------|-----------------------------------------------|-------------------------------------------|--------------------------------------------------|
| `Rhino`      | Multi-chain bridge client (EVM, Paradex, Starknet)  | `ethers`, `@rhino.fi/sdk`, `@paradex/sdk` | `nebula-library/web3/bridge/rhino/index.js`      |


#### 🪙 Token, Price & Data Utilities

| **Module**   | **Purpose**                                                      | **Dependencies** | **Path**                                   |
|--------------|------------------------------------------------------------------|------------------|--------------------------------------------|
| `ERC20`      | ERC20 token contract interface and utilities                      | `ethers`         | `nebula-library/web3/token/ERC20/index.js` |
| `Moralis`    | Unified Web3 data API (tokens, wallets, NFTs, prices, DeFi, blockchain info) | `axios`          | `nebula-library/web3/data/moralis/index.js`|
| `Defillama`  | DeFi and token data aggregator (markets, prices, protocols)       | `axios`          | `nebula-library/web3/data/defillama/index.js`|
| `Pyth`       | Real-time price feeds from Pyth Network (Hermes API)              | `@pythnetwork/hermes-client` | `nebula-library/web3/data/price/pyth/index.js`|

#### 🏗️ Infrastructure

| **Module**       | **Purpose**                                                      | **Dependencies** | **Path**                                     |
|------------------|------------------------------------------------------------------|------------------|----------------------------------------------|
| `SmartAccount`   | ERC-4337 Account Abstraction client (gasless transactions, batch operations, flexible funding) | `ethers`, `axios` | `nebula-library/web3/infra/erc4337/index.js` |


### 📦 Scraper Module

Automate data extraction from websites and APIs.

| **Module**   | **Purpose**                                    | **Dependencies**         | **Path**                           |
|--------------|------------------------------------------------|--------------------------|------------------------------------|
| `Extended`    | Web scraper for Extended protocol pages (Playwright-based)    | `playwright`            | `nebula-library/scraper/extended/index.js`  |
| `DefX`    | Web scraper for DefX protocol pages (Playwright-based)    | `playwright`            | `nebula-library/scraper/defx/index.js`  |

#### Notice
 Make sure to install:
 ```bash
  npx playwright install
 ```
 If is used on a cloud service like Render, make sure to folllow the steps below:
 - Build Command: 
 ```bash
  npm install && npx playwright install
 ```
 - Start Command: 
 ```bash
  npm start
 ```
 - Add the following environment variable: `PLAYWRIGHT_BROWSERS_PATH=0`

---

### 🛠️ General Utility Modules

🧰 A collection of helper functions to enhance your development workflow.

`nebula-library/utils/index.js`

#### Key Utility Groups

- `consoleLog`: Logging utility with color-coded info, warning, and error output.
- `ethers`: Big number parsing/formatting and token math helpers.
- `gas`: Gas estimation and management utilities.
- `http`: HTTP request helpers (fetch, retry, error handling).
- `response`: Standardized API response formatting.
- `retry`: Function retry logic with backoff and attempt limits.
- `throttler`: Rate limiter for async functions and API calls.
- `tx`: Transaction management helpers (sign, send, monitor).
- `perp`: Perpetual market symbol and compatibility utilities.

Explore the full list in [`./utils/src`](./utils/src).

---

## Installation

```bash
npm install <Dependency1> <Dependency2>
```

---

## License

[MIT License](LICENSE)