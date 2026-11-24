import { parseAbi } from 'viem'

export const managedBatchAbi = parseAbi([
  'function batchExitLimit() view returns (uint256)',
  'function exitBatch(uint256 poolId, (uint256 tokenId, uint128 quantity)[] selections)',
])

export type ManagedExit = { tokenId: bigint; quantity: bigint }
