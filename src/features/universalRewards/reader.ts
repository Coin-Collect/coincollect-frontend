import { isAddressEqual, parseAbi, zeroAddress, type Address, type Hex } from 'viem'
import { ownershipVerifierAbi, universalRewardsAbi } from './abi'
import { decodeV3Presentation } from './metadata'
import { validateV3Deployment, type V3Client, type V3Deployment } from './runtime'

const erc721Abi = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address account) view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
])
export const erc20Abi = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
])
export const MAX_V3_PAGE = 12
const NIL = BigInt(0)

export interface NftRef {
  sourceChainId: bigint
  collection: Address
  tokenId: bigint
}

export interface RewardSnapshot {
  token: Address
  decimals: number | null
  symbol: string
  cap: bigint
  inventory: bigint
  committed: bigint
}

function ledgerAt(deployment: V3Deployment, blockNumber: bigint) {
  return { address: deployment.address, abi: universalRewardsAbi, blockNumber }
}

export function nftRefKey(ref: NftRef) {
  return `${ref.sourceChainId}:${ref.collection.toLowerCase()}:${ref.tokenId}`
}

export async function tokenDetails(client: V3Client, address: Address, blockNumber: bigint) {
  const [decimals, symbol] = await Promise.allSettled([
    client.readContract({ address, abi: erc20Abi, functionName: 'decimals', blockNumber }),
    client.readContract({ address, abi: erc20Abi, functionName: 'symbol', blockNumber }),
  ])
  return {
    decimals: decimals.status === 'fulfilled' && decimals.value <= 36 ? decimals.value : null,
    symbol: symbol.status === 'fulfilled' && /^[ -~]{1,16}$/.test(symbol.value) ? symbol.value : address.slice(0, 8),
  }
}

type SnapshotBlock = Awaited<ReturnType<V3Client['getBlock']>>

export async function readV3Pool(client: V3Client, deployment: V3Deployment, poolId: bigint, snapshot: SnapshotBlock) {
  if (snapshot.number === null) throw new Error('A mined block reference is required for the pool view.')
  const ledger = ledgerAt(deployment, snapshot.number)
  const [[config, checkedUntil, activeWallets, totalWeight, activeNfts], collections, rewardTokens, funding] =
    await Promise.all([
      client.readContract({ ...ledger, functionName: 'poolState', args: [poolId] }),
      client.readContract({ ...ledger, functionName: 'collectionRules', args: [poolId] }),
      client.readContract({ ...ledger, functionName: 'rewardsOf', args: [poolId] }),
      client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] }),
    ])
  const rewards: RewardSnapshot[] = await Promise.all(
    rewardTokens.map(async (token) => {
      const number = ledger.blockNumber
      const [reward, details] = await Promise.all([
        client.readContract({ ...ledger, functionName: 'rewardState', args: [poolId, token] }),
        tokenDetails(client, token, number),
      ])
      return { token, ...reward, ...details }
    }),
  )
  return {
    poolId,
    config,
    checkedUntil,
    activeWallets,
    activeNfts,
    totalWeight,
    collections,
    rewards,
    funding,
    timestamp: snapshot.timestamp,
    blockNumber: ledger.blockNumber,
    presentation: decodeV3Presentation(config.metadataURI, poolId),
  }
}

export type V3PoolSnapshot = Awaited<ReturnType<typeof readV3Pool>>

export async function readV3Catalogue(client: V3Client, deployment: V3Deployment, offset = 0) {
  const snapshot = await client.getBlock()
  if (snapshot.number === null) throw new Error('Settlement block unavailable.')
  await validateV3Deployment(client, deployment, snapshot.number)
  const ledger = ledgerAt(deployment, snapshot.number)
  const total = await client.readContract({ ...ledger, functionName: 'poolCount' })
  const ids = Array.from({ length: MAX_V3_PAGE }, (_, index) => total - BigInt(offset + index)).filter((id) => id > NIL)
  const pools: V3PoolSnapshot[] = []
  // Four pool groups at a time limits the read pressure on the shared RPC.
  for (let i = 0; i < ids.length; i += 4) {
    pools.push(...(await Promise.all(ids.slice(i, i + 4).map((id) => readV3Pool(client, deployment, id, snapshot)))))
  }
  return { total, pools }
}

async function verifierAt(client: V3Client, deployment: V3Deployment, blockNumber: bigint) {
  return client.readContract({ ...ledgerAt(deployment, blockNumber), functionName: 'remoteVerifier' })
}

async function ownershipAt(client: V3Client, ref: NftRef, verifier: Address, blockNumber: bigint) {
  if (ref.sourceChainId === BigInt(137)) {
    try {
      const owner = await client.readContract({
        address: ref.collection,
        abi: erc721Abi,
        functionName: 'ownerOf',
        args: [ref.tokenId],
        blockNumber,
      })
      return { owner, proofUntil: null, unavailable: false, previousOwner: owner }
    } catch {
      return { owner: zeroAddress, proofUntil: null, unavailable: true, previousOwner: zeroAddress }
    }
  }
  if (verifier === zeroAddress)
    return { owner: zeroAddress, proofUntil: null, unavailable: true, previousOwner: zeroAddress }
  const input = {
    address: verifier,
    abi: ownershipVerifierAbi,
    args: [ref.sourceChainId, ref.collection, ref.tokenId] as const,
    blockNumber,
  }
  const [[owner, proofUntil], previous] = await Promise.all([
    client.readContract({ ...input, functionName: 'freshOwner' }),
    client.readContract({ ...input, functionName: 'latest' }),
  ])
  return { owner, proofUntil, unavailable: owner === zeroAddress, previousOwner: previous.owner }
}

export async function readV3Nft(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  account: Address,
  ref: NftRef,
) {
  const ledger = ledgerAt(deployment, pool.blockNumber)
  const weight = pool.collections.find(
    (rule) => rule.sourceChainId === ref.sourceChainId && isAddressEqual(rule.collection, ref.collection),
  )?.weight
  if (!weight) throw new Error('This NFT collection is outside the pool rules.')
  const [key, verifier] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'nftKey', args: [ref.sourceChainId, ref.collection, ref.tokenId] }),
    ref.sourceChainId !== BigInt(137) ? verifierAt(client, deployment, pool.blockNumber) : Promise.resolve(zeroAddress),
  ])
  const [ownership, position, claimable] = await Promise.all([
    ownershipAt(client, ref, verifier, pool.blockNumber),
    client.readContract({ ...ledger, functionName: 'positionState', args: [pool.poolId, key] }),
    Promise.all(
      pool.rewards.map(({ token }) =>
        client.readContract({ ...ledger, functionName: 'claimable', args: [pool.poolId, key, token] }),
      ),
    ),
  ])
  return {
    ref,
    weight,
    key,
    ...ownership,
    eligible: isAddressEqual(account, ownership.owner),
    tracked: position.collection !== zeroAddress,
    seated: position.seatOwner !== zeroAddress && (position.seatExpiry === NIL || position.seatExpiry > pool.timestamp),
    claimable,
  }
}

export type WalletNftSnapshot = Awaited<ReturnType<typeof readV3Nft>>

export async function readV3WalletSeats(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  account: Address,
) {
  return client.readContract({
    ...ledgerAt(deployment, pool.blockNumber),
    functionName: 'walletsNftCount',
    args: [pool.poolId, account],
  })
}

export async function readV3PositionPage(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  account: Address,
  offset: bigint,
) {
  const ledger = ledgerAt(deployment, pool.blockNumber)
  const [keys, total] = await client.readContract({
    ...ledger,
    functionName: 'positionKeys',
    args: [pool.poolId, offset, BigInt(MAX_V3_PAGE)],
  })
  const positions = await Promise.all(
    keys.map(async (key) => {
      const position = await client.readContract({ ...ledger, functionName: 'positionState', args: [pool.poolId, key] })
      return readV3Nft(client, deployment, pool, account, position)
    }),
  )
  return { total, positions }
}

export async function discoverV3Nfts(
  client: V3Client,
  pool: V3PoolSnapshot,
  account: Address,
  collection: Address,
  offset: bigint,
) {
  const input = { address: collection, abi: erc721Abi, blockNumber: pool.blockNumber }
  let enumerable = false
  try {
    enumerable = await client.readContract({ ...input, functionName: 'supportsInterface', args: ['0x780e9d63'] })
  } catch {
    // Manual token verification works without the optional ERC-721 Enumerable extension.
  }
  if (!enumerable) return { enumerable, total: NIL, tokenIds: [] }
  const total = await client.readContract({ ...input, functionName: 'balanceOf', args: [account] })
  const indexes = Array.from({ length: MAX_V3_PAGE }, (_, index) => BigInt(index) + offset).filter(
    (index) => index < total,
  )
  const tokenIds = await Promise.all(
    indexes.map((index) =>
      client.readContract({ ...input, functionName: 'tokenOfOwnerByIndex', args: [account, index] }),
    ),
  )
  return { enumerable, total, tokenIds }
}
