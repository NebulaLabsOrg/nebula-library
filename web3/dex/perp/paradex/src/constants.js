// Number of milliseconds in one day
export const DAY_MS = 24 * 60 * 60 * 1000;
// Chain ID used for Paradex on the private StarkNet Paraclear mainnet
export const PARADEX_CHAIN_ID = 'PRIVATE_SN_PARACLEAR_MAINNET';
/**
 * Defines the EIP-712 domain types for StarkNet.
 *
 * @constant
 * @type {Object}
 * @property {Array<Object>} StarkNetDomain - The domain structure for StarkNet signatures.
 * @property {string} StarkNetDomain[].name - The name of the domain field.
 * @property {string} StarkNetDomain[].type - The type of the domain field (e.g., 'felt').
 *
 * This constant is used to specify the domain separator for signing and verifying messages on StarkNet,
 * ensuring the integrity and uniqueness of signed data within a specific chain and version context.
 */
export const DOMAIN_TYPES = {
    StarkNetDomain: [
        { name: 'name', type: 'felt' },
        { name: 'chainId', type: 'felt' },
        { name: 'version', type: 'felt' },
    ],
};