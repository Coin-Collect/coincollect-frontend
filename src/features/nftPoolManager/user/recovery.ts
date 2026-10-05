import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getAddress, isAddress } from '@ethersproject/address'
import type { Provider } from '@ethersproject/providers'
import { getLocalForkStorageKey, getPolygonRuntimeChainId } from 'config/localFork'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import type { V2PoolIdentity } from '../publication'
import { v2Erc721UserAbi, v2PoolUserAbi } from './abi'
import type { V2NftTuple, V2PositionSummaryState, V2RecoveryPosition, V2UserPositionSummary } from './types'

const PAGE_SIZE = 50
const PAGE_CONCURRENCY = 4
const progressCache = new Map<
  string,
  { tuples: V2NftTuple[]; nextIndex: number; blockNumber: number; blockHash: string }
>()

function sameAddress(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase()
}

function valueOf(value: any, named: string, index: number): any {
  return value?.[named] ?? value?.[index]
}

async function validatedPoolAtBlock(
  pool: V2PoolIdentity,
  provider: Provider,
  account: string,
  expectedChainId: number,
  blockTag?: number,
) {
  if (!pool.verified || !pool.factoryAddress || !isAddress(pool.address) || !isAddress(account))
    throw new Error('Verified pool or wallet address is unavailable.')
  const network = await provider.getNetwork()
  if (network.chainId !== expectedChainId)
    throw new Error(`Wrong wallet network. Connect to chain ${expectedChainId} to recover this position.`)
  const checkedAtBlock = blockTag ?? (await provider.getBlockNumber())
  const expectedFactory = getNftSmartChefFactoryAddress(137)
  if (!expectedFactory || !sameAddress(expectedFactory, pool.factoryAddress))
    throw new Error('This pool identity does not match the configured CoinCollect factory.')
  const [poolCode, factoryCode] = await Promise.all([
    provider.getCode(pool.address, checkedAtBlock),
    provider.getCode(expectedFactory, checkedAtBlock),
  ])
  if (!poolCode || poolCode === '0x' || !factoryCode || factoryCode === '0x')
    throw new Error('Pool or factory code is unavailable on the connected chain.')
  const contract = new Contract(pool.address, v2PoolUserAbi, provider)
  const actualFactory = await contract.callStatic.SMART_CHEF_FACTORY({ blockTag: checkedAtBlock })
  if (!sameAddress(actualFactory, expectedFactory)) throw new Error('Fresh pool factory verification failed.')
  const [info, indexedBalance] = await Promise.all([
    contract.callStatic.userInfo(getAddress(account), { blockTag: checkedAtBlock }),
    contract.callStatic.balanceOf(getAddress(account), { blockTag: checkedAtBlock }),
  ])
  const count = BigNumber.from(valueOf(info, 'nftCount', 1))
  const power = BigNumber.from(valueOf(info, 'amount', 0))
  const tupleCount = BigNumber.from(indexedBalance)
  if (!count.eq(tupleCount))
    throw new Error(
      `Position count is inconsistent (userInfo ${count.toString()}, NFT index ${tupleCount.toString()}).`,
    )
  return { contract, checkedAtBlock, count, power, tupleCount }
}

export async function readV2UserPositionSummary(
  pool: V2PoolIdentity,
  provider: Provider,
  account: string,
  options: { expectedChainId?: number; blockTag?: number } = {},
): Promise<V2UserPositionSummary> {
  const expectedChainId = options.expectedChainId ?? getPolygonRuntimeChainId()
  const { checkedAtBlock, count, power } = await validatedPoolAtBlock(
    pool,
    provider,
    account,
    expectedChainId,
    options.blockTag,
  )
  if (count.isZero() && !power.isZero())
    throw new Error('Position has zero staked NFTs but non-zero stored power; zero position is inconsistent.')
  return {
    state: count.gt(0) ? 'positive' : 'zero',
    poolAddress: getAddress(pool.address),
    account: getAddress(account),
    count: count.toString(),
    power: power.toString(),
    blockNumber: checkedAtBlock,
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++
        results[index] = await worker(items[index])
      }
    }),
  )
  return results
}

