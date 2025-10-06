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
| `TgNotifier`   | Telegram bot client for sending notifications       | `node-telegram-bot-api`    | `nebula-library/telegram-bot/index.js`    |

---

### 🔗 Web3 & Cryptocurrency Utilities

Effortlessly integrate blockchain technology. Crypto operation modules include:

#### 🏦 Centralized Exchanges (CEX)

| **Module**   | **Purpose**                 | **Dependencies**      | **Path**                                   |
|--------------|-----------------------------|-----------------------|--------------------------------------------|
| `Bybit`      | Interface with Bybit exchange| `bybit-api`, `uuid`   | `nebula-library/web3/cex/bybit/index.js`   |

#### 🏦 Decentralized Exchanges (DEX) Aggregators

| **Module**     | **Purpose**                         | **Dependencies**        | **Path**                                              |
|----------------|-------------------------------------|-------------------------|-------------------------------------------------------|
| `Kyberswap`    | Access Kyberswap DEX aggregator     | `ethers`, `axios`       | `nebula-library/web3/dex/aggregator/kyberswap/index.js` |

#### 📈 Perpetual Exchanges (Perp)

| **Module**   | **Purpose**                              | **Dependencies**                  | **Path**                                               |
|--------------|------------------------------------------|-----------------------------------|--------------------------------------------------------|
| `Paradex`    | Connect to Paradex perpetual exchange    | `starknet`, `axios`, `bignumber.js` | `nebula-library/web3/dex/perp/paradex/index.js`         |
| `Extended`   | Connect to Extended perpetual exchange   | `starknet`, `axios`, `decimal.js`   | `nebula-library/web3/dex/perp/extended/index.js`        |
| `DefX`       | Connect to Defx perpetual exchange       | `axios`                             | `nebula-library/web3/dex/perp/defx/index.js`            |

#### 🌉 Bridges

| **Module**   | **Purpose**                                   | **Dependencies**                          | **Path**                                         |
|--------------|-----------------------------------------------|-------------------------------------------|--------------------------------------------------|
| `Rhino`      | Access Rhino Bridge (EVM, Paradex, Starknet)  | `ethers`, `@rhino.fi/sdk`, `@paradex/sdk` | `nebula-library/web3/bridge/rhino/index.js`      |

#### 🪙 Token & Data Utilities

| **Module**   | **Purpose**                                                      | **Dependencies** | **Path**                                   |
|--------------|------------------------------------------------------------------|------------------|--------------------------------------------|
| `ERC20`      | Interact with ERC20 tokens                                       | `ethers`         | `nebula-library/web3/token/ERC20/index.js` |
| `Moralis`    | Web3 data provider (token, wallet, nft, price, DeFi, blockchain) | `axios`          | `nebula-library/web3/data/moralis/index.js`|
| `Defillama`  | Web3 data provider (token, market, price, DeFi) | `axios`          | `nebula-library/web3/data/defillama/index.js`|

---

### 📦 Scraper Module

Automate data extraction from websites and APIs.

| **Module**   | **Purpose**                                    | **Dependencies**         | **Path**                           |
|--------------|------------------------------------------------|--------------------------|------------------------------------|
| `Extended`    | Scrapes data from specified Extended pages    | `playwright`            | `nebula-library/scraper/extended/index.js`  |
| `DefX`    | Scrapes data from specified DefX pages    | `playwright`            | `nebula-library/scraper/defx/index.js`  |

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

- `consoleLog`: Simple logging utility with support for info, warning, and error levels.
- `ethers`: Utilities for parsing and formatting big numbers, useful for token calculations.
- `gas`: Utility to manage gas.
- `http`: Utility to manage http calls.
- `response`: Standard response.
- `retry`: Retries a function with customizable backoff strategy and attempt limits.
- `throttler`: Controls the rate of function execution to prevent exceeding API limits or resource exhaustion.
- `tx`: Utility to manage txs.

Explore the full list in [`./utils/src`](./utils/src).

---

## Installation

```bash
npm install <Dependency1> <Dependency2>
```

---

## License

[MIT License](LICENSE)