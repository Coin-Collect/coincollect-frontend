import { useCallback, useEffect, useState } from 'react'
import { simplePolygonRpcProvider } from 'utils/providers'
import { getNftPoolRegistry, clearNftPoolRegistryCache } from './discovery'
import { NftPoolRegistryResult } from './types'

export function useNftPoolRegistry() {
  const [data, setData] = useState<NftPoolRegistryResult | null>(null)
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
