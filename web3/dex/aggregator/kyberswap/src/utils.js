export function getKyberChainName(_chainID) {
    const chainMap = {
        1: "ethereum",
        10: "optimism",
        25: "cronos",
        56: "bsc",
        137: "polygon",
        199: "bittorrent",
        250: "fantom",
        324: "zksync",
        1101: "polygon-zkevm",
        5000: "mantle",
        8453: "base",
        42161: "arbitrum",
        43114: "avalanche",
        59144: "linea",
        81457: "blast",
        534352: "scroll",
        1313161554: "aurora"
    };

    return chainMap[Number(_chainID)] || null;
}