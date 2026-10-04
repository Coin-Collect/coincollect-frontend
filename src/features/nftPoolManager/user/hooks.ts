import { useEffect, useRef } from 'react'
import useSWR from 'swr'
import { mutate } from 'swr'
import type { Provider } from '@ethersproject/providers'
import { getPolygonRuntimeChainId } from 'config/localFork'
import { PUBLICATION_STORAGE_KEY, PublicV2Pool } from '../publication'
import { readV2UserPosition } from './readers'
import type { V2UserPosition } from './types'

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
  return `nft-v2-user:${getPolygonRuntimeChainId()}:${PUBLICATION_STORAGE_KEY}:${chainId}:${pool.address.toLowerCase()}:${account.toLowerCase()}`
}

export function refreshV2UserPosition(pool: PublicV2Pool, account?: string | null, chainId?: number) {
  const key = v2UserPositionKey(pool, account, chainId)
  return key ? mutate(key) : Promise.resolve(undefined)
}

export function notifyV2UserPositionChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('coincollect:nft-v2-position-changed'))
}

export function usePublishedV2UserPosition(
  pool: PublicV2Pool,
  account: string | null | undefined,
  chainId: number | undefined,
  provider: Provider | undefined,
  enabled = true,
) {
  const key = enabled && account && chainId && provider ? v2UserPositionKey(pool, account, chainId) : null
  const {
    data,
    error,
    isValidating,
    mutate: revalidate,
  } = useSWR<V2UserPosition>(
    key,
    () => readV2UserPosition(pool, provider!, account!, { expectedChainId: getPolygonRuntimeChainId() }),
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
      ? `nft-v2-user-list:${getPolygonRuntimeChainId()}:${PUBLICATION_STORAGE_KEY}:${chainId}:${account.toLowerCase()}:${pools
          .map((pool) => pool.address.toLowerCase())
          .sort()
          .join(',')}`
      : null
  const verifiedPositionCache = useRef<{ key: string; positions: Record<string, V2UserPosition> }>({
    key: '',
    positions: {},
  })
  if (verifiedPositionCache.current.key !== key) {
    verifiedPositionCache.current = { key: key || '', positions: {} }
  }
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
      const previous = verifiedPositionCache.current.key === key ? verifiedPositionCache.current.positions : {}
      const merged = mergeV2UserPositionReads(pools, results, previous)
      verifiedPositionCache.current = { key: key || '', positions: merged.positions }
      return merged
    },
    { refreshInterval: 15_000, revalidateOnFocus: true, shouldRetryOnError: false, dedupingInterval: 5_000 },
  )
  useEffect(() => {
    if (!key || !data) return
    verifiedPositionCache.current = {
      key,
      positions: { ...verifiedPositionCache.current.positions, ...data.positions },
    }
  }, [key, data])
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
  }
}
