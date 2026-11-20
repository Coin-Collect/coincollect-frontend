import { isAddressEqual, parseAbi, parseAbiItem, zeroAddress, type Address, type Hex } from 'viem'
import { getLocalForkBaseBlock } from 'config/localFork'
import { ownershipVerifierAbi, universalRewardsAbi } from './abi'
import { decodeV3Presentation } from './metadata'
import { readV3ClaimPeriod, validateV3Deployment, type V3Client, type V3Deployment } from './runtime'

const erc721Abi = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address account) view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function walletOfOwner(address owner) view returns (uint256[])',
  'function tokensOfOwnerBySize(address owner, uint256 cursor, uint256 size) view returns (uint256[], uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
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
const nftTransfer = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)')

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
  settlement?: { claimLiability: bigint; expiredRecovered: bigint }
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

export async function readV3Pool(
  client: V3Client,
  deployment: V3Deployment,
  poolId: bigint,
  snapshot: SnapshotBlock,
  options: { includeSettlement?: boolean; claimPeriod?: ReturnType<typeof readV3ClaimPeriod> } = {},
) {
  if (snapshot.number === null) throw new Error('A mined block reference is required for the pool view.')
  const ledger = ledgerAt(deployment, snapshot.number)
  const [[config, checkedUntil, activeWallets, totalWeight, activeNfts], collections, rewardTokens, funding, period] =
    await Promise.all([
      client.readContract({ ...ledger, functionName: 'poolState', args: [poolId] }),
      client.readContract({ ...ledger, functionName: 'collectionRules', args: [poolId] }),
      client.readContract({ ...ledger, functionName: 'rewardsOf', args: [poolId] }),
      client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] }),
      options.claimPeriod ?? readV3ClaimPeriod(client, deployment, ledger.blockNumber),
    ])
  const rewards: RewardSnapshot[] = await Promise.all(
    rewardTokens.map(async (token) => {
      const number = ledger.blockNumber
      const [reward, details, settlement] = await Promise.all([
        client.readContract({ ...ledger, functionName: 'rewardState', args: [poolId, token] }),
        tokenDetails(client, token, number),
        period !== undefined && options.includeSettlement
          ? client
              .readContract({ ...ledger, functionName: 'rewardSettlement', args: [poolId, token] })
              .then(([claimLiability, expiredRecovered]) => ({ claimLiability, expiredRecovered }))
          : undefined,
      ])
      return { token, ...reward, ...details, settlement }
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
    claimDeadline: period === undefined ? undefined : config.end + period,
    timestamp: snapshot.timestamp,
    blockNumber: ledger.blockNumber,
    presentation: decodeV3Presentation(config.metadataURI, poolId),
  }
}

export type V3PoolSnapshot = Awaited<ReturnType<typeof readV3Pool>>

async function v3PoolPage(client: V3Client, deployment: V3Deployment, offset: number) {
  const snapshot = await client.getBlock()
  if (snapshot.number === null) throw new Error('Settlement block unavailable.')
  await validateV3Deployment(client, deployment, snapshot.number)
  const ledger = ledgerAt(deployment, snapshot.number)
  const total = await client.readContract({ ...ledger, functionName: 'poolCount' })
  const ids = Array.from({ length: MAX_V3_PAGE }, (_, index) => total - BigInt(offset + index)).filter((id) => id > NIL)
  return { snapshot, ledger, total, ids }
}

export async function readV3Catalogue(client: V3Client, deployment: V3Deployment, offset = 0) {
  const { snapshot, total, ids } = await v3PoolPage(client, deployment, offset)
  const pools: V3PoolSnapshot[] = []
  if (!ids.length) return { total, pools }
  const claimPeriod = readV3ClaimPeriod(client, deployment, snapshot.number)
  // Four pool groups at a time limits the read pressure on the shared RPC.
  for (let i = 0; i < ids.length; i += 4) {
    const batch = await Promise.all(
      ids.slice(i, i + 4).map((id) => readV3Pool(client, deployment, id, snapshot, { claimPeriod })),
    )
    pools.push(...batch)
  }
  return { total, pools }
}

export async function readV3StudioPools(client: V3Client, deployment: V3Deployment, offset: number) {
  const { snapshot, ledger, total, ids } = await v3PoolPage(client, deployment, offset)
  const readSummary = async (poolId: bigint) => {
    const [[config, , activeWallets, , activeNfts], funding] = await Promise.all([
      client.readContract({ ...ledger, functionName: 'poolState', args: [poolId] }),
      client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] }),
    ])
    return {
      poolId,
      config,
      timestamp: snapshot.timestamp,
      activeWallets,
      activeNfts,
      funding,
      presentation: decodeV3Presentation(config.metadataURI, poolId),
    }
  }
  const pools: Awaited<ReturnType<typeof readSummary>>[] = []
  for (let i = 0; i < ids.length; i += 4) {
    pools.push(...(await Promise.all(ids.slice(i, i + 4).map(readSummary))))
  }
  return { total, pools }
}

