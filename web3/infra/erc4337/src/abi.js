/**
 * ERC-4337 contract ABIs for EntryPoint, Factory, and Account interactions.
 * Contains minimal function signatures required for smart account operations.
 * 
 */
export const ABI = {
  ENTRYPOINT: [
    "function getNonce(address sender, uint192 key) view returns (uint256)",
    "function getUserOpHash(tuple(address sender, uint256 nonce, bytes initCode, bytes callData, uint256 callGasLimit, uint256 verificationGasLimit, uint256 preVerificationGas, uint256 maxFeePerGas, uint256 maxPriorityFeePerGas, bytes paymasterAndData, bytes signature) userOp) view returns (bytes32)",
  ],
  FACTORY: [
    "function createAccount(address owner, uint256 salt) returns (address)",
  ],
  ACCOUNT: [
    "function execute(address dest, uint256 value, bytes calldata func) external",
    "function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func) external",
  ],
};