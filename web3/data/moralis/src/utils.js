/**
 * @method getMoralisChainEnum
 * @description Returns the Moralis chain enum (hex string) for a given chain ID.
 * @param {number} _chainID - The blockchain network chain ID.
 * @returns {string|null} The Moralis chain enum as a hex string if found, otherwise null.
 */
export function getMoralisChainEnum(_chainID) {
    const chainMap = {
        1: "0x1",
        10: "0xa",
        25: "0x19",
        56: "0x38",
        100: "0x64",
        137: "0x89",
        250: "0xfa",
        369: "0x171",
        42161: "0xa4b1",
        747: "0x2eb",
        1135: "0x46f",
        1284: "0x504",
        2020: "0x7e4",
        8453: "0x2105",
        59144: "0xe708",
        43114: "0xa86a",
        88888: "0x15b38"
    };

    return chainMap[Number(_chainID)] || null;
}
