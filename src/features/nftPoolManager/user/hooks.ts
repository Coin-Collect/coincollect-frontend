import { useEffect } from 'react'
import useSWR from 'swr'
import { mutate } from 'swr'
import type { Provider } from '@ethersproject/providers'
import { getPolygonRuntimeChainId } from 'config/localFork'
import { getLocalForkStorageKey } from 'config/localFork'
import { PublicV2Pool, VerifiedNftPool, V2PoolIdentity } from '../publication'
import { readV2UserPosition } from './readers'
import { readV2UserPositionSummary, readV2UserRecoveryPosition, unknownV2PositionSummary } from './recovery'
import type { V2RecoveryPosition, V2UserPosition, V2UserPositionSummary } from './types'

const verifiedSummaryCache = new Map<string, V2UserPositionSummary>()
const SUMMARY_STORAGE_KEY = getLocalForkStorageKey('coincollect:nft-v2-position-summaries:v1')
const verifiedFullPositionCache = new Map<string, V2UserPosition>()

function verifiedPositionCacheKey(pool: VerifiedNftPool, account: string) {
  return `${getLocalForkStorageKey(
    'nft-v2-verified-position',
  )}:${getPolygonRuntimeChainId()}:${pool.factoryAddress.toLowerCase()}:${pool.address.toLowerCase()}:${account.toLowerCase()}`
}

function readCachedSummary(pool: VerifiedNftPool, account: string): V2UserPositionSummary | undefined {
  const key = verifiedPositionCacheKey(pool, account)
  const memory = verifiedSummaryCache.get(key)
  if (memory) return memory
  if (typeof window === 'undefined') return undefined
  try {
    const stored = JSON.parse(window.localStorage.getItem(SUMMARY_STORAGE_KEY) || '{}')
    const value = stored[key] as V2UserPositionSummary | undefined
    if (value?.state === 'positive' && value.poolAddress.toLowerCase() === pool.address.toLowerCase()) {
      verifiedSummaryCache.set(key, value)
      return value
    }
  } catch {
    // Cached positions are only a visibility hint; they never authorize writes.
  }
  return undefined
}

function storeSummary(pool: VerifiedNftPool, account: string, summary: V2UserPositionSummary) {
  const key = verifiedPositionCacheKey(pool, account)
  verifiedSummaryCache.set(key, summary)
  if (typeof window === 'undefined') return
  try {
    const stored = JSON.parse(window.localStorage.getItem(SUMMARY_STORAGE_KEY) || '{}')
    if (summary.state === 'positive') stored[key] = summary
    else if (summary.state === 'zero') delete stored[key]
    window.localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Browser storage failure does not affect chain reads.
  }
}

export function mergeVerifiedPositionSummaryReads(
  pools: VerifiedNftPool[],
  results: Array<PromiseSettledResult<V2UserPositionSummary>>,
  account: string,
): { positions: Record<string, V2UserPositionSummary>; errors: Record<string, string> } {
  const positions: Record<string, V2UserPositionSummary> = {}
  const errors: Record<string, string> = {}
  results.forEach((result, index) => {
    const pool = pools[index]
    const address = pool.address.toLowerCase()
    if (result.status === 'fulfilled') {
      positions[address] = result.value
      storeSummary(pool, account, result.value)
    } else {
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason)
      const stale = unknownV2PositionSummary(pool, account, error, readCachedSummary(pool, account))
      positions[address] = stale
      errors[address] = error
    }
  })
  return { positions, errors }
}

async function readPositionSummariesWithConcurrency(
  pools: VerifiedNftPool[],
  provider: Provider,
  account: string,
): Promise<Array<PromiseSettledResult<V2UserPositionSummary>>> {
  const results = new Array<PromiseSettledResult<V2UserPositionSummary>>(pools.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(4, pools.length) }, async () => {
      while (cursor < pools.length) {
        const index = cursor++
        try {
          results[index] = {
            status: 'fulfilled',
            value: await readV2UserPositionSummary(pools[index], provider, account, {
              expectedChainId: getPolygonRuntimeChainId(),
            }),
          }
        } catch (reason) {
          results[index] = { status: 'rejected', reason }
        }
      }
    }),
  )
  return results
}

