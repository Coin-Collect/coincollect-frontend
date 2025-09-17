import { useMemo } from 'react'
import BigNumber from 'bignumber.js'
import { KeyedMutator } from 'swr'

import { useAchievementsForAddress, useProfileForAddress } from 'state/profile/hooks'
import { Achievement, DeserializedFarm, DeserializedNftFarm, DeserializedPool, Profile } from 'state/types'
import { GetProfileResponse } from 'state/profile/helpers'
import useCoinCollectNftsForAddress from 'views/Nft/market/hooks/useCoinCollectNftsForAddress'
import { NftToken } from 'state/nftMarket/types'
import { useFarms as useTokenFarms } from 'state/farms/hooks'
import { useFarms as useNftFarms } from 'state/nftFarms/hooks'
import { usePools } from 'state/pools/hooks'
import nftFarmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import { BIG_ZERO } from 'utils/bigNumber'
import { formatNumber, getBalanceAmount } from 'utils/formatBalance'

type DataSource = 'farm' | 'nftFarm' | 'pool'

export interface FormattedBalance {
  raw: BigNumber
  normalized: BigNumber
  formatted: string
}

export interface StakePosition<T> {
  type: DataSource
  entity: T
  balance: FormattedBalance
}

export interface RewardPosition<T> {
  type: DataSource
  entity: T
  balance: FormattedBalance
}

export interface StakeablePoolNfts {
  pool: DeserializedNftFarm
  eligibleCollectionAddresses: string[]
  nfts: NftToken[]
  totalEligible: number
}

export interface ProfileDashboardAggregate {
  staked: FormattedBalance
  harvestable: FormattedBalance
}

export interface ProfileDashboardTotals {
  overall: ProfileDashboardAggregate
  breakdown: {
    farms: ProfileDashboardAggregate
    nftFarms: ProfileDashboardAggregate
    pools: ProfileDashboardAggregate
  }
}

export interface ProfileDashboardStatus {
  isLoading: boolean
  isError: boolean
  profile: { isFetching: boolean; isValidating: boolean }
  achievements: { isFetching: boolean }
  nfts: { isLoading: boolean }
  farms: { userDataLoaded: boolean }
  nftFarms: { userDataLoaded: boolean }
  pools: { userDataLoaded: boolean }
}

export interface ProfileDashboardData {
  profile?: Profile
  achievements: Achievement[]
  nfts: NftToken[]
  nftsByCollection: Record<string, NftToken[]>
  farms: DeserializedFarm[]
  nftFarms: DeserializedNftFarm[]
  pools: DeserializedPool[]
  totals: ProfileDashboardTotals
  groups: {
    activeStakes: {
      farms: StakePosition<DeserializedFarm>[]
      nftFarms: StakePosition<DeserializedNftFarm>[]
      pools: StakePosition<DeserializedPool>[]
    }
    harvestableRewards: {
      farms: RewardPosition<DeserializedFarm>[]
      nftFarms: RewardPosition<DeserializedNftFarm>[]
      pools: RewardPosition<DeserializedPool>[]
    }
    stakeableNfts: StakeablePoolNfts[]
  }
  status: ProfileDashboardStatus
  refresh: {
    profile: KeyedMutator<GetProfileResponse>
    achievements: KeyedMutator<any>
    nfts: KeyedMutator<any>
  }
}

const formatBalance = (
  raw: BigNumber,
  normalized: BigNumber,
  precision: { min?: number; max?: number } = {},
): FormattedBalance => {
  const { min = 2, max = 2 } = precision
  const numericValue = normalized.toNumber()
  const formatted = Number.isFinite(numericValue)
    ? formatNumber(numericValue, min, max)
    : normalized.toFixed(max)

  return {
    raw,
    normalized,
    formatted,
  }
}

const buildAggregate = (
  stakedRaw: BigNumber,
  stakedNormalized: BigNumber,
  harvestRaw: BigNumber,
  harvestNormalized: BigNumber,
  stakedPrecision?: { min?: number; max?: number },
  harvestPrecision?: { min?: number; max?: number },
): ProfileDashboardAggregate => {
  return {
    staked: formatBalance(stakedRaw, stakedNormalized, stakedPrecision),
    harvestable: formatBalance(harvestRaw, harvestNormalized, harvestPrecision),
  }
}

const buildEligibleCollectionMap = (): Record<number, string[]> => {
  return nftFarmsConfig.reduce((acc, farmConfig) => {
    const primaryAddress = getAddress(farmConfig.nftAddresses)?.toLowerCase()
    const supportedAddresses = (farmConfig.supportedCollectionPids ?? [])
      .map((pid) => {
        const supportedFarm = nftFarmsConfig.find((candidate) => candidate.pid === pid)
        if (!supportedFarm) {
          return null
        }

        return getAddress(supportedFarm.nftAddresses)?.toLowerCase() ?? null
      })
      .filter((address): address is string => Boolean(address))

    const uniqueAddresses = Array.from(new Set([primaryAddress, ...supportedAddresses].filter(Boolean)))
    acc[farmConfig.pid] = uniqueAddresses
    return acc
  }, {} as Record<number, string[]>)
}

const createStakePosition = <T>(
  type: DataSource,
  entity: T,
  rawBalance: BigNumber,
  normalizedBalance: BigNumber,
  precision?: { min?: number; max?: number },
): StakePosition<T> => ({
  type,
  entity,
  balance: formatBalance(rawBalance, normalizedBalance, precision),
})

const createRewardPosition = <T>(
  type: DataSource,
  entity: T,
  rawReward: BigNumber,
  normalizedReward: BigNumber,
  precision?: { min?: number; max?: number },
): RewardPosition<T> => ({
  type,
  entity,
  balance: formatBalance(rawReward, normalizedReward, precision),
})

