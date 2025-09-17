import { useCallback, useMemo } from 'react'
import BigNumber from 'bignumber.js'
import useWeb3React from 'hooks/useWeb3React'
import { useAppDispatch } from 'state'
import { BIG_ZERO } from 'utils/bigNumber'
import { getAddress } from 'utils/addressHelpers'
import { ChainId } from '@coincollect/sdk'
import { useFarms as useNftFarms } from 'state/nftFarms/hooks'
import { useFarms as useLiquidityFarms, usePriceCakeBusd } from 'state/farms/hooks'
import { usePools, useVaultPools } from 'state/pools/hooks'
import { fetchFarmUserDataAsync as fetchNftFarmUserDataAsync } from 'state/nftFarms'
import { fetchFarmUserDataAsync as fetchLiquidityFarmUserDataAsync } from 'state/farms'
import { fetchPoolsUserDataAsync, fetchCakeVaultUserData } from 'state/pools'
import nftFarmsConfig from 'config/constants/nftFarms'
import { getNftFarmApr, getFarmApr } from 'utils/apr'
import { VaultKey } from 'state/types'
import { convertSharesToCake } from 'views/Pools/helpers'
import tokens from 'config/constants/tokens'

export type OverviewPositionType = 'nftFarm' | 'liquidityFarm' | 'pool' | 'vault'

export interface PendingRewardDetail {
  token: string
  amount: BigNumber
  decimals: number
}

export interface OverviewPosition {
  id: string
  label: string
  type: OverviewPositionType
  apr?: number | null
  aprLabel?: string
  staked: BigNumber
  stakedDecimals: number
  stakingTokenSymbol?: string
  pendingRewards: PendingRewardDetail[]
  href?: string
  pid?: number
  sousId?: number
  earningTokenSymbol?: string
  earningTokenDecimals?: number
  sideRewards?: any[]
  earningToken?: any
}

export interface OverviewCategory {
  key: 'nftFarms' | 'liquidityFarms' | 'pools' | 'vaults'
  label: string
  positions: OverviewPosition[]
}

export interface RewardBreakdownEntry {
  token: string
  amount: BigNumber
  decimals: number
}

export interface OverviewRefreshers {
  nftFarms: () => Promise<void>
  liquidityFarms: () => Promise<void>
  pools: () => Promise<void>
  vaults: () => Promise<void>
}

export interface ProfileDefiOverviewResult {
  isLoading: boolean
  isAccountMatch: boolean
  categories: OverviewCategory[]
  rewardBreakdown: RewardBreakdownEntry[]
  refreshers: OverviewRefreshers
  refreshAll: () => Promise<void>
  positionsCount: number
}

const DEFAULT_REFRESHERS: OverviewRefreshers = {
  nftFarms: async () => {},
  liquidityFarms: async () => {},
  pools: async () => {},
  vaults: async () => {},
}

const formatAprDisplay = (apr?: number | null) => {
  if (apr === null || apr === undefined) {
    return undefined
  }
  if (apr >= 1000) {
    return `${apr.toFixed(0)}%`
  }
  if (apr >= 100) {
    return `${apr.toFixed(1)}%`
  }
  if (apr <= 0) {
    return '0%'
  }
  return `${apr.toFixed(2)}%`
}

