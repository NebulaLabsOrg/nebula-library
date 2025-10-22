// Number of milliseconds in one day
export const DAY_MS = 24 * 60 * 60 * 1000;
// The order must be filled entirely immediately or it is canceled.
export const MARKET_TIME_IN_FORCE = 'IOC'; // Fill Or Cancel
// The order remains active until a specified time or until it is filled or canceled.
export const LIMIT_TIME_IN_FORCE = 'GTT'; // Good Till Time
// Mainnet API URL
export const MAINNET_API_URL = 'https://api.starknet.extended.exchange/api/v1';
// Testnet API URL
export const TESTNET_API_URL = 'https://api.testnet.starknet.extended.exchange/api/v1';
