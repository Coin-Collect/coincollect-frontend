import { useCallback, useEffect, useState } from 'react'
import { simplePolygonRpcProvider } from 'utils/providers'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { normalizeNftCollectionRegistry, NFT_POOL_MANAGER_CHAIN_ID } from './registry'
import { getNftPoolRegistry, clearNftPoolRegistryCache } from './discovery'
import { NftPoolRegistryResult } from './types'

const createNftPoolRegistrySeed = (): NftPoolRegistryResult => ({
  pools: [],
  collections: normalizeNftCollectionRegistry(undefined, NFT_POOL_MANAGER_CHAIN_ID),
  chainId: NFT_POOL_MANAGER_CHAIN_ID,
  currentBlock: 0,
  secondsPerBlock: 2.2,
  factoryAddress: getNftSmartChefFactoryAddress(NFT_POOL_MANAGER_CHAIN_ID) || undefined,
})

export function useNftPoolRegistry() {
  const [data, setData] = useState<NftPoolRegistryResult>(() => createNftPoolRegistrySeed())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    clearNftPoolRegistryCache()
    try {
      setData(await getNftPoolRegistry(simplePolygonRpcProvider, true))
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'NFT pool registry could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    getNftPoolRegistry(simplePolygonRpcProvider)
      .then((value) => active && setData(value))
      .catch(
        (reason) =>
          active && setError(reason instanceof Error ? reason.message : 'NFT pool registry could not be loaded.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return { data, loading, error, refresh }
}