export type V3StudioPoolSummary = Awaited<ReturnType<typeof readV3StudioPools>>['pools'][number]

export async function readV3PublicPool(client: V3Client, deployment: V3Deployment, poolId: bigint) {
  const block = await client.getBlock()
  await validateV3Deployment(client, deployment, block.number)
  return readV3Pool(client, deployment, poolId, block)
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

export async function readV3CardPosition(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  account: Address,
) {
  const block = await client.getBlock()
  const amounts = pool.rewards.map(() => NIL)
  if (pool.claimDeadline !== undefined && block.timestamp >= pool.claimDeadline) {
    return {
      count: 0,
      power: 0,
      amounts,
      claimableNfts: [] as NftRef[],
      seatedNfts: [] as NftRef[],
      blockNumber: block.number,
      timestamp: block.timestamp,
    }
  }
  const ledger = ledgerAt(deployment, block.number)
  const verifier = pool.collections.some(({ sourceChainId }) => sourceChainId !== BigInt(137))
    ? await verifierAt(client, deployment, block.number)
    : zeroAddress
  const claimableNfts: NftRef[] = []
  const seatedNfts: NftRef[] = []
  let power = 0
  let offset = NIL
  let total: bigint

  do {
    const [keys, nextTotal] = await client.readContract({
      ...ledger,
      functionName: 'positionKeys',
      args: [pool.poolId, offset, BigInt(MAX_V3_PAGE)],
    })
    const owned = await Promise.all(
      keys.map(async (key) => {
        const position = await client.readContract({
          ...ledger,
          functionName: 'positionState',
          args: [pool.poolId, key],
        })
        const ownership = await ownershipAt(client, position, verifier, block.number)
        if (!isAddressEqual(account, ownership.owner)) return undefined
        const claims = await Promise.all(
          pool.rewards.map(({ token }) =>
            client.readContract({
              ...ledger,
              functionName: 'claimable',
              args: [pool.poolId, key, token],
            }),
          ),
        )
        return { position, claims }
      }),
    )
    for (const entry of owned) {
      if (!entry) continue
      const { position, claims } = entry
      if (
        position.seatOwner !== zeroAddress &&
        (position.seatExpiry === NIL || position.seatExpiry > block.timestamp)
      ) {
        seatedNfts.push(position)
        power += position.weight
      }
      if (claims.some((amount) => amount > NIL)) claimableNfts.push(position)
      claims.forEach((amount, index) => {
        amounts[index] += amount
      })
    }
    total = nextTotal
    offset += BigInt(MAX_V3_PAGE)
  } while (offset < total)

  return {
    count: seatedNfts.length,
    power,
    amounts,
    claimableNfts,
    seatedNfts,
    blockNumber: block.number,
    timestamp: block.timestamp,
  }
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
  if (!enumerable) {
    try {
      const ids = await client.readContract({ ...input, functionName: 'walletOfOwner', args: [account] })
      return {
        enumerable: true,
        total: BigInt(ids.length),
        tokenIds: ids.slice(Number(offset), Number(offset) + MAX_V3_PAGE),
      }
    } catch {
      // Some CoinCollect collections provide a paged wallet reader instead.
    }
    try {
      const total = await client.readContract({ ...input, functionName: 'balanceOf', args: [account] })
      const [tokenIds] = await client.readContract({
        ...input,
        functionName: 'tokensOfOwnerBySize',
        args: [account, offset, BigInt(MAX_V3_PAGE)],
      })
      return { enumerable: true, total, tokenIds: tokenIds.slice(0, MAX_V3_PAGE) }
    } catch {
      // Plain ERC-721 contracts can still be discovered from transfers made inside the isolated fork.
      const forkBlock = getLocalForkBaseBlock()
      if (forkBlock !== undefined && pool.blockNumber > BigInt(forkBlock)) {
        const logs = await client.getLogs({
          address: collection,
          event: nftTransfer,
          args: { to: account },
          fromBlock: BigInt(forkBlock) + BigInt(1),
          toBlock: pool.blockNumber,
          strict: true,
        })
        const ids = Array.from(new Set(logs.map(({ args }) => args.tokenId)))
        return {
          enumerable: false,
          total: BigInt(ids.length),
          tokenIds: ids.slice(Number(offset), Number(offset) + MAX_V3_PAGE),
        }
      }
      return { enumerable: false, total: NIL, tokenIds: [] }
    }
  }
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

export async function readV3NftUri(client: V3Client, ref: NftRef, blockNumber: bigint) {
  return client.readContract({
    address: ref.collection,
    abi: erc721Abi,
    functionName: 'tokenURI',
    args: [ref.tokenId],
    blockNumber,
  })
}