export async function readV2UserRecoveryPosition(
  pool: V2PoolIdentity,
  provider: Provider,
  account: string,
  options: { expectedChainId?: number; blockTag?: number; resumePartial?: boolean } = {},
): Promise<V2RecoveryPosition> {
  const expectedChainId = options.expectedChainId ?? getPolygonRuntimeChainId()
  const latestBlock = options.blockTag ?? (await provider.getBlockNumber())
  const baseCacheKey = `${getLocalForkStorageKey(
    'nft-v2-recovery-progress',
  )}:${expectedChainId}:${pool.factoryAddress.toLowerCase()}:${pool.address.toLowerCase()}:${account.toLowerCase()}`
  let previousProgress =
    options.blockTag === undefined && options.resumePartial !== false ? progressCache.get(baseCacheKey) : undefined
  if (previousProgress) {
    const previousBlock = await provider.getBlock(previousProgress.blockNumber)
    if (!previousBlock || previousBlock.hash.toLowerCase() !== previousProgress.blockHash.toLowerCase()) {
      progressCache.delete(baseCacheKey)
      previousProgress = undefined
    }
  }
  const requestedBlock = options.blockTag ?? previousProgress?.blockNumber ?? latestBlock
  const { contract, checkedAtBlock, count, power, tupleCount } = await validatedPoolAtBlock(
    pool,
    provider,
    account,
    expectedChainId,
    requestedBlock,
  )
  if (tupleCount.gt(BigNumber.from(Number.MAX_SAFE_INTEGER.toString())))
    throw new Error('Position is positive, but its NFT count exceeds this browser’s safe enumeration range.')
  const total = tupleCount.toNumber()
  const checkedBlock = await provider.getBlock(checkedAtBlock)
  if (!checkedBlock) throw new Error(`Pinned block ${checkedAtBlock} is unavailable for NFT recovery enumeration.`)
  const checkpoint =
    previousProgress?.blockNumber === checkedAtBlock &&
    previousProgress.blockHash.toLowerCase() === checkedBlock.hash.toLowerCase()
      ? previousProgress
      : { tuples: [], nextIndex: 0, blockNumber: checkedAtBlock, blockHash: checkedBlock.hash }
  const collectionMeta = new Map(
    pool.pool?.collections.map(({ collection }) => [collection.address.toLowerCase(), collection]) || [],
  )
  const tupleByKey = new Set(
    checkpoint.tuples.map((tuple) => `${tuple.collectionAddress.toLowerCase()}:${tuple.tokenId}`),
  )

  for (let start = checkpoint.nextIndex; start < total; start += PAGE_SIZE) {
    const indices = Array.from({ length: Math.min(PAGE_SIZE, total - start) }, (_, offset) => start + offset)
    const page = await mapWithConcurrency(indices, PAGE_CONCURRENCY, async (index) => {
      const tuple = await contract.callStatic.tokenOfOwnerByIndex(getAddress(account), index, {
        blockTag: checkedAtBlock,
      })
      const collectionAddress = getAddress(valueOf(tuple, 'collection', 0))
      const tokenId = BigNumber.from(valueOf(tuple, 'tokenId', 1))
      const [weight, owner] = await Promise.all([
        contract.callStatic.tokenWeight(collectionAddress, tokenId, { blockTag: checkedAtBlock }),
        new Contract(collectionAddress, v2Erc721UserAbi, provider).callStatic.ownerOf(tokenId, {
          blockTag: checkedAtBlock,
        }),
      ])
      const storedWeight = BigNumber.from(weight)
      if (storedWeight.lte(0) || !sameAddress(owner, pool.address))
        throw new Error(`NFT ${tokenId.toString()} failed fresh custody or stored-weight validation.`)
      const metadata = collectionMeta.get(collectionAddress.toLowerCase())
      return {
        collectionAddress,
        tokenId: tokenId.toString(),
        weight: storedWeight.toString(),
        collectionName: metadata?.displayName || metadata?.name || `NFT collection ${collectionAddress.slice(0, 8)}`,
        collectionImage: metadata?.image,
      } as V2NftTuple
    })
    for (const tuple of page) {
      const key = `${tuple.collectionAddress.toLowerCase()}:${tuple.tokenId}`
      if (tupleByKey.has(key)) throw new Error(`Pool returned duplicate position tuple ${tuple.tokenId}.`)
      tupleByKey.add(key)
    }
    checkpoint.tuples.push(...page)
    checkpoint.nextIndex = start + page.length
    progressCache.set(baseCacheKey, checkpoint)
  }

  const enumeratedPower = checkpoint.tuples.reduce((sum, tuple) => sum.add(tuple.weight), BigNumber.from(0))
  if (checkpoint.tuples.length !== total || !enumeratedPower.eq(power))
    throw new Error(
      `Position is positive but its verified NFT tuples do not match stored count/power (${
        checkpoint.tuples.length
      }/${total}, ${enumeratedPower.toString()}/${power.toString()}).`,
    )
  progressCache.delete(baseCacheKey)
  const collections = new Map<string, V2RecoveryPosition['collections'][number]>()
  checkpoint.tuples.forEach((tuple) => {
    const key = tuple.collectionAddress.toLowerCase()
    const metadata = collectionMeta.get(key)
    const existing = collections.get(key) || {
      address: tuple.collectionAddress,
      name: metadata?.displayName || metadata?.name || tuple.collectionName,
      image: metadata?.image || tuple.collectionImage,
      staked: [],
    }
    existing.staked.push(tuple)
    collections.set(key, existing)
  })
  return {
    chainId: expectedChainId,
    poolAddress: getAddress(pool.address),
    account: getAddress(account),
    blockNumber: checkedAtBlock,
    nftCount: count.toString(),
    power: power.toString(),
    collections: Array.from(collections.values()),
    complete: true,
    stale: options.blockTag === undefined && checkedAtBlock < latestBlock,
  }
}

export function unknownV2PositionSummary(
  pool: V2PoolIdentity,
  account: string,
  error: unknown,
  previous?: V2UserPositionSummary,
): V2UserPositionSummary {
  if (previous?.state === 'positive')
    return {
      ...previous,
      stale: true,
      error: error instanceof Error ? error.message : String(error),
    }
  const state: V2PositionSummaryState = 'unknown'
  return {
    state,
    poolAddress: pool.address,
    account,
    stale: false,
    error: error instanceof Error ? error.message : String(error),
  }
}
