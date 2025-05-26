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