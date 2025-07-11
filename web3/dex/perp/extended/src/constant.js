// Number of milliseconds in one day
export const DAY_MS = 24 * 60 * 60 * 1000;

export const EXTENDED_CHAIN_ID = '0x10E';

// Time in force for Fill Or Kill (FOK)
// The order must be filled entirely immediately or it is canceled.
export const marketTimeInForce = 'IOC'; // Fill Or Kill

// Time in force for limit orders: Good Till Time (GTT)
// The order remains active until a specified time or until it is filled or canceled.
export const limitTimeInForce = 'GTT'; // Good Till Time


export const DOMAIN_TYPES = {
    StarkNetDomain: [
        { name: 'name', type: 'felt' },
        { name: 'chainId', type: 'felt' },
        { name: 'version', type: 'felt' },
    ],
};