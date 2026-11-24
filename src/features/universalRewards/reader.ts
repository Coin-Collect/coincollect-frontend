import { isAddressEqual, parseAbi, parseAbiItem, zeroAddress, type Address, type Hex } from 'viem'
import { getLocalForkBaseBlock } from 'config/localFork'
import { managedNftCollectionAbi, ownershipVerifierAbi, universalRewardsAbi } from './abi'
import { decodeV3Presentation } from './metadata'
import { readManagedCollection, SETTLEMENT_SOURCE } from './managedNfts'
import { readV3BatchLimit, readV3Capacity, readV3ClaimPeriod, validateV3Deployment, type V3Client, type V3Deployment } from './runtime'

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

type ClaimableNft = NftRef & { claimable: readonly bigint[] }

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
  options: {
    includeSettlement?: boolean
    claimPeriod?: ReturnType<typeof readV3ClaimPeriod>
    capacity?: Promise<number>
    batchLimit?: Promise<number>
  } = {},
) {
  if (snapshot.number === null) throw new Error('A mined block reference is required for the pool view.')
  const ledger = ledgerAt(deployment, snapshot.number)
  const [
    [config, checkedUntil, activeWallets, totalWeight, activeNfts],
    rawCollections,
    rewardTokens,
    funding,
    period,
    capacity,
    batchLimit,
  ] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'poolState', args: [poolId] }),
    client.readContract({ ...ledger, functionName: 'collectionRules', args: [poolId] }),
    client.readContract({ ...ledger, functionName: 'rewardsOf', args: [poolId] }),
    client.readContract({ ...ledger, functionName: 'fundingState', args: [poolId] }),
    options.claimPeriod ?? readV3ClaimPeriod(client, deployment, ledger.blockNumber),
    options.capacity ?? readV3Capacity(client, deployment, ledger.blockNumber),
    options.batchLimit ?? readV3BatchLimit(client, deployment, ledger.blockNumber),
  ])
  const collections = await Promise.all(
    rawCollections.map(async (rule) => ({
      ...rule,
      managed:
        rule.sourceChainId === SETTLEMENT_SOURCE
          ? await readManagedCollection(client, deployment, rule.collection, poolId, ledger.blockNumber)
          : undefined,
    })),
  )
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
    capacity,
    batchLimit,
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

export async function readV3Catalogue(
  client: V3Client,
  deployment: V3Deployment,
  offset = 0,
  includeSettlement = false,
) {
  const { snapshot, total, ids } = await v3PoolPage(client, deployment, offset)
  const pools: V3PoolSnapshot[] = []
  if (!ids.length) return { total, pools }
  const claimPeriod = readV3ClaimPeriod(client, deployment, snapshot.number)
  const capacity = readV3Capacity(client, deployment, snapshot.number)
  const batchLimit = readV3BatchLimit(client, deployment, snapshot.number)
  // Four pool groups at a time limits the read pressure on the shared RPC.
  for (let i = 0; i < ids.length; i += 4) {
    const batch = await Promise.all(
      ids
        .slice(i, i + 4)
        .map((id) => readV3Pool(client, deployment, id, snapshot, { claimPeriod, includeSettlement, capacity, batchLimit })),
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
  const rule = pool.collections.find(
    (rule) => rule.sourceChainId === ref.sourceChainId && isAddressEqual(rule.collection, ref.collection),
  )
  if (!rule) throw new Error('This NFT collection is outside the pool rules.')
  const [key, verifier] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'nftKey', args: [ref.sourceChainId, ref.collection, ref.tokenId] }),
    ref.sourceChainId !== BigInt(137) ? verifierAt(client, deployment, pool.blockNumber) : Promise.resolve(zeroAddress),
  ])
  const adapter = { address: ref.collection, abi: managedNftCollectionAbi, blockNumber: pool.blockNumber }
  const [ownership, position, claimable, quantity, info] = await Promise.all([
    ownershipAt(client, ref, verifier, pool.blockNumber),
    client.readContract({ ...ledger, functionName: 'positionState', args: [pool.poolId, key] }),
    Promise.all(
      pool.rewards.map(({ token }) =>
        client.readContract({ ...ledger, functionName: 'claimable', args: [pool.poolId, key, token] }),
      ),
    ),
    rule.managed ? client.readContract({ ...adapter, functionName: 'positions', args: [ref.tokenId] }) : undefined,
    rule.managed ? client.readContract({ ...adapter, functionName: 'positionInfo', args: [ref.tokenId] }) : undefined,
  ])
  return {
    ref,
    weight: rule.managed ? position.weight : rule.weight,
    managed:
      rule.managed && info && quantity
        ? {
            ...rule.managed,
            underlyingId: info[0],
            holder: info[2],
            released: info[3],
            entitled: quantity[0],
            active: quantity[1],
          }
        : undefined,
    key,
    ...ownership,
    eligible: isAddressEqual(account, ownership.owner),
    tracked: position.collection !== zeroAddress,
    seatOwner: position.seatOwner,
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
  const [keys, total] = await walletKeys(client, deployment, pool, account, offset, pool.blockNumber)
  const positions = await Promise.all(
    keys.map(async (key) => {
      const position = await client.readContract({ ...ledger, functionName: 'positionState', args: [pool.poolId, key] })
      return readV3Nft(client, deployment, pool, account, position)
    }),
  )
  return { total, positions }
}

function walletKeys(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  account: Address,
  offset: bigint,
  blockNumber: bigint,
  wholePool = false,
) {
  const ledger = ledgerAt(deployment, blockNumber)
  const limit = BigInt(MAX_V3_PAGE)
  return pool.capacity > 32 && !wholePool
    ? client.readContract({
        ...ledger,
        functionName: 'walletPositionKeys',
        args: [pool.poolId, account, offset, limit],
      })
    : client.readContract({ ...ledger, functionName: 'positionKeys', args: [pool.poolId, offset, limit] })
}

export async function readV3CardPosition(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  account: Address,
  pageOffset = NIL,
  includeProjection = false,
  wholePool = false,
) {
  const block = await client.getBlock()
  const amounts = pool.rewards.map(() => NIL)
  if (pool.claimDeadline !== undefined && block.timestamp >= pool.claimDeadline) {
    return {
      count: 0,
      power: 0,
      amounts,
      claimableNfts: [] as ClaimableNft[],
      seatedNfts: [] as NftRef[],
      blockNumber: block.number,
      timestamp: block.timestamp,
      total: NIL,
      projection: undefined,
    }
  }
  const ledger = ledgerAt(deployment, block.number)
  const verifier = pool.collections.some(({ sourceChainId }) => sourceChainId !== BigInt(137))
    ? await verifierAt(client, deployment, block.number)
    : zeroAddress
  const claimableNfts: ClaimableNft[] = []
  const seatedNfts: NftRef[] = []
  let power = 0
  const indexed = pool.capacity > 32 && !wholePool
  let offset = indexed ? pageOffset : NIL
  let total: bigint

  do {
    const [keys, nextTotal] = await walletKeys(client, deployment, pool, account, offset, block.number, wholePool)
    let candidates = keys
    // An NFT received by transfer may not be in this wallet's observed history yet.
    // Look at one bounded collection page. The detail view supports other collections and manual token IDs.
    const collection =
      indexed && offset === NIL && keys.length === 0
        ? pool.collections.find(({ sourceChainId, managed }) => sourceChainId === BigInt(137) && !managed)
        : undefined
    if (collection) {
      const inventory = await discoverV3Nfts(
        client,
        { ...pool, blockNumber: block.number },
        account,
        collection.collection,
        NIL,
      )
      candidates = await Promise.all(
        inventory.tokenIds.map((tokenId) =>
          client.readContract({
            ...ledger,
            functionName: 'nftKey',
            args: [collection.sourceChainId, collection.collection, tokenId],
          }),
        ),
      )
    }
    const owned = await Promise.all(
      candidates.map(async (key) => {
        const position = await client.readContract({
          ...ledger,
          functionName: 'positionState',
          args: [pool.poolId, key],
        })
        if (position.collection === zeroAddress) return undefined
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
      if (claims.some((amount) => amount > NIL)) claimableNfts.push({ ...position, claimable: claims })
      claims.forEach((amount, index) => {
        amounts[index] += amount
      })
    }
    total = nextTotal
    offset += BigInt(MAX_V3_PAGE)
  } while (!indexed && offset < total)

  const recorded = indexed
    ? await client.readContract({ ...ledger, functionName: 'walletPositionStats', args: [pool.poolId, account] })
    : undefined
  const projection =
    indexed &&
    includeProjection &&
    power > 0 &&
    block.timestamp >= pool.config.start &&
    block.timestamp < pool.config.end &&
    pool.collections.every(
      ({ sourceChainId, managed }) => (managed?.sourceChainId ?? sourceChainId) === SETTLEMENT_SOURCE,
    )
      ? await readRewardProjection(client, deployment, pool, block.number, power)
      : undefined

  return {
    count: Math.max(recorded?.[0] ?? 0, seatedNfts.length),
    power: Math.max(Number(recorded?.[1] ?? NIL), power),
    amounts,
    claimableNfts,
    seatedNfts,
    blockNumber: block.number,
    timestamp: block.timestamp,
    total: indexed ? total : BigInt(seatedNfts.length),
    projection,
  }
}

async function readRewardProjection(
  client: V3Client,
  deployment: V3Deployment,
  pool: V3PoolSnapshot,
  blockNumber: bigint,
  pageWeight: number,
) {
  const ledger = ledgerAt(deployment, blockNumber)
  const [state, rewards] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'poolState', args: [pool.poolId] }),
    Promise.all(
      pool.rewards.map(async ({ token }) => {
        const [reward, [liability]] = await Promise.all([
          client.readContract({ ...ledger, functionName: 'rewardState', args: [pool.poolId, token] }),
          client.readContract({ ...ledger, functionName: 'rewardSettlement', args: [pool.poolId, token] }),
        ])
        return { ...reward, liability }
      }),
    ),
  ])
  return { rewards, pageWeight: BigInt(pageWeight), wallets: state[2], totalWeight: state[3] }
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
    const ownedCount = await client
      .readContract({ ...input, functionName: 'balanceOf', args: [account] })
      .catch(() => undefined)
    try {
      const [tokenIds] = await client.readContract({
        ...input,
        functionName: 'tokensOfOwnerBySize',
        args: [account, offset, BigInt(MAX_V3_PAGE)],
      })
      return {
        enumerable: true,
        total: ownedCount ?? BigInt(tokenIds.length),
        tokenIds: tokenIds.slice(0, MAX_V3_PAGE),
      }
    } catch {
      if (ownedCount !== undefined && ownedCount <= BigInt(MAX_V3_PAGE * 4)) {
        const ids = await client
          .readContract({ ...input, functionName: 'walletOfOwner', args: [account] })
          .catch(() => undefined)
        if (ids)
          return {
            enumerable: true,
            total: BigInt(ids.length),
            tokenIds: ids.slice(Number(offset), Number(offset) + MAX_V3_PAGE),
          }
      }
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
