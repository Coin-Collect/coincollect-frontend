import { useMemo } from 'react'
import BigNumber from 'bignumber.js'
import orderBy from 'lodash/orderBy'
import { BIG_ZERO } from 'utils/bigNumber'
import { getNftFarmApr } from 'utils/apr'
import nftFarmsConfig from 'config/constants/nftFarms'
import { useFarms, usePollFarmsWithUserData } from 'state/nftFarms/hooks'
import { NftFarmWithStakedValue } from 'views/NftFarms/components/FarmCard/FarmCard'

export interface UseUserStakedNftFarmsResult {
  stakedFarms: NftFarmWithStakedValue[]
  totalStakedBalance: BigNumber
  isLoading: boolean
}

const useUserStakedNftFarms = (shouldFetch: boolean): UseUserStakedNftFarmsResult => {
  usePollFarmsWithUserData()
  const { data: farms, userDataLoaded } = useFarms()

  const { stakedFarms, totalStakedBalance } = useMemo(() => {
    if (!shouldFetch) {
      return { stakedFarms: [], totalStakedBalance: BIG_ZERO }
    }

    const farmsWithPositions: NftFarmWithStakedValue[] = farms
      .filter((farm) => farm.userData?.stakedBalance && farm.userData.stakedBalance.gt(0))
      .map((farm) => {
        const farmConfig = nftFarmsConfig.find((config) => config.pid === farm.pid)
        const mainCollectionWeight = farmConfig?.mainCollectionWeight
          ? Number(farmConfig.mainCollectionWeight)
          : undefined

        const poolWeight = farm.poolWeight ?? BIG_ZERO
        const tokenPerBlock = farm.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : 0
        const totalStaked = farm.totalStaked ?? BIG_ZERO
        const totalShares = farm.totalShares ?? BIG_ZERO
        const participantThreshold = new BigNumber(farm.participantThreshold ?? 0)
        const isSmartPool = Boolean(farm.contractAddresses)
        const effectiveLiquidityBase = isSmartPool ? totalShares : totalStaked
        const effectiveLiquidity = BigNumber.maximum(participantThreshold, effectiveLiquidityBase)

        const { cakeRewardsApr, lpRewardsApr } = getNftFarmApr(
          poolWeight,
          tokenPerBlock,
          effectiveLiquidity,
          mainCollectionWeight,
        )

        return {
          ...farm,
          apr: cakeRewardsApr,
          lpRewardsApr,
          liquidity: totalStaked,
        }
      })

    const orderedFarms = orderBy(
      farmsWithPositions,
      [
        (farm) => (farm.isFinished ? 1 : 0),
        (farm) => farm.userData?.stakedBalance?.toNumber() ?? 0,
      ],
      ['asc', 'desc'],
    )

    const cumulativeStaked = orderedFarms.reduce(
      (acc, farm) => acc.plus(farm.userData?.stakedBalance ?? BIG_ZERO),
      BIG_ZERO,
    )

    return { stakedFarms: orderedFarms, totalStakedBalance: cumulativeStaked }
  }, [farms, shouldFetch])

  return {
    stakedFarms,
    totalStakedBalance,
    isLoading: shouldFetch ? !userDataLoaded : false,
  }
}

export default useUserStakedNftFarms
