/**
 * @function getBybitChainName
 * @description Returns the Bybit chain name for a given settlement coin and chain ID.
 * @param {string} _settleCoin - The settlement coin symbol (e.g., 'USDC', 'USDT').
 * @param {string|number} _chainId - The blockchain network chain ID.
 * @returns {Object} An object with a boolean 'success' and the corresponding 'chainName' string (empty if not found).
 */
export function getBybitChainName(_settleCoin, _chainId) {
    const chainMap = {
        USDC: {
            1: "ETH",
            10: "OP",
            56: "BSC",
            146: "SONIC",
            8453: "BASE",
            42161: "ARBITRUM",
            43114: "AVAX",
        },
        USDT: {
            1: "ETH",
            10: "OP",
            56: "BSC",
            42161: "ARBITRUM",
            43114: "AVAX"
        }
    };

    const chainName = chainMap[_settleCoin.toUpperCase()]?.[_chainId] ?? null;
    return { success: chainName !== null, chainName: chainName || "" };
}