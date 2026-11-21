import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import orderBy from 'lodash/orderBy'
import minBy from 'lodash/minBy'
import { BigNumber } from '@ethersproject/bignumber'
import { isAddress } from 'utils'
import { useAppDispatch } from 'state'
import { State, NodeRound } from '../types'
import { deserializePredictionRound, deserializePredictionLedger } from './helpers'
import { fetchAddressResult } from '.'

export const useGetRounds = () => {
  const rounds = useSelector((state: State) => state.predictions.rounds)
  return Object.keys(rounds).reduce<Record<string, NodeRound>>((accum, epoch) => {
    return {
      ...accum,
      [epoch]: deserializePredictionRound(rounds[epoch]),
    }
  }, {})
}

export const useGetRoundsByCloseOracleId = () => {
  const rounds = useSelector((state: State) => state.predictions.rounds)
  return Object.keys(rounds).reduce<Record<string, NodeRound>>((accum, epoch) => {
    const parsed = deserializePredictionRound(rounds[epoch])
    if (!parsed.closeOracleId) return accum
    return {
      ...accum,
      [parsed.closeOracleId]: parsed,
    }
  }, {})
}

export const useGetRound = (epoch: number) => {
  const round = useSelector((state: State) => state.predictions.rounds[epoch])
  return round ? deserializePredictionRound(round) : undefined
}

export const useGetSortedRounds = () => {
  const roundData = useGetRounds()
  return orderBy(Object.values(roundData), ['epoch'], ['asc'])
}

export const useGetBetByEpoch = (account: string | null | undefined, epoch: number) => {
  const bet = useSelector((state: State) => account ? state.predictions.ledgers[account]?.[epoch] : undefined)
  return bet ? deserializePredictionLedger(bet) : null
}

export const useGetIsClaimable = (epoch) => {
  const claimableStatuses = useSelector((state: State) => state.predictions.claimableStatuses)
  return claimableStatuses[epoch] || false
}

/**
 * Used to get the range of rounds to poll for
 */
export const useGetEarliestEpoch = () => {
  return useSelector((state: State) => {
    const earliestRound = minBy(Object.values(state.predictions.rounds), 'epoch')
    return earliestRound?.epoch
  })
}

export const useIsHistoryPaneOpen = () => {
  return useSelector((state: State) => state.predictions.isHistoryPaneOpen)
}

export const useIsChartPaneOpen = () => {
  return useSelector((state: State) => state.predictions.isChartPaneOpen)
}

export const useChartView = () => {
  return useSelector((state: State) => state.predictions.chartView)
}

export const useGetCurrentEpoch = () => {
  return useSelector((state: State) => state.predictions.currentEpoch)
}

export const useGetIntervalSeconds = () => {
  return useSelector((state: State) => state.predictions.intervalSeconds)
}

export const useGetCurrentRound = () => {
  const currentEpoch = useGetCurrentEpoch()
  const rounds = useGetRounds()
  return rounds[currentEpoch]
}

export const useGetPredictionsStatus = () => {
  return useSelector((state: State) => state.predictions.status)
}

export const useGetHistoryFilter = () => {
  return useSelector((state: State) => state.predictions.historyFilter)
}

export const useGetHasHistoryLoaded = () => {
  return useSelector((state: State) => state.predictions.hasHistoryLoaded)
}

export const useGetCurrentHistoryPage = () => {
  return useSelector((state: State) => state.predictions.currentHistoryPage)
}

export const useGetMinBetAmount = () => {
  const minBetAmount = useSelector((state: State) => state.predictions.minBetAmount)
  return useMemo(() => BigNumber.from(minBetAmount), [minBetAmount])
}

export const useGetBufferSeconds = () => {
  return useSelector((state: State) => state.predictions.bufferSeconds)
}

export const useGetIsFetchingHistory = () => {
  return useSelector((state: State) => state.predictions.isFetchingHistory)
}

export const useGetHistory = () => {
  return useSelector((state: State) => state.predictions.history)
}

/**
 * The current round's lock timestamp will not be set immediately so we return an estimate until then
 */
export const useGetCurrentRoundLockTimestamp = () => {
  const currentRound = useGetCurrentRound()
  const intervalSeconds = useGetIntervalSeconds()

  if (!currentRound) {
    return undefined
  }

  if (!currentRound.lockTimestamp) {
    return currentRound.startTimestamp == null ? undefined : currentRound.startTimestamp + intervalSeconds
  }

  return currentRound.lockTimestamp
}

// Leaderboard
export const useGetLeaderboardLoadingState = () => {
  return useSelector((state: State) => state.predictions.leaderboard.loadingState)
}

export const useGetLeaderboardResults = () => {
  return useSelector((state: State) => state.predictions.leaderboard.results)
}

export const useGetLeaderboardFilters = () => {
  return useSelector((state: State) => state.predictions.leaderboard.filters)
}

export const useGetLeaderboardSkip = () => {
  return useSelector((state: State) => state.predictions.leaderboard.skip)
}

export const useGetLeaderboardHasMoreResults = () => {
  return useSelector((state: State) => state.predictions.leaderboard.hasMoreResults)
}

export const useGetAddressResult = (account: string | null | undefined) => {
  return useSelector((state: State) => account ? state.predictions.leaderboard.addressResults[account] : undefined)
}

export const useGetOrFetchLeaderboardAddressResult = (account: string | null | undefined) => {
  const addressResult = useGetAddressResult(account)
  const dispatch = useAppDispatch()

  useEffect(() => {
    const address = isAddress(account)

    // If address result is null it means we already tried fetching the results and none came back
    if (!addressResult && addressResult !== null && address) {
      dispatch(fetchAddressResult(address))
    }
  }, [dispatch, account, addressResult])

  return addressResult
}

export const useGetSelectedAddress = () => {
  return useSelector((state: State) => state.predictions.leaderboard.selectedAddress)
}
