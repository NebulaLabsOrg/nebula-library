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

| **Module**           | **Purpose**                                         | **Dependencies**           |
|----------------------|-----------------------------------------------------|----------------------------|
| `TgNotifier`   | Telegram bot client for sending notifications       | `node-telegram-bot-api`    |

---

### 🔗 Web3 & Cryptocurrency Utilities

Effortlessly integrate blockchain technology. Crypto operation modules include:

| **Module**   | **Purpose**                                               | **Dependencies**                       |
|--------------|-----------------------------------------------------------|----------------------------------------|
| `ERC20`      | Interact with ERC20 tokens on Ethereum                    | `ethers`                               |
| `Bybit`      | Interface with Bybit exchange                             | `bybit-api`, `uuid`                    |
| `Kyberswap`  | Access Kyberswap DEX aggregator                           | `ethers`, `axios`                      |
| `Paradex`    | Connect to Paradex perpetual exchange                     | `starknet`, `axios`, `bignumber.js`    |

---

### 🛠️ General Utility Modules

🧰 A collection of helper functions to enhance your development workflow.  

#### Key Utility Groups

- `consoleLog`: Simple logging utility with support for info, warning, and error levels.
- `ethers`: Utilities for parsing and formatting big numbers, useful for token calculations.
- `gas`: Utility to manage gas.
- `http`: Utility to manage http calls.
- `response`: Standard response.
- `retry`: Retries a function with customizable backoff strategy and attempt limits.
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