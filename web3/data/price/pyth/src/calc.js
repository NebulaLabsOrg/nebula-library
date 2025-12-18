// Basis points constant (1 BPS = 0.01%)
const BPS = 10_000n;

/**
 * Calculates price bounds and confidence ratio for a price point.
 * @param {Object} _pricePoint - The price point object containing price, conf, expo, and publish_time.
 * @returns {Object} Object with mid price (mu), lower/upper bounds, confidence ratio (bps), exponent, and publish time.
 */
export function calculatePriceBounds(_pricePoint) {
    // Mid price (mu)
    const mu = BigInt(_pricePoint.price);
    // Confidence interval (sigma)
    const sigma = BigInt(_pricePoint.conf);
    // Lower bound (mu - sigma)
    const lower = mu - sigma;
    // Upper bound (mu + sigma)
    const upper = mu + sigma;
    // Absolute value of mu
    const absMu = mu < 0n ? -mu : mu;
    // Confidence ratio in basis points (bps)
    // If price is zero, set to a large value
    const confRatioBps = absMu === 0n ? BPS * 1_000n : (sigma * BPS) / absMu;
    // Return all calculated values and metadata
    return {
        mu,           // Mid price
        lower,        // Lower bound
        upper,        // Upper bound
        confRatioBps, // Confidence ratio (bps)
        expo: _pricePoint.expo,           // Exponent
        publishTime: _pricePoint.publish_time // Publish timestamp
    };
}