import useWeb3React from 'hooks/useWeb3React'
import BigNumber from 'bignumber.js'
import { nftFarmsConfig } from 'config/constants'
import { useFastRefreshEffect, useSlowRefreshEffect } from 'hooks/useRefreshEffect'
import { useCallback, useMemo } from 'react'
import { batch, useDispatch, useSelector } from 'react-redux'
import { useAppDispatch, type AppDispatch } from 'state'
import { deserializeToken } from 'state/user/hooks/helpers'
import { BIG_ZERO } from 'utils/bigNumber'
import { getBalanceAmount } from 'utils/formatBalance'
import { fetchFarmsPublicDataAsync, fetchFarmUserDataAsync, fetchNftPoolsStakingLimitsAsync, nonArchivedFarms } from '.'
import { DeserializedNftFarm, DeserializedNftFarmsState, DeserializedNftFarmUserData, SerializedNftFarm, State } from '../types'
import { useActiveChainId } from 'hooks/useActiveChainId'
import useSWR from 'swr'
import { getLocalForkStorageKey, isLocalForkMode } from 'config/localFork'
import { POLYGON_BLOCK_TIME } from 'config'
import { readNftPoolSchedules } from 'features/nftPoolManager/schedules'
import { nftPoolRegistryRpcProvider } from 'utils/providers'
import isArchivedPid from 'utils/farmHelpers'

const deserializeNftFarmUserData = (farm?: SerializedNftFarm): DeserializedNftFarmUserData => {
  return {
    allowance: farm?.userData ? farm.userData.allowance : [],
    tokenBalance: farm?.userData ? new BigNumber(farm.userData.tokenBalance) : BIG_ZERO,
    stakedBalance: farm?.userData ? new BigNumber(farm.userData.stakedBalance) : BIG_ZERO,
    earnings: farm?.userData ? new BigNumber(farm.userData.earnings) : BIG_ZERO,
  }
}

const deserializeNftFarm = (farm: SerializedNftFarm): DeserializedNftFarm => {
  const { 
    nftAddresses, 
    contractAddresses, 
    lpSymbol, 
    pid, 
    dual, 
    multiplier, 
    isCommunity, 
    tokenPerBlock, 
    startTimestamp, 
    endTimestamp, 
    participantThreshold, 
    isFinished, 
    numberSecondsForUserLimit, 
    stakingLimit, 
    earningToken, 
    performanceFee 
  } = farm
  return {
    nftAddresses,
    contractAddresses,
    lpSymbol,
    pid,
    dual,
    multiplier,
    isCommunity: isCommunity ?? false,
    tokenPerBlock,
    startTimestamp,
    endTimestamp,
    participantThreshold,
    isFinished,
    stakingLimitEndTimestamp: (numberSecondsForUserLimit || 0) + (startTimestamp || 0),
    stakingLimit: new BigNumber(stakingLimit ?? NaN),
    earningToken: earningToken ? deserializeToken(earningToken) : undefined,
    sideRewards: farm.sideRewards,
    performanceFee,
    userData: deserializeNftFarmUserData(farm),
    tokenAmountTotal: farm.tokenAmountTotal ? new BigNumber(farm.tokenAmountTotal) : BIG_ZERO,
    lpTotalInQuoteToken: farm.lpTotalInQuoteToken ? new BigNumber(farm.lpTotalInQuoteToken) : BIG_ZERO,
    lpTotalSupply: BIG_ZERO,
    totalStaked: farm.totalStaked ? new BigNumber(farm.totalStaked) : BIG_ZERO,
    poolWeight: farm.poolWeight ? new BigNumber(farm.poolWeight) : BIG_ZERO,
    totalShares: farm.totalShares ? new BigNumber(farm.totalShares) : BIG_ZERO,
    supportedCollectionPids: farm.supportedCollectionPids ? farm.supportedCollectionPids : [],
    collectionPowers: farm.collectionPowers
  }
}

export const usePollFarmsWithUserData = (includeArchive = false, enabled = true) => {
  const dispatch = useDispatch<AppDispatch>()
  const { account } = useWeb3React()
  const { chainId } = useActiveChainId()
  const pids = useMemo(() => (includeArchive ? nftFarmsConfig : nonArchivedFarms).map(({ pid }) => pid), [includeArchive])
  const refreshUserData = useCallback(() => {
    if (account) void dispatch(fetchFarmUserDataAsync({ account, pids }))
  }, [account, dispatch, pids])

  useSlowRefreshEffect((currentBlock) => {
    if (!enabled) return

    batch(() => {
      dispatch(fetchFarmsPublicDataAsync({pids, currentBlock, chainId}))
      dispatch(fetchNftPoolsStakingLimitsAsync(chainId))
    })

    refreshUserData()
  }, [enabled, dispatch, pids, refreshUserData, chainId])
  return refreshUserData
}

/**
 * Fetches the "core" farm data used globally
 * 251 = CAKE-BNB LP
 * 252 = BUSD-BNB LP
 */
export const usePollCoreFarmData = () => {
  const dispatch = useAppDispatch()
  const { chainId } = useActiveChainId()

  useFastRefreshEffect((currentBlock) => {
    dispatch(fetchFarmsPublicDataAsync({ pids: [1, 2], currentBlock, chainId }))
  }, [dispatch, chainId])
}

export const useFarms = (): DeserializedNftFarmsState => {
  const farms = useSelector((state: State) => state.nftFarms)
  const deserializedFarmsData = farms.data.map(deserializeNftFarm)
  const { loadArchivedFarmsData, userDataLoaded, userDataAccount, walletScan, poolLength } = farms
  return {
    loadArchivedFarmsData,
    userDataLoaded,
    userDataAccount,
    walletScan,
    data: deserializedFarmsData,
    poolLength,
  }
}

const configuredSmartFarms = nonArchivedFarms.flatMap((farm) => {
  const address = farm.contractAddresses?.[137]
  return address ? [{ pid: farm.pid, address: address.toLowerCase() }] : []
})
const configuredPoolAddresses = configuredSmartFarms.map(({ address }) => address)

async function fetchConfiguredPoolSchedules() {
  // The legacy configured contracts are not part of the isolated fork catalogue.
  if (isLocalForkMode) return { byPid: {}, incomplete: false }
  const provider = nftPoolRegistryRpcProvider
  const block = await provider.getBlock('latest')
  const schedules = await readNftPoolSchedules(provider, configuredPoolAddresses, block.number)
  const byPid: Record<number, Pick<DeserializedNftFarm, 'startTimestamp' | 'endTimestamp' | 'isFinished'>> = {}
  const timestampAt = (height: number) => block.timestamp + (height - block.number) * POLYGON_BLOCK_TIME
  configuredSmartFarms.forEach((farm, index) => {
    const schedule = schedules.get(configuredPoolAddresses[index])
    if (schedule?.endBlock === undefined) return
    const isFinished = block.number >= schedule.endBlock
    if (!isFinished && (schedule.startBlock === undefined || schedule.startBlock >= schedule.endBlock)) return
    byPid[farm.pid] = {
      isFinished,
      startTimestamp: schedule.startBlock === undefined ? undefined : timestampAt(schedule.startBlock),
      endTimestamp: timestampAt(schedule.endBlock),
    }
  })
  if (configuredSmartFarms.length && !Object.keys(byPid).length) throw new Error('NFT pool schedules could not be read.')
  return { byPid, incomplete: Object.keys(byPid).length !== configuredSmartFarms.length }
}

export function useScheduledNftFarms() {
  const farms = useFarms()
  const { data, error, isValidating, mutate } = useSWR(
    getLocalForkStorageKey('nft-farm-schedules'),
    fetchConfiguredPoolSchedules,
    { refreshInterval: 30_000 },
  )
  return {
    ...farms,
    data: farms.data.map((farm) =>
      farm.contractAddresses && !isArchivedPid(farm.pid)
        ? { ...farm, isFinished: undefined, ...data?.byPid[farm.pid] }
        : farm,
    ),
    scheduleLoading: !data && !error,
    scheduleError: Boolean(error || data?.incomplete),
    scheduleRefreshing: isValidating,
    refreshSchedules: mutate,
  }
}

export const useFarmsPoolLength = () => {
  return useSelector((state: State) => state.nftFarms.poolLength)
}

export const useFarmFromPid = (pid?: number) => {
  const farm = useSelector((state: State) => state.nftFarms.data.find((f) => f.pid === pid))
  return farm && deserializeNftFarm(farm)
}

const useFarmFromLpSymbol = (lpSymbol?: string) => {
  const farm = useSelector((state: State) => state.nftFarms.data.find((f) => f.lpSymbol === lpSymbol))
  return farm && deserializeNftFarm(farm)
}

export const useFarmUser = (pid?: number): DeserializedNftFarmUserData => {
  const farm = useSelector((state: State) => state.nftFarms.data.find((item) => item.pid === pid))
  return deserializeNftFarmUserData(farm)
}

export const useLpTokenPrice = (symbol?: string): BigNumber => {
  const farm = useFarmFromLpSymbol(symbol)
  if (!farm || !farm.lpTotalSupply.gt(0) || !farm.lpTotalInQuoteToken.gt(0)) return BIG_ZERO

  const farmTokenPriceInUsd = new BigNumber(farm.tokenPriceBusd ?? NaN)
  const totalLpTokens = getBalanceAmount(farm.lpTotalSupply)
  return farmTokenPriceInUsd.times(farm.tokenAmountTotal).times(2).div(totalLpTokens)
}

/**
 * @@deprecated use the BUSD hook in /hooks
 */
export const usePriceCakeBusd = (): BigNumber => {
  const cakeBnbFarm = useFarmFromPid(1)

  const cakePriceBusdAsString = cakeBnbFarm?.tokenPriceBusd

  const cakePriceBusd = useMemo(() => {
    return new BigNumber(cakePriceBusdAsString ?? NaN)
  }, [cakePriceBusdAsString])

  return cakePriceBusd
}
