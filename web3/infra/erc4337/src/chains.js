/**
 * Supported blockchain networks with ERC-4337 configuration.
 * Each chain includes factory address, entryPoint, and explorer URLs.
 * 
 */
export const CHAINS = {
  // Testnets
  11155111: {
    name: "Sepolia",
    chainId: 11155111,
    factoryAddress: "0x00004EC70002a32400f8ae005A26081065620D20",
    factoryVersion: "v1.0.2",
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    entryPointVersion: "v0.6",
    explorer: "https://sepolia.etherscan.io",
    jiffyscan: "https://jiffyscan.xyz",
  },
  80001: {
    name: "Polygon Mumbai",
    chainId: 80001,
    factoryAddress: "0x00004EC70002a32400f8ae005A26081065620D20",
    factoryVersion: "v1.0.2",
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    entryPointVersion: "v0.6",
    explorer: "https://mumbai.polygonscan.com",
    jiffyscan: "https://jiffyscan.xyz",
  },
  
  // Mainnets
  1: {
    name: "Ethereum Mainnet",
    chainId: 1,
    factoryAddress: "0x00004EC70002a32400f8ae005A26081065620D20",
    factoryVersion: "v1.0.2",
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    entryPointVersion: "v0.6",
    explorer: "https://etherscan.io",
    jiffyscan: "https://jiffyscan.xyz",
  },
  137: {
    name: "Polygon",
    chainId: 137,
    factoryAddress: "0x00004EC70002a32400f8ae005A26081065620D20",
    factoryVersion: "v1.0.2",
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    entryPointVersion: "v0.6",
    explorer: "https://polygonscan.com",
    jiffyscan: "https://jiffyscan.xyz",
  },
  42161: {
    name: "Arbitrum One",
    chainId: 42161,
    factoryAddress: "0x00004EC70002a32400f8ae005A26081065620D20",
    factoryVersion: "v1.0.2",
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    entryPointVersion: "v0.6",
    explorer: "https://arbiscan.io",
    jiffyscan: "https://jiffyscan.xyz",
  },
  10: {
    name: "Optimism",
    chainId: 10,
    factoryAddress: "0x00004EC70002a32400f8ae005A26081065620D20",
    factoryVersion: "v1.0.2",
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    entryPointVersion: "v0.6",
    explorer: "https://optimistic.etherscan.io",
    jiffyscan: "https://jiffyscan.xyz",
  },
  8453: {
    name: "Base",
    chainId: 8453,
    factoryAddress: "0x00004EC70002a32400f8ae005A26081065620D20",
    factoryVersion: "v1.0.2",
    entryPointAddress: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    entryPointVersion: "v0.6",
    explorer: "https://basescan.org",
    jiffyscan: "https://jiffyscan.xyz",
  },
};
