import { DAY_MS, DOMAIN_TYPES } from './constants.js';
import BigNumber from "bignumber.js";

/**
 * @function clearParadexHeaders
 * @description Removes Paradex-specific authentication headers from the provided Axios instance.
 * @param {Object} _instance - Axios instance configured for Paradex API.
 */
export function clearParadexHeaders(_instance) {
  delete _instance.defaults.headers['PARADEX-ETHEREUM-ACCOUNT'];
  delete _instance.defaults.headers['PARADEX-STARKNET-ACCOUNT'];
  delete _instance.defaults.headers['PARADEX-STARKNET-SIGNATURE'];
  delete _instance.defaults.headers['PARADEX-TIMESTAMP'];
  delete _instance.defaults.headers['PARADEX-SIGNATURE-EXPIRATION'];
}
/**
 * @function generateParadexTimestamps
 * @description Generates current and expiration timestamps (in seconds) for Paradex authentication, where expiration is set to 24 hours after the current time.
 * @returns {Object} An object containing `timestamp` (current time in seconds) and `expiration` (expiration time in seconds).
 */
export function generateParadexTimestamps() {
  const dateNow = new Date();
  const dateExpiration = new Date(dateNow.getTime() + DAY_MS);
  return {
    timestamp: Math.floor(dateNow.getTime() / 1000),
    timestampMs: dateNow.getTime(),
    expiration: Math.floor(dateExpiration.getTime() / 1000),
  };
}
/**
 * @function buildParadexDomain
 * @description Constructs the EIP-712 domain object for Paradex typed data signatures.
 * @param {string|number} _starknetChainId - The StarkNet chain ID to use in the domain.
 * @returns {Object} The domain object containing `name`, `chainId`, and `version` fields.
 */
export function buildParadexDomain(_starknetChainId) {
  return {
    name: 'Paradex',
    chainId: _starknetChainId,
    version: '1',
  };
}
/**
 * @function buildOnboardingTypedData
 * @description Constructs the EIP-712 typed data object for Paradex user onboarding.
 * @param {string|number} _starknetChainId - The StarkNet chain ID to use in the domain.
 * @returns {Object} The typed data object for onboarding, including domain, types, primaryType, and message.
 */
export function buildOnboardingTypedData(_starknetChainId) {
  const paradexDomain = buildParadexDomain(_starknetChainId);
  return {
    domain: paradexDomain,
    primaryType: 'Constant',
    types: {
      ...DOMAIN_TYPES,
      Constant: [{ name: 'action', type: 'felt' }],
    },
    message: {
      action: 'Onboarding',
    },
  };
}
/**
 * @function buildAuthTypedData
 * @description Constructs the EIP-712 typed data object for Paradex API authentication requests.
 * @param {Object} message - The message object containing method, path, body, timestamp, and expiration.
 * @param {string|number} starknetChainId - The StarkNet chain ID to use in the domain.
 * @returns {Object} The typed data object for authentication, including domain, types, primaryType, and message.
 */
export function buildAuthTypedData(_message, _starknetChainId) {
  const paradexDomain = buildParadexDomain(_starknetChainId);
  return {
    domain: paradexDomain,
    primaryType: 'Request',
    types: {
      ...DOMAIN_TYPES,
      Request: [
        { name: 'method', type: 'felt' }, // string
        { name: 'path', type: 'felt' }, // string
        { name: 'body', type: 'felt' }, // string
        { name: 'timestamp', type: 'felt' }, // number
        { name: 'expiration', type: 'felt' }, // number
      ],
    },
    message: _message,
  };
}
/**
 * @function buildOrderTypedData
 * @description Constructs the EIP-712 typed data object for Paradex order signing requests.
 * @param {Object} _message - The order message object containing order details such as timestamp, market, side, orderType, size, and price.
 * @param {string|number} _starknetChainId - The StarkNet chain ID to use in the domain.
 * @returns {Object} The typed data object for order signing, including domain, types, primaryType, and message.
 */
export function buildOrderTypedData(_message, _starknetChainId) {
  const paradexDomain = buildParadexDomain(_starknetChainId);
  return {
    domain: paradexDomain,
    primaryType: "Order",
    types: {
      ...DOMAIN_TYPES,
      Order: [
        { name: "timestamp", type: "felt" }, // UnixTimeMs; Acts as a nonce
        { name: "market", type: "felt" }, // 'BTC-USD-PERP'
        { name: "side", type: "felt" }, // '1': 'BUY'; '2': 'SELL'
        { name: "orderType", type: "felt" }, // 'LIMIT';  'MARKET'
        { name: "size", type: "felt" }, // Quantum value
        { name: "price", type: "felt" }, // Quantum value; '0' for Market order
      ],
    },
    message: _message,
  };
}
/**
 * @function toQuantums
 * @description Converts a given amount to its quantum representation based on the specified precision.
 * @param {string|BigNumber} amount - The amount to convert, as a string or BigNumber.
 * @param {number} precision - The number of decimal places to consider for quantization.
 * @returns {string} The quantum representation of the amount as a string.
 */
export function toQuantums(amount, precision) {
  const bnAmount = typeof amount === "string" ? BigNumber(amount) : amount;
  const bnQuantums = bnAmount.dividedBy(`1e-${precision}`);
  return bnQuantums.integerValue(BigNumber.ROUND_FLOOR).toString();
}
