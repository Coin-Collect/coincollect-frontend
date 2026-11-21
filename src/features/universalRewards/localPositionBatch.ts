import { getLocalForkRpcUrl, isLocalForkMode } from 'config/localFork'
import { parseAbi } from 'viem'
import type { V3Deployment } from './runtime'

// Experimental methods for the separate local Anvil ledger. The release ABI is generated from Solidity.
export const localPositionBatchAbi = parseAbi([
  'function batchPositionLimit() pure returns (uint256)',
  'function claimBatch(uint256 poolId, (uint256 sourceChainId, address collection, uint256 tokenId)[] nfts)',
  'function exitBatch(uint256 poolId, (uint256 sourceChainId, address collection, uint256 tokenId)[] nfts)',
])

export function allowsLocalPositionBatch(deployment: V3Deployment) {
  return isLocalForkMode && deployment.chainId === 31337 && Boolean(getLocalForkRpcUrl())
}
