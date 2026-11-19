import { useCallback, useEffect, useState } from 'react'
import useSWR from 'swr'
import { POLYGON_BLOCK_TIME } from 'config'
import { getLocalForkStorageKey, getPolygonRuntimeChainId } from 'config/localFork'
import { nftPoolRegistryRpcProvider } from 'utils/providers'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { normalizeNftCollectionRegistry, NFT_POOL_MANAGER_CHAIN_ID } from './registry'
import { getCachedAdminNftPoolRegistry, getNftPoolRegistry, readNftPoolAdminDetail } from './discovery'
import { NftPoolRegistryResult } from './types'

const createNftPoolRegistrySeed = (): NftPoolRegistryResult => ({
  pools: [],
  collections: normalizeNftCollectionRegistry(undefined, NFT_POOL_MANAGER_CHAIN_ID),
  chainId: NFT_POOL_MANAGER_CHAIN_ID,
  currentBlock: 0,
  secondsPerBlock: 2.2,
  factoryAddress: getNftSmartChefFactoryAddress(NFT_POOL_MANAGER_CHAIN_ID) || undefined,
})

export function useNftPoolRegistry(enabled = true) {
  const [data, setData] = useState<NftPoolRegistryResult>(() => createNftPoolRegistrySeed())
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getNftPoolRegistry(nftPoolRegistryRpcProvider, true, 'admin-summary'))
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'NFT pool registry could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const cached = getCachedAdminNftPoolRegistry()
    if (cached) setData(cached)
    if (!enabled) {
      setLoading(false)
      return undefined
    }
    let active = true
    setLoading(true)
    getNftPoolRegistry(nftPoolRegistryRpcProvider, false, 'admin-summary')
      .then((value) => {
        if (!active) return
        setData(value)
        setError(null)
      })
      .catch(
        (reason) =>
          active && setError(reason instanceof Error ? reason.message : 'NFT pool registry could not be loaded.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [enabled])

  return { data, loading, error, refresh }
}

export function useNftPoolAdminDetail(id: string) {
  const key = id ? getLocalForkStorageKey(`admin-nft-pool:${getPolygonRuntimeChainId()}:${id.toLowerCase()}`) : null
  const { data, error, isValidating, mutate } = useSWR(
    key,
    () => readNftPoolAdminDetail(nftPoolRegistryRpcProvider, id),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  )
  return {
    pool: data?.pool,
    secondsPerBlock: data?.secondsPerBlock ?? POLYGON_BLOCK_TIME,
    loading: Boolean(key && !data && !error),
    refreshing: isValidating,
    error: error ? (error instanceof Error ? error.message : 'NFT pool could not be read.') : null,
    refresh: mutate,
  }
}
