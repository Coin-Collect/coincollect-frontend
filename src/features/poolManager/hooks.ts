import { useCallback, useEffect, useState } from 'react'
import useWeb3React from 'hooks/useWeb3React'
import { simplePolygonRpcProvider } from 'utils/providers'
import { getFactoryAuthority } from './authority'
import { getUnifiedPoolRegistry } from './discovery'
import { PoolManagerAuthority, PoolRegistryResult } from './types'

export function usePoolManagerRegistry() {
  const { account } = useWeb3React()
  const [data, setData] = useState<PoolRegistryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setData(await getUnifiedPoolRegistry(simplePolygonRpcProvider, account, true))
      setError(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Pool registry could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [account])

  useEffect(() => {
    let active = true
    setLoading(true)
    getUnifiedPoolRegistry(simplePolygonRpcProvider, account)
      .then((value) => active && setData(value))
      .catch(
        (reason) => active && setError(reason instanceof Error ? reason.message : 'Pool registry could not be loaded.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [account])

  return { data, loading, error, refresh }
}

export function usePoolManagerAuthority(
  factoryAddressOverride?: string | null,
): PoolManagerAuthority & { loading: boolean; refresh: () => Promise<void> } {
  const { account } = useWeb3React()
  const [authority, setAuthority] = useState<PoolManagerAuthority>({
    factoryAddress: null,
    account,
    ownerIsContract: false,
    authorized: false,
    state: 'UNAVAILABLE',
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setAuthority(await getFactoryAuthority(simplePolygonRpcProvider, account, 137, factoryAddressOverride))
    setLoading(false)
  }, [account, factoryAddressOverride])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...authority, loading, refresh }
}
