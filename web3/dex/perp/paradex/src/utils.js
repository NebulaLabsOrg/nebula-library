import { DAY_MS, DOMAIN_TYPES } from './constants.js';

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
export function buildAuthTypedData(message, starknetChainId) {
  const paradexDomain = buildParadexDomain(starknetChainId);
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
    message,
  };
}