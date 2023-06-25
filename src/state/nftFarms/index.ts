// @ts-nocheck
import type {
  UnknownAsyncThunkFulfilledAction,
  UnknownAsyncThunkPendingAction,
  UnknownAsyncThunkRejectedAction,
  // eslint-disable-next-line import/no-unresolved
} from '@reduxjs/toolkit/dist/matchers'
import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit'
import stringify from 'fast-json-stable-stringify'
import farmsConfig from 'config/constants/nftFarms'
import isArchivedPid from 'utils/farmHelpers'
import type { AppState } from 'state'
import priceHelperLpsConfig from 'config/constants/priceHelperLps'
import fetchFarms, { fetchNftFarmsBlockLimits, fetchNftPoolsStakingLimits } from './fetchFarms'
import getFarmsPrices from './getFarmsPrices'
import {
  fetchFarmUserEarnings,
  fetchFarmUserAllowances,
  fetchFarmUserTokenBalances,
  fetchFarmUserStakedBalances,
} from './fetchFarmUser'
import { SerializedNftFarmsState, SerializedNftFarm } from '../types'
import { fetchMasterChefFarmPoolLength } from './fetchMasterChefData'
import { BIG_ZERO } from 'utils/bigNumber'
import { setPoolsPublicData } from 'state/pools'

const noAccountFarmConfig = farmsConfig.map((farm) => ({
  ...farm,
  userData: {
    allowance: false,
    tokenBalance: '0',
    stakedBalance: '0',
    earnings: '0',
  },
}))

const initialState: SerializedNftFarmsState = {
  data: noAccountFarmConfig,
  loadArchivedFarmsData: false,
  userDataLoaded: false,
  loadingKeys: {},
}

export const nonArchivedFarms = farmsConfig.filter(({ pid }) => !isArchivedPid(pid))

// Async thunks
// Main Function for Farm Data and Price Calculation
export const fetchFarmsPublicDataAsync = createAsyncThunk<
  [SerializedNftFarm[], number],
  {pids: number[]; currentBlock: number},
  {
    state: AppState
  }
>(
  'nftFarms/fetchFarmsPublicDataAsync',
  async ({pids, currentBlock}) => {

    const farmsToFetch = farmsConfig.filter((farmConfig) => pids.includes(farmConfig.pid))

    const farms = await fetchFarms(farmsToFetch, currentBlock)

    // const farmsWithPrices = getFarmsPrices(farms) TODO: Remove related file
    
    // Filter out price helper LP config farms
    const farmsWithoutHelperLps = farms.filter((farm: SerializedNftFarm) => {   // farmsWithPrices --> farms
      return farm.pid || farm.pid === 0
    })


    return [farmsWithoutHelperLps, farmsToFetch.length]
  },
  {
    condition: (arg, { getState }) => {
      const { nftFarms } = getState()
      if (nftFarms.loadingKeys[stringify({ type: fetchFarmsPublicDataAsync.typePrefix, arg })]) {
        console.debug('farms action is fetching, skipping here')
        return false
      }
      return true
    },
  },
)

interface NftFarmUserDataResponse {
  pid: number
  allowance: boolean
  tokenBalance: string
  stakedBalance: string
  earnings: string
}

export const fetchFarmUserDataAsync = createAsyncThunk<
  NftFarmUserDataResponse[],
  { account: string; pids: number[] },
  {
    state: AppState
  }
>(
  'nftFarms/fetchFarmUserDataAsync',
  async ({ account, pids }) => {
    const poolLength = await fetchMasterChefFarmPoolLength()
    const farmsToFetch = farmsConfig.filter((farmConfig) => pids.includes(farmConfig.pid))
    const farmsCanFetch = farmsToFetch.filter((f) => poolLength.gt(f.pid))
    const userFarmAllowances = await fetchFarmUserAllowances(account, farmsCanFetch)
    const userFarmTokenBalances = await fetchFarmUserTokenBalances(account, farmsCanFetch)
    const userStakedBalances = await fetchFarmUserStakedBalances(account, farmsCanFetch)
    const userFarmEarnings = await fetchFarmUserEarnings(account, farmsCanFetch)

    return userFarmAllowances.map((farmAllowance, index) => {
      return {
        pid: farmsCanFetch[index].pid,
        allowance: userFarmAllowances[index],
        tokenBalance: userFarmTokenBalances[index],
        stakedBalance: userStakedBalances[index],
        earnings: userFarmEarnings[index],
      }
    })
  },
  {
    condition: (arg, { getState }) => {
      const { farms } = getState()
      if (farms.loadingKeys[stringify({ type: fetchFarmUserDataAsync.typePrefix, arg })]) {
        console.debug('farms user action is fetching, skipping here')
        return false
      }
      return true
    },
  },
)

type UnknownAsyncThunkFulfilledOrPendingAction =
  | UnknownAsyncThunkFulfilledAction
  | UnknownAsyncThunkPendingAction
  | UnknownAsyncThunkRejectedAction

const serializeLoadingKey = (
  action: UnknownAsyncThunkFulfilledOrPendingAction,
  suffix: UnknownAsyncThunkFulfilledOrPendingAction['meta']['requestStatus'],
) => {
  const type = action.type.split(`/${suffix}`)[0]
  return stringify({
    arg: action.meta.arg,
    type,
  })
}

// Copied from pool state
export const fetchNftPoolsStakingLimitsAsync = () => async (dispatch, getState) => {
  const poolsWithStakingLimit = getState()
    .nftFarms.data.filter(({ stakingLimit }) => stakingLimit !== null && stakingLimit !== undefined)
    .map((pool) => pool.pid)

  try {
    const stakingLimits = await fetchNftPoolsStakingLimits(poolsWithStakingLimit)

    const stakingLimitData = farmsConfig.map((pool) => {
      if (poolsWithStakingLimit.includes(pool.pid)) {
        return { pid: pool.pid }
      }
      const { stakingLimit, numberBlocksForUserLimit } = stakingLimits[pool.pid] || {
        stakingLimit: BIG_ZERO,
        numberBlocksForUserLimit: 0,
      }
      return {
        pid: pool.pid,
        stakingLimit: stakingLimit.toJSON(),
        numberBlocksForUserLimit,
      }
    })

    dispatch(setPoolsPublicData(stakingLimitData))
  } catch (error) {
    console.error('[Pools Action] error when getting staking limits', error)
  }
}

export const farmsSlice = createSlice({
  name: 'NFTFarms',
  initialState,
  reducers: {
    setPoolsPublicData: (state, action) => {
      const livePoolsData: SerializedPool[] = action.payload
      state.data = state.data.map((pool) => {
        const livePoolData = livePoolsData.find((entry) => entry.pid === pool.pid)
        return { ...pool, ...livePoolData }
      })
    },
  },
  extraReducers: (builder) => {
    // Update farms with live data
    builder.addCase(fetchFarmsPublicDataAsync.fulfilled, (state, action) => {
      const [farmPayload, poolLength] = action.payload
      state.data = state.data.map((farm) => {
        const liveFarmData = farmPayload.find((farmData) => farmData.pid === farm.pid)
        return { ...farm, ...liveFarmData }
      })
      state.poolLength = poolLength
    })

    // Update farms with user data
    builder.addCase(fetchFarmUserDataAsync.fulfilled, (state, action) => {
      action.payload.forEach((userDataEl) => {
        const { pid } = userDataEl
        const index = state.data.findIndex((farm) => farm.pid === pid)
        state.data[index] = { ...state.data[index], userData: userDataEl }
      })
      state.userDataLoaded = true
    })

    builder.addMatcher(isAnyOf(fetchFarmUserDataAsync.pending, fetchFarmsPublicDataAsync.pending), (state, action) => {
      state.loadingKeys[serializeLoadingKey(action, 'pending')] = true
    })
    builder.addMatcher(
      isAnyOf(fetchFarmUserDataAsync.fulfilled, fetchFarmsPublicDataAsync.fulfilled),
      (state, action) => {
        state.loadingKeys[serializeLoadingKey(action, 'fulfilled')] = false
      },
    )
    builder.addMatcher(
      isAnyOf(fetchFarmsPublicDataAsync.rejected, fetchFarmUserDataAsync.rejected),
      (state, action) => {
        state.loadingKeys[serializeLoadingKey(action, 'rejected')] = false
      },
    )
  },
})

// Actions
export const { setPoolsPublicData } =
farmsSlice.actions
export default farmsSlice.reducer
