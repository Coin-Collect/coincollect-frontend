import { parseAbi } from 'viem'

export const positionBatchAbi = parseAbi([
  'function batchPositionLimit() pure returns (uint256)',
  'function claimBatch(uint256 poolId, (uint256 sourceChainId, address collection, uint256 tokenId)[] nfts)',
  'function exitBatch(uint256 poolId, (uint256 sourceChainId, address collection, uint256 tokenId)[] nfts)',
])