const useProfileDefiOverview = (accountAddress?: string): ProfileDefiOverviewResult => {
  const { account } = useWeb3React()
  const dispatch = useAppDispatch()
  const { data: nftFarms, userDataLoaded: nftFarmsLoaded } = useNftFarms()
  const { data: liquidityFarms, userDataLoaded: liquidityFarmsLoaded } = useLiquidityFarms()
  const { pools, userDataLoaded: poolsLoaded } = usePools()
  const vaultPools = useVaultPools()
  const cakePrice = usePriceCakeBusd()

  const normalizedAccount = account?.toLowerCase()
  const normalizedAddress = accountAddress?.toLowerCase()
  const isAccountMatch = Boolean(normalizedAccount && normalizedAddress && normalizedAccount === normalizedAddress)

  const nftPositions = useMemo<OverviewPosition[]>(() => {
    if (!isAccountMatch) {
      return []
    }

    return nftFarms
      .map((farm) => {
        const stakedBalance = farm.userData?.stakedBalance ?? BIG_ZERO
        const pendingReward = farm.userData?.earnings ?? BIG_ZERO

        if (stakedBalance.eq(0) && pendingReward.eq(0)) {
          return null
        }

        const mainCollectionConfig = nftFarmsConfig.find((config) => config.pid === farm.pid)
        const mainCollectionWeight = mainCollectionConfig?.mainCollectionWeight
          ? Number(mainCollectionConfig.mainCollectionWeight)
          : 1

        const totalStaked = farm.totalStaked ?? BIG_ZERO
        const totalShares = farm.totalShares ?? BIG_ZERO
        const participantThreshold = farm.participantThreshold ?? 0
        const isSmartPool = Boolean(farm.contractAddresses)
        const liquidityBase = isSmartPool ? totalShares.toNumber() : totalStaked.toNumber()
        const totalLiquidityWithThreshold = new BigNumber(Math.max(liquidityBase, participantThreshold))
        const { cakeRewardsApr } = getNftFarmApr(
          new BigNumber(farm.poolWeight),
          farm.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : null,
          totalLiquidityWithThreshold,
          mainCollectionWeight,
        )

        const collectionAddress = farm.nftAddresses ? getAddress(farm.nftAddresses) : undefined
        const earnLabel = farm.earningToken ? farm.earningToken.symbol : 'COLLECT'

        return {
          id: `nft-${farm.pid}`,
          label: farm.lpSymbol,
          type: 'nftFarm' as const,
          apr: cakeRewardsApr,
          aprLabel:
            cakeRewardsApr !== null && cakeRewardsApr !== undefined
              ? `${cakeRewardsApr.toFixed(2)} / day`
              : undefined,
          staked: stakedBalance,
          stakedDecimals: 0,
          stakingTokenSymbol: farm.lpSymbol,
          pendingRewards: [
            {
              token: earnLabel,
              amount: pendingReward,
              decimals: farm.earningToken?.decimals ?? 18,
            },
          ],
          href: collectionAddress ? `/nfts/collections/mint/${collectionAddress}` : undefined,
          pid: farm.pid,
          earningTokenSymbol: earnLabel,
          earningTokenDecimals: farm.earningToken?.decimals ?? 18,
          sideRewards: farm.sideRewards ?? [],
          earningToken: farm.earningToken,
        }
      })
      .filter((position): position is OverviewPosition => Boolean(position))
  }, [isAccountMatch, nftFarms])

  const liquidityPositions = useMemo<OverviewPosition[]>(() => {
    if (!isAccountMatch) {
      return []
    }

    return liquidityFarms
      .map((farm) => {
        const stakedBalance = farm.userData?.stakedBalance ?? BIG_ZERO
        const pendingReward = farm.userData?.earnings ?? BIG_ZERO

        if (stakedBalance.eq(0) && pendingReward.eq(0)) {
          return null
        }

        const totalLiquidity = farm.lpTotalInQuoteToken && farm.quoteTokenPriceBusd
          ? new BigNumber(farm.lpTotalInQuoteToken).times(farm.quoteTokenPriceBusd)
          : BIG_ZERO
        const { cakeRewardsApr } = getFarmApr(
          new BigNumber(farm.poolWeight),
          cakePrice,
          totalLiquidity,
          farm.lpAddresses?.[ChainId.POLYGON],
        )

        return {
          id: `farm-${farm.pid}`,
          label: farm.lpSymbol,
          type: 'liquidityFarm' as const,
          apr: cakeRewardsApr,
          aprLabel: cakeRewardsApr !== null && cakeRewardsApr !== undefined ? formatAprDisplay(cakeRewardsApr) : undefined,
          staked: stakedBalance,
          stakedDecimals: 18,
          stakingTokenSymbol: farm.lpSymbol,
          pendingRewards: [
            {
              token: 'COLLECT',
              amount: pendingReward,
              decimals: 18,
            },
          ],
          href: '/farms',
          pid: farm.pid,
          earningTokenSymbol: 'COLLECT',
          earningTokenDecimals: 18,
        }
      })
      .filter((position): position is OverviewPosition => Boolean(position))
  }, [cakePrice, isAccountMatch, liquidityFarms])

  const poolPositions = useMemo<OverviewPosition[]>(() => {
    if (!isAccountMatch) {
      return []
    }

    return pools
      .map((pool) => {
        const stakedBalance = pool.userData?.stakedBalance ?? BIG_ZERO
        const pendingReward = pool.userData?.pendingReward ?? BIG_ZERO

        if (stakedBalance.eq(0) && pendingReward.eq(0)) {
          return null
        }

        const earningToken = pool.earningToken
        const positionType = pool.vaultKey ? ('vault' as OverviewPositionType) : ('pool' as OverviewPositionType)

        return {
          id: `${positionType}-${pool.sousId}`,
          label: pool.earningToken.symbol,
          type: positionType,
          apr: pool.apr,
          aprLabel: pool.apr !== undefined ? formatAprDisplay(pool.apr) : undefined,
          staked: stakedBalance,
          stakedDecimals: pool.stakingToken.decimals,
          stakingTokenSymbol: pool.stakingToken.symbol,
          pendingRewards: [
            {
              token: earningToken.symbol,
              amount: pendingReward,
              decimals: earningToken.decimals,
            },
          ],
          href: '/pools',
          sousId: pool.sousId,
          earningTokenSymbol: earningToken.symbol,
          earningTokenDecimals: earningToken.decimals,
          earningToken,
        }
      })
      .filter((position): position is OverviewPosition => Boolean(position))
  }, [isAccountMatch, pools])

  const cakeVaultPosition = useMemo<OverviewPosition[]>(() => {
    if (!isAccountMatch) {
      return []
    }
    const cakeVault = vaultPools[VaultKey.CakeVault]
    if (!cakeVault) {
      return []
    }

    const { userShares, cakeAtLastUserAction, isLoading } = cakeVault.userData
    if (isLoading || !userShares || userShares.eq(0)) {
      return []
    }

    const { cakeAsBigNumber } = convertSharesToCake(userShares, cakeVault.pricePerFullShare)
    const pendingCake = cakeAsBigNumber.minus(cakeAtLastUserAction)

    if (cakeAsBigNumber.eq(0) && pendingCake.lte(0)) {
      return []
    }

    const safePending = pendingCake.gt(0) ? pendingCake : BIG_ZERO

    return [
      {
        id: 'vault-cake',
        label: 'Auto COLLECT',
        type: 'vault' as const,
        apr: null,
        staked: cakeAsBigNumber,
        stakedDecimals: 18,
        stakingTokenSymbol: 'COLLECT',
        pendingRewards: [
          {
            token: 'COLLECT',
            amount: safePending,
            decimals: 18,
          },
        ],
        href: '/pools',
        earningTokenSymbol: 'COLLECT',
        earningTokenDecimals: 18,
        earningToken: tokens.collect,
        sousId: 0,
      },
    ]
  }, [isAccountMatch, vaultPools])

  const categorizedPositions = useMemo<OverviewCategory[]>(() => {
    return [
      {
        key: 'nftFarms',
        label: 'NFT Farms',
        positions: nftPositions,
      },
      {
        key: 'liquidityFarms',
        label: 'Liquidity Farms',
        positions: liquidityPositions,
      },
      {
        key: 'pools',
        label: 'Pools',
        positions: poolPositions.filter((position) => position.type === 'pool'),
      },
      {
        key: 'vaults',
        label: 'Vaults',
        positions: [
          ...poolPositions.filter((position) => position.type === 'vault'),
          ...cakeVaultPosition,
        ],
      },
    ]
  }, [nftPositions, liquidityPositions, poolPositions, cakeVaultPosition])

  const rewardBreakdown = useMemo<RewardBreakdownEntry[]>(() => {
    const breakdownMap = new Map<string, RewardBreakdownEntry>()

    categorizedPositions.forEach((category) => {
      category.positions.forEach((position) => {
        position.pendingRewards.forEach((reward) => {
          if (!reward.amount || reward.amount.eq(0)) {
            return
          }
          const existing = breakdownMap.get(reward.token)
          if (existing) {
            existing.amount = existing.amount.plus(reward.amount)
          } else {
            breakdownMap.set(reward.token, {
              token: reward.token,
              amount: reward.amount,
              decimals: reward.decimals,
            })
          }
        })
      })
    })

    return Array.from(breakdownMap.values())
  }, [categorizedPositions])

  const refreshers: OverviewRefreshers = useMemo(() => {
    if (!isAccountMatch || !account) {
      return DEFAULT_REFRESHERS
    }

    return {
      nftFarms: async () => {
        const activePids = nftPositions.map((position) => position.pid).filter((pid): pid is number => pid !== undefined)
        if (activePids.length === 0) return
        await dispatch(fetchNftFarmUserDataAsync({ account, pids: activePids }))
      },
      liquidityFarms: async () => {
        const activePids = liquidityPositions
          .map((position) => position.pid)
          .filter((pid): pid is number => pid !== undefined)
        if (activePids.length === 0) return
        await dispatch(fetchLiquidityFarmUserDataAsync({ account, pids: activePids }))
      },
      pools: async () => {
        await dispatch(fetchPoolsUserDataAsync(account))
      },
      vaults: async () => {
        await dispatch(fetchCakeVaultUserData({ account }))
      },
    }
  }, [account, dispatch, isAccountMatch, nftPositions, liquidityPositions])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshers.nftFarms(),
      refreshers.liquidityFarms(),
      refreshers.pools(),
      refreshers.vaults(),
    ])
  }, [refreshers])

  const isLoading = isAccountMatch &&
    (!nftFarmsLoaded || !liquidityFarmsLoaded || !poolsLoaded || vaultPools[VaultKey.CakeVault]?.userData?.isLoading)

  const positionsCount = useMemo(
    () =>
      categorizedPositions.reduce((acc, category) => {
        return acc + category.positions.length
      }, 0),
    [categorizedPositions],
  )

  return {
    isLoading,
    isAccountMatch,
    categories: categorizedPositions,
    rewardBreakdown,
    refreshers,
    refreshAll,
    positionsCount,
  }
}

export default useProfileDefiOverview
