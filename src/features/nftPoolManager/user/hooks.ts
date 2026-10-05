import { useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import type { Provider } from '@ethersproject/providers'
import { getPolygonRuntimeChainId, getLocalForkStorageKey } from 'config/localFork'
import type { PublicV2Pool, VerifiedNftPool, V2PoolIdentity } from '../publication'
import { readV2UserPosition } from './readers'
import { readV2UserPositionSummary, readV2UserRecoveryPosition, unknownV2PositionSummary } from './recovery'
import type { V2RecoveryPosition, V2UserPosition, V2UserPositionSummary } from './types'

const verifiedSummaryCache = new Map<string, V2UserPositionSummary>()
const SUMMARY_STORAGE_KEY = getLocalForkStorageKey('coincollect:nft-v2-position-summaries:v1')
export const V2_POSITION_CHANGED_EVENT = 'coincollect:nft-v2-position-changed'

export interface V2PositionInvalidation {
  chainId: number
  poolAddress: string
  factoryAddress: string
  account: string
}

export interface V2FullPositionReadPolicy {
  enabled: boolean
  refreshIntervalMs: number
  revalidateOnFocus: boolean
}

/** Visible cards poll at a lower rate; positive summaries still trigger one rich read offscreen. */
export function getV2FullPositionReadPolicy(
  isNearViewport: boolean,
  summary?: V2UserPositionSummary,
): V2FullPositionReadPolicy {
  return {
    enabled: isNearViewport || summary?.state === 'positive',
    refreshIntervalMs: isNearViewport ? 30_000 : 0,
    revalidateOnFocus: isNearViewport,
  }
}

function verifiedPositionCacheKey(pool: V2PoolIdentity, account: string) {
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

export type V2SummaryReader = (
  pool: VerifiedNftPool,
  provider: Provider,
  account: string,
  options: { expectedChainId?: number },
) => Promise<V2UserPositionSummary>

/** Executes the full verified-pool recovery-universe sweep with a fixed RPC concurrency cap. */
export async function readVerifiedPositionSummariesWithConcurrency(
  pools: VerifiedNftPool[],
  provider: Provider,
  account: string,
  reader: V2SummaryReader = readV2UserPositionSummary,
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
            value: await reader(pools[index], provider, account, { expectedChainId: getPolygonRuntimeChainId() }),
          }
        } catch (reason) {
          results[index] = { status: 'rejected', reason }
        }
      }
    }),
  )
  return results
}

export function v2UserPositionKey(
  pool: Pick<V2PoolIdentity, 'address' | 'factoryAddress'>,
  account?: string | null,
  chainId?: number,
): string | null {
  if (!account || !chainId) return null
  return `${getLocalForkStorageKey(
    'nft-v2-user',
  )}:${getPolygonRuntimeChainId()}:${pool.factoryAddress.toLowerCase()}:${chainId}:${pool.address.toLowerCase()}:${account.toLowerCase()}`
}

export function v2UserRecoveryPositionKey(
  pool: Pick<V2PoolIdentity, 'address' | 'factoryAddress'>,
  account?: string | null,
  chainId?: number,
): string | null {
  if (!account || !chainId) return null
  return `${getLocalForkStorageKey(
    'nft-v2-recovery',
  )}:${getPolygonRuntimeChainId()}:${chainId}:${pool.factoryAddress.toLowerCase()}:${pool.address.toLowerCase()}:${account.toLowerCase()}`
}

/** Readiness, catalogue filters and ordering do not participate in summary cache identity. */
export function verifiedPositionSummaryKey(
  pools: VerifiedNftPool[],
  account?: string | null,
  chainId?: number,
): string | null {
  if (!account || !chainId || !pools.length) return null
  const identities = pools
    .map((pool) => `${pool.factoryAddress.toLowerCase()}:${pool.address.toLowerCase()}`)
    .sort()
    .join(',')
  return `${getLocalForkStorageKey(
    'nft-v2-verified-summary',
  )}:${getPolygonRuntimeChainId()}:${chainId}:${account.toLowerCase()}:${identities}`
}

export function isV2PositionInvalidationFor(
  invalidation: V2PositionInvalidation | undefined,
  pool: Pick<V2PoolIdentity, 'address' | 'factoryAddress'>,
  account?: string | null,
  chainId?: number,
): boolean {
  return Boolean(
    invalidation &&
      account &&
      chainId &&
      invalidation.chainId === chainId &&
      invalidation.account.toLowerCase() === account.toLowerCase() &&
      invalidation.poolAddress.toLowerCase() === pool.address.toLowerCase() &&
      invalidation.factoryAddress.toLowerCase() === pool.factoryAddress.toLowerCase(),
  )
}

/** Invalidates only one pool/account's full and recovery caches, then signals the summary sweep. */
export function notifyV2UserPositionChanged(invalidation: V2PositionInvalidation) {
  const identity = {
    address: invalidation.poolAddress,
    factoryAddress: invalidation.factoryAddress,
  }
  const fullKey = v2UserPositionKey(identity, invalidation.account, invalidation.chainId)
  const recoveryKey = v2UserRecoveryPositionKey(identity, invalidation.account, invalidation.chainId)
  if (fullKey) void mutate(fullKey)
  if (recoveryKey) void mutate(recoveryKey)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<V2PositionInvalidation>(V2_POSITION_CHANGED_EVENT, { detail: invalidation }))
  }
}

export function refreshV2UserPosition(pool: PublicV2Pool, account?: string | null, chainId?: number) {
  const key = v2UserPositionKey(pool, account, chainId)
  return key ? mutate(key) : Promise.resolve(undefined)
}

export function usePublishedV2UserPosition(
  pool: PublicV2Pool | undefined,
  account: string | null | undefined,
  chainId: number | undefined,
  provider: Provider | undefined,
  enabled = true,
  refreshIntervalMs = 15_000,
  revalidateOnFocus = true,
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
    {
      refreshInterval: refreshIntervalMs,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: refreshIntervalMs > 0 && revalidateOnFocus,
      shouldRetryOnError: false,
      dedupingInterval: 5_000,
    },
  )
  return {
    position: data,
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
    loading: Boolean(key) && !data && !error,
    refreshing: Boolean(data && isValidating),
    refresh: () => revalidate(),
  }
}

export function useVerifiedV2UserPositions(
  pools: VerifiedNftPool[],
  account: string | null | undefined,
  chainId: number | undefined,
  provider: Provider | undefined,
  enabled: boolean,
) {
  const key = enabled && account && chainId && provider ? verifiedPositionSummaryKey(pools, account, chainId) : null
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
      const results = await readVerifiedPositionSummariesWithConcurrency(pools, provider!, account!)
      return mergeVerifiedPositionSummaryReads(pools, results, account!)
    },
    {
      refreshInterval: 5 * 60_000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
      dedupingInterval: 15_000,
    },
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !key || !provider || !account || !chainId) return undefined
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<V2PositionInvalidation>).detail
      const pool = pools.find((candidate) => isV2PositionInvalidationFor(detail, candidate, account, chainId))
      if (!pool) return
      void readV2UserPositionSummary(pool, provider, account, { expectedChainId: getPolygonRuntimeChainId() })
        .then((summary) => {
          storeSummary(pool, account, summary)
          void revalidate(
            (current) => ({
              positions: { ...current?.positions, [pool.address.toLowerCase()]: summary },
              errors: Object.fromEntries(
                Object.entries(current?.errors || {}).filter(([address]) => address !== pool.address.toLowerCase()),
              ),
            }),
            false,
          )
        })
        .catch((reason) => {
          const message = reason instanceof Error ? reason.message : String(reason)
          const summary = unknownV2PositionSummary(pool, account, message, readCachedSummary(pool, account))
          void revalidate(
            (current) => ({
              positions: { ...current?.positions, [pool.address.toLowerCase()]: summary },
              errors: { ...current?.errors, [pool.address.toLowerCase()]: message },
            }),
            false,
          )
        })
    }
    window.addEventListener(V2_POSITION_CHANGED_EVENT, changed)
    return () => window.removeEventListener(V2_POSITION_CHANGED_EVENT, changed)
  }, [key, account, chainId, pools, provider, revalidate])

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
  refreshIntervalMs = 15_000,
) {
  const key =
    enabled && pool && account && chainId && provider ? v2UserRecoveryPositionKey(pool, account, chainId) : null
  const {
    data,
    error,
    isValidating,
    mutate: revalidate,
  } = useSWR<V2RecoveryPosition>(
    key,
    () => readV2UserRecoveryPosition(pool!, provider!, account!, { expectedChainId: getPolygonRuntimeChainId() }),
    {
      refreshInterval: refreshIntervalMs,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: refreshIntervalMs > 0,
      shouldRetryOnError: false,
      dedupingInterval: 5_000,
    },
  )
  return {
    position: data,
    error: error instanceof Error ? error.message : error ? String(error) : undefined,
    loading: Boolean(key) && !data && !error,
    refreshing: Boolean(data && isValidating),
    refresh: () => revalidate(),
  }
}
