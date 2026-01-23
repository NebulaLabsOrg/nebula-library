/**
 * GRVT API Endpoints
 * Following NebulaLabs architecture pattern
 * 
 * Architecture:
 * - Auth endpoints: edge.* (edge.grvt.io, edge.testnet.grvt.io, edge.staging.gravitymarkets.io)
 * - Trading API endpoints: trades.* (trades.grvt.io, trades.testnet.grvt.io, trades.staging.gravitymarkets.io)
 * - Market Data endpoints: market-data.* (market-data.grvt.io, market-data.testnet.grvt.io, market-data.staging.gravitymarkets.io)
 */

// Auth Base URLs (for authentication only)
export const GRVT_AUTH_MAINNET_URL = 'https://edge.grvt.io';
export const GRVT_AUTH_TESTNET_URL = 'https://edge.testnet.grvt.io';
export const GRVT_AUTH_STAGING_URL = 'https://edge.staging.gravitymarkets.io';

// Trading API Base URLs (for orders, account, positions, transfers)
export const GRVT_MAINNET_URL = 'https://trades.grvt.io';
export const GRVT_TESTNET_URL = 'https://trades.testnet.grvt.io';
export const GRVT_STAGING_URL = 'https://trades.staging.gravitymarkets.io';

// Market Data API Base URLs (for instruments, ticker, orderbook, candles)
export const GRVT_MARKET_DATA_MAINNET_URL = 'https://market-data.grvt.io';
export const GRVT_MARKET_DATA_TESTNET_URL = 'https://market-data.testnet.grvt.io';
export const GRVT_MARKET_DATA_STAGING_URL = 'https://market-data.staging.gravitymarkets.io';

// Order TimeInForce
export const MARKET_TIME_IN_FORCE = 'IOC';      // Immediate Or Cancel
export const LIMIT_TIME_IN_FORCE = 'GTT';       // Good Till Time

// Order Expiration
export const ORDER_EXPIRATION_MS = 24 * 60 * 60 * 1000;  // 24 hours in milliseconds
export const ORDER_EXPIRATION_NS = 20 * 24 * 60 * 60 * 1_000_000_000;  // 20 days in nanoseconds

// Decimals for precision (following GRVT specs)
export const PRICE_DECIMALS = 9;
export const SIZE_DECIMALS = 9;
export const USDT_DECIMALS = 6;

// Slippage defaults
export const DEFAULT_SLIPPAGE_PERCENT = 0.5;    // 0.5%

// Polling intervals
export const ORDER_MONITOR_INTERVAL_MS = 500;   // 500ms between checks
export const ORDER_MONITOR_TIMEOUT_SEC = 120;   // 2 minute timeout

// Vault IDs
export const GLP_VAULT_ID = '1463215095';       // GLP Vault

// Retry configuration
export const MAX_RETRIES = 3;
export const RETRY_DELAY_MS = 1000;