const useProfileDashboardData = (accountAddress: string): ProfileDashboardData => {
  const {
    profile,
    isFetching: isProfileFetching,
    isValidating: isProfileValidating,
    refresh: refreshProfile,
  } = useProfileForAddress(accountAddress, {
    revalidateIfStale: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const { achievements, isFetching: isAchievementsFetching, refresh: refreshAchievements } =
    useAchievementsForAddress(accountAddress)
  const {
    nfts,
    isLoading: isNftLoading,
    refresh: refreshNfts,
  } = useCoinCollectNftsForAddress(accountAddress, profile, isProfileValidating)

  const { data: farms, userDataLoaded: farmsUserDataLoaded } = useTokenFarms()
  const { data: nftFarms, userDataLoaded: nftFarmsUserDataLoaded } = useNftFarms()
  const { pools, userDataLoaded: poolsUserDataLoaded } = usePools()

  const nftsByCollection = useMemo(() => {
    return nfts.reduce((acc, nft) => {
      if (!nft?.collectionAddress) {
        return acc
      }

      const key = nft.collectionAddress.toLowerCase()

      if (!acc[key]) {
        acc[key] = []
      }

      acc[key].push(nft)
      return acc
    }, {} as Record<string, NftToken[]>)
  }, [nfts])

  const eligibleCollectionMap = useMemo(buildEligibleCollectionMap, [])

  const stakeableNfts = useMemo<StakeablePoolNfts[]>(() => {
    return nftFarms
      .map((pool) => {
        const eligibleCollections = eligibleCollectionMap[pool.pid] ?? []
        const eligibleNfts = eligibleCollections.flatMap((collectionAddress) => nftsByCollection[collectionAddress] ?? [])

        return {
          pool,
          eligibleCollectionAddresses: eligibleCollections,
          nfts: eligibleNfts,
          totalEligible: eligibleNfts.length,
        }
      })
      .filter((entry) => entry.totalEligible > 0)
  }, [eligibleCollectionMap, nftFarms, nftsByCollection])

  const farmTotals = useMemo(() => {
    return farms.reduce(
      (acc, farm) => {
        const stakedRaw = farm.userData?.stakedBalance ?? BIG_ZERO
        const earningsRaw = farm.userData?.earnings ?? BIG_ZERO
        const stakedNormalized = getBalanceAmount(stakedRaw)
        const earningsNormalized = getBalanceAmount(earningsRaw)

        return {
          stakedRaw: acc.stakedRaw.plus(stakedRaw),
          stakedNormalized: acc.stakedNormalized.plus(stakedNormalized),
          harvestRaw: acc.harvestRaw.plus(earningsRaw),
          harvestNormalized: acc.harvestNormalized.plus(earningsNormalized),
        }
      },
      {
        stakedRaw: new BigNumber(0),
        stakedNormalized: new BigNumber(0),
        harvestRaw: new BigNumber(0),
        harvestNormalized: new BigNumber(0),
      },
    )
  }, [farms])

  const nftFarmTotals = useMemo(() => {
    return nftFarms.reduce(
      (acc, pool) => {
        const stakedRaw = pool.userData?.stakedBalance ?? BIG_ZERO
        const earningsRaw = pool.userData?.earnings ?? BIG_ZERO
        const rewardDecimals = pool.earningToken?.decimals ?? 18
        const earningsNormalized = getBalanceAmount(earningsRaw, rewardDecimals)

        return {
          stakedRaw: acc.stakedRaw.plus(stakedRaw),
          stakedNormalized: acc.stakedNormalized.plus(stakedRaw),
          harvestRaw: acc.harvestRaw.plus(earningsRaw),
          harvestNormalized: acc.harvestNormalized.plus(earningsNormalized),
        }
      },
      {
        stakedRaw: new BigNumber(0),
        stakedNormalized: new BigNumber(0),
        harvestRaw: new BigNumber(0),
        harvestNormalized: new BigNumber(0),
      },
    )
  }, [nftFarms])

  const poolTotals = useMemo(() => {
    return pools.reduce(
      (acc, pool) => {
        const stakedRaw = pool.userData?.stakedBalance ?? BIG_ZERO
        const harvestRaw = pool.userData?.pendingReward ?? BIG_ZERO
        const stakingDecimals = pool.stakingToken?.decimals ?? 18
        const rewardDecimals = pool.earningToken?.decimals ?? 18
        const stakedNormalized = getBalanceAmount(stakedRaw, stakingDecimals)
        const harvestNormalized = getBalanceAmount(harvestRaw, rewardDecimals)

        return {
          stakedRaw: acc.stakedRaw.plus(stakedRaw),
          stakedNormalized: acc.stakedNormalized.plus(stakedNormalized),
          harvestRaw: acc.harvestRaw.plus(harvestRaw),
          harvestNormalized: acc.harvestNormalized.plus(harvestNormalized),
        }
      },
      {
        stakedRaw: new BigNumber(0),
        stakedNormalized: new BigNumber(0),
        harvestRaw: new BigNumber(0),
        harvestNormalized: new BigNumber(0),
      },
    )
  }, [pools])

  const totals = useMemo<ProfileDashboardTotals>(() => {
    const overallStakedRaw = farmTotals.stakedRaw.plus(nftFarmTotals.stakedRaw).plus(poolTotals.stakedRaw)
    const overallStakedNormalized = farmTotals.stakedNormalized
      .plus(nftFarmTotals.stakedNormalized)
      .plus(poolTotals.stakedNormalized)
    const overallHarvestRaw = farmTotals.harvestRaw.plus(nftFarmTotals.harvestRaw).plus(poolTotals.harvestRaw)
    const overallHarvestNormalized = farmTotals.harvestNormalized
      .plus(nftFarmTotals.harvestNormalized)
      .plus(poolTotals.harvestNormalized)

    return {
      overall: buildAggregate(overallStakedRaw, overallStakedNormalized, overallHarvestRaw, overallHarvestNormalized),
      breakdown: {
        farms: buildAggregate(
          farmTotals.stakedRaw,
          farmTotals.stakedNormalized,
          farmTotals.harvestRaw,
          farmTotals.harvestNormalized,
        ),
        nftFarms: buildAggregate(
          nftFarmTotals.stakedRaw,
          nftFarmTotals.stakedNormalized,
          nftFarmTotals.harvestRaw,
          nftFarmTotals.harvestNormalized,
          { min: 0, max: 0 },
        ),
        pools: buildAggregate(
          poolTotals.stakedRaw,
          poolTotals.stakedNormalized,
          poolTotals.harvestRaw,
          poolTotals.harvestNormalized,
        ),
      },
    }
  }, [farmTotals, nftFarmTotals, poolTotals])

  const activeStakes = useMemo(() => {
    const activeFarmStakes = farms
      .filter((farm) => farm.userData?.stakedBalance?.gt(0))
      .map((farm) => {
        const stakedRaw = farm.userData?.stakedBalance ?? BIG_ZERO
        const stakedNormalized = getBalanceAmount(stakedRaw)
        return createStakePosition('farm', farm, stakedRaw, stakedNormalized)
      })

    const activeNftFarmStakes = nftFarms
      .filter((pool) => pool.userData?.stakedBalance?.gt(0))
      .map((pool) => {
        const stakedRaw = pool.userData?.stakedBalance ?? BIG_ZERO
        return createStakePosition('nftFarm', pool, stakedRaw, stakedRaw, { min: 0, max: 0 })
      })

    const activePoolStakes = pools
      .filter((pool) => pool.userData?.stakedBalance?.gt(0))
      .map((pool) => {
        const stakedRaw = pool.userData?.stakedBalance ?? BIG_ZERO
        const stakingDecimals = pool.stakingToken?.decimals ?? 18
        const stakedNormalized = getBalanceAmount(stakedRaw, stakingDecimals)
        return createStakePosition('pool', pool, stakedRaw, stakedNormalized)
      })

    return {
      farms: activeFarmStakes,
      nftFarms: activeNftFarmStakes,
      pools: activePoolStakes,
    }
  }, [farms, nftFarms, pools])

  const harvestableRewards = useMemo(() => {
    const farmRewards = farms
      .filter((farm) => farm.userData?.earnings?.gt(0))
      .map((farm) => {
        const earningsRaw = farm.userData?.earnings ?? BIG_ZERO
        const earningsNormalized = getBalanceAmount(earningsRaw)
        return createRewardPosition('farm', farm, earningsRaw, earningsNormalized)
      })

    const nftFarmRewards = nftFarms
      .filter((pool) => pool.userData?.earnings?.gt(0))
      .map((pool) => {
        const earningsRaw = pool.userData?.earnings ?? BIG_ZERO
        const rewardDecimals = pool.earningToken?.decimals ?? 18
        const earningsNormalized = getBalanceAmount(earningsRaw, rewardDecimals)
        return createRewardPosition('nftFarm', pool, earningsRaw, earningsNormalized)
      })

    const poolRewards = pools
      .filter((pool) => pool.userData?.pendingReward?.gt(0))
      .map((pool) => {
        const rewardRaw = pool.userData?.pendingReward ?? BIG_ZERO
        const rewardDecimals = pool.earningToken?.decimals ?? 18
        const rewardNormalized = getBalanceAmount(rewardRaw, rewardDecimals)
        return createRewardPosition('pool', pool, rewardRaw, rewardNormalized)
      })

    return {
      farms: farmRewards,
      nftFarms: nftFarmRewards,
      pools: poolRewards,
    }
  }, [farms, nftFarms, pools])

  const status: ProfileDashboardStatus = {
    isLoading:
      isProfileFetching ||
      isAchievementsFetching ||
      isNftLoading ||
      !farmsUserDataLoaded ||
      !nftFarmsUserDataLoaded ||
      !poolsUserDataLoaded,
    isError: false,
    profile: { isFetching: isProfileFetching, isValidating: isProfileValidating },
    achievements: { isFetching: isAchievementsFetching },
    nfts: { isLoading: isNftLoading },
    farms: { userDataLoaded: farmsUserDataLoaded },
    nftFarms: { userDataLoaded: nftFarmsUserDataLoaded },
    pools: { userDataLoaded: poolsUserDataLoaded },
  }

  return {
    profile,
    achievements,
    nfts,
    nftsByCollection,
    farms,
    nftFarms,
    pools,
    totals,
    groups: {
      activeStakes,
      harvestableRewards,
      stakeableNfts,
    },
    status,
    refresh: {
      profile: refreshProfile,
      achievements: refreshAchievements,
      nfts: refreshNfts,
    },
  }
}

export default useProfileDashboardData