export function mergeV2UserPositionReads(
  pools: PublicV2Pool[],
  results: Array<PromiseSettledResult<V2UserPosition>>,
  previouslyVerified: Record<string, V2UserPosition>,
): { positions: Record<string, V2UserPosition>; errors: Record<string, string> } {
  const positions: Record<string, V2UserPosition> = {}
  const errors: Record<string, string> = {}
  results.forEach((result, index) => {
    const address = pools[index].address.toLowerCase()
    if (result.status === 'fulfilled') positions[address] = result.value
    else {
      const stalePosition = previouslyVerified[address]
      if (stalePosition) positions[address] = stalePosition
      errors[address] = result.reason instanceof Error ? result.reason.message : String(result.reason)
    }
  })
  return { positions, errors }
}

export function v2UserPositionKey(pool: PublicV2Pool, account?: string | null, chainId?: number): string | null {
  if (!account || !chainId) return null
  return `${getLocalForkStorageKey(
    'nft-v2-user',
  )}:${getPolygonRuntimeChainId()}:${pool.factoryAddress.toLowerCase()}:${chainId}:${pool.address.toLowerCase()}:${account.toLowerCase()}`
}

export function refreshV2UserPosition(pool: PublicV2Pool, account?: string | null, chainId?: number) {
  const key = v2UserPositionKey(pool, account, chainId)
  return key ? mutate(key) : Promise.resolve(undefined)
}

export function notifyV2UserPositionChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('coincollect:nft-v2-position-changed'))
}

export function usePublishedV2UserPosition(
  pool: PublicV2Pool | undefined,
  account: string | null | undefined,
  chainId: number | undefined,
  provider: Provider | undefined,
  enabled = true,
) {
  const key = enabled && pool && account && chainId && provider ? v2UserPositionKey(pool, account, chainId) : null
  const {
    data,
    error,
    isValidating,
    mutate: revalidate,
  } = useSWR<V2UserPosition>(
    key,
    () => readV2UserPosition(pool!, provider!, account!, { expectedChainId: getPolygonRuntimeChainId() }),
    { refreshInterval: 15_000, revalidateOnFocus: true, shouldRetryOnError: false, dedupingInterval: 5_000 },
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !key) return undefined
    const changed = () => void revalidate()
    window.addEventListener('coincollect:nft-v2-position-changed', changed)
    return () => window.removeEventListener('coincollect:nft-v2-position-changed', changed)
  }, [key, revalidate])
  return {
    position: data,
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
    loading: Boolean(key) && !data && !error,
    refreshing: Boolean(data && isValidating),
    refresh: () => revalidate(),
  }
}

export function usePublishedV2UserPositions(
  pools: PublicV2Pool[],
  account: string | null | undefined,
  chainId: number | undefined,
  provider: Provider | undefined,
  enabled: boolean,
) {
  const key =
    enabled && account && chainId && provider && pools.length
      ? `${getLocalForkStorageKey(
          'nft-v2-user-list',
        )}:${getPolygonRuntimeChainId()}:${chainId}:${account.toLowerCase()}:${pools
          .map((pool) => pool.address.toLowerCase())
          .sort()
          .join(',')}`
      : null
  const {
    data,
    error,
    isValidating,
    mutate: revalidate,
  } = useSWR<{
    positions: Record<string, V2UserPosition>
    errors: Record<string, string>
  }>(
    key,
    async () => {
      const results = await Promise.allSettled(
        pools.map((pool) =>
          readV2UserPosition(pool, provider!, account!, { expectedChainId: getPolygonRuntimeChainId() }),
        ),
      )
      const previous = Object.fromEntries(
        pools.flatMap((pool) => {
          const positionKey = v2UserPositionKey(pool, account, chainId)
          const cached = positionKey ? verifiedFullPositionCache.get(positionKey) : undefined
          return cached ? [[pool.address.toLowerCase(), cached]] : []
        }),
      )
      const merged = mergeV2UserPositionReads(pools, results, previous)
      pools.forEach((pool) => {
        const position = merged.positions[pool.address.toLowerCase()]
        const positionKey = v2UserPositionKey(pool, account, chainId)
        if (position && positionKey) verifiedFullPositionCache.set(positionKey, position)
      })
      return merged
    },
    { refreshInterval: 15_000, revalidateOnFocus: true, shouldRetryOnError: false, dedupingInterval: 5_000 },
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !key) return undefined
    const changed = () => void revalidate()
    window.addEventListener('coincollect:nft-v2-position-changed', changed)
    return () => window.removeEventListener('coincollect:nft-v2-position-changed', changed)
  }, [key, revalidate])
  return {
    positions: data?.positions || {},
    errors: data?.errors || (error ? { '*': error instanceof Error ? error.message : String(error) } : {}),
    loading: Boolean(key) && !data && !error,
    refreshing: Boolean(data && isValidating),
    refresh: () => revalidate(),
  }
}

