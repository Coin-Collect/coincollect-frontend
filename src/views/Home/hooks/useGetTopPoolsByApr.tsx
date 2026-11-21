import { useState, useEffect, useMemo } from 'react'
import { usePriceCakeBusd } from 'state/farms/hooks'
import { useAppDispatch } from 'state'
import orderBy from 'lodash/orderBy'
import { VaultKey, DeserializedPool } from 'state/types'
import { fetchCakeVaultFees, fetchPoolsPublicDataAsync } from 'state/pools'
import { useCakeVault, usePools } from 'state/pools/hooks'
import { useInitialBlock } from 'state/block/hooks'
import { getAprData } from 'views/Pools/helpers'
import { FetchStatus } from 'config/constants/types'

export function usePoolsWithVault() {
  const { pools } = usePools()
  const { fees: { performanceFeeAsDecimal } } = useCakeVault()

  return useMemo(() => {
    const cakePool = pools.find((pool) => pool.sousId === 0 && !pool.isFinished)
    if (!cakePool) return pools

    const cakeVault = { ...cakePool, vaultKey: VaultKey.CakeVault }
    return [{ ...cakeVault, apr: getAprData(cakeVault, performanceFeeAsDecimal).apr, rawApr: cakePool.apr }, ...pools]
  }, [pools, performanceFeeAsDecimal])
}

const useGetTopPoolsByApr = (isIntersecting: boolean) => {
  const dispatch = useAppDispatch()

  const [fetchStatus, setFetchStatus] = useState(FetchStatus.Idle)
  const [topPools, setTopPools] = useState<(DeserializedPool | null)[]>([null, null, null, null, null])
  const initialBlock = useInitialBlock()

  const pools = usePoolsWithVault()

  const cakePriceBusd = usePriceCakeBusd()

  useEffect(() => {
    const fetchPoolsPublicData = async () => {
      setFetchStatus(FetchStatus.Fetching)

      try {
        await dispatch(fetchCakeVaultFees())
        await dispatch(fetchPoolsPublicDataAsync(initialBlock))
        setFetchStatus(FetchStatus.Fetched)
      } catch (e) {
        console.error(e)
        setFetchStatus(FetchStatus.Failed)
      }
    }

    if (isIntersecting && fetchStatus === FetchStatus.Idle && initialBlock > 0) {
      fetchPoolsPublicData()
    }
  }, [dispatch, setFetchStatus, fetchStatus, topPools, isIntersecting, initialBlock])

  useEffect(() => {
    const getTopPoolsByApr = (activePools: DeserializedPool[]) => {
      const sortedByApr = orderBy(activePools, (pool: DeserializedPool) => pool.apr || 0, 'desc')
      setTopPools(sortedByApr.slice(0, 5))
    }
    if (fetchStatus === FetchStatus.Fetched && !topPools[0]) {
      getTopPoolsByApr(pools)
    }
  }, [setTopPools, pools, fetchStatus, cakePriceBusd, topPools])

  return { topPools }
}

export default useGetTopPoolsByApr