/** Lightweight recovery-universe sweep. Readiness is deliberately absent from its identity. */
export function useVerifiedV2UserPositions(
  pools: VerifiedNftPool[],
  account: string | null | undefined,
  chainId: number | undefined,
  provider: Provider | undefined,
  enabled: boolean,
) {
  const key =
    enabled && account && chainId && provider && pools.length
      ? `${getLocalForkStorageKey(
          'nft-v2-verified-summary',
        )}:${getPolygonRuntimeChainId()}:${chainId}:${account.toLowerCase()}:${pools
          .map((pool) => pool.address.toLowerCase())
          .sort()
          .join(',')}`
      : null
  const {
    data,
    error,
    isValidating,
    mutate: revalidate,
  } = useSWR<{
    positions: Record<string, V2UserPositionSummary>
    errors: Record<string, string>
  }>(
    key,
    async () => {
      const results = await readPositionSummariesWithConcurrency(pools, provider!, account!)
      return mergeVerifiedPositionSummaryReads(pools, results, account!)
    },
    { refreshInterval: 5 * 60_000, revalidateOnFocus: true, shouldRetryOnError: false, dedupingInterval: 15_000 },
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !key) return undefined
    const changed = () => void revalidate()
    window.addEventListener('coincollect:nft-v2-position-changed', changed)
    return () => window.removeEventListener('coincollect:nft-v2-position-changed', changed)
  }, [key, revalidate])
  return {
    positions: data?.positions || {},
    errors: data?.errors || (error ? { '*': error instanceof Error ? error.message : String(error) } : {}),
    loading: Boolean(key) && !data && !error,
    refreshing: Boolean(data && isValidating),
    refresh: () => revalidate(),
  }
}

export function useVerifiedV2UserRecoveryPosition(
  pool: V2PoolIdentity | undefined,
  account: string | null | undefined,
  chainId: number | undefined,
  provider: Provider | undefined,
  enabled = true,
) {
  const key =
    enabled && pool && account && chainId && provider
      ? `${getLocalForkStorageKey(
          'nft-v2-recovery',
        )}:${getPolygonRuntimeChainId()}:${chainId}:${pool.factoryAddress.toLowerCase()}:${pool.address.toLowerCase()}:${account.toLowerCase()}`
      : null
  const {
    data,
    error,
    isValidating,
    mutate: revalidate,
  } = useSWR<V2RecoveryPosition>(
    key,
    () => readV2UserRecoveryPosition(pool!, provider!, account!, { expectedChainId: getPolygonRuntimeChainId() }),
    { refreshInterval: 15_000, revalidateOnFocus: true, shouldRetryOnError: false, dedupingInterval: 5_000 },
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !key) return undefined
    const changed = () => void revalidate()
    window.addEventListener('coincollect:nft-v2-position-changed', changed)
    return () => window.removeEventListener('coincollect:nft-v2-position-changed', changed)
  }, [key, revalidate])
  return {
    position: data,
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
    loading: Boolean(key) && !data && !error,
    refreshing: Boolean(data && isValidating),
    refresh: () => revalidate(),
  }
}
