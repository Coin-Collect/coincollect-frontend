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
import type { ChainId } from '@coincollect/sdk'
import type { AnyAction, PayloadAction, ThunkAction } from '@reduxjs/toolkit'
import type { AppState } from 'state'
import priceHelperLpsConfig from 'config/constants/priceHelperLps'
import fetchFarms, { fetchNftPoolsStakingLimits } from './fetchFarms'
import {
  fetchFarmUserEarnings,
  fetchFarmUserAllowances,
  fetchFarmUserTokenBalances,
  fetchFarmUserStakedBalances,
} from './fetchFarmUser'
import { SerializedNftFarmsState, SerializedNftFarm } from '../types'
import { fetchMasterChefFarmPoolLength } from './fetchMasterChefData'
import { BIG_ZERO } from 'utils/bigNumber'
import { getViemClients } from 'utils/viem'

const noAccountFarmConfig = farmsConfig.map((farm) => ({
  ...farm,
  userData: {
    allowance: [false],
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
const includesWalletScan = (pids: number[]) =>
  pids.length >= nonArchivedFarms.length && nonArchivedFarms.every(({ pid }) => pids.includes(pid))

// Async thunks
// Main Function for Farm Data and Price Calculation
export const fetchFarmsPublicDataAsync = createAsyncThunk<
  [SerializedNftFarm[], number],
  {pids: number[]; currentBlock: number; chainId: number},
  {
    state: AppState
  }
>(
  'nftFarms/fetchFarmsPublicDataAsync',
  async ({pids, currentBlock, chainId}) => {

    const farmsToFetch = farmsConfig.filter((farmConfig) => pids.includes(farmConfig.pid))

    const farms = await fetchFarms(farmsToFetch, currentBlock, chainId)

    
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
  allowance: boolean[]
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
    const farmsToFetch = farmsConfig.filter((farmConfig) => pids.includes(farmConfig.pid))
    const userFarmAllowances = await fetchFarmUserAllowances(account, farmsToFetch)
    const userFarmTokenBalances = await fetchFarmUserTokenBalances(account, farmsToFetch)
    const userStakedBalances = await fetchFarmUserStakedBalances(account, farmsToFetch)
    const userFarmEarnings = await fetchFarmUserEarnings(account, farmsToFetch)

    return userFarmAllowances.map((farmAllowance, index) => {
      return {
        pid: farmsToFetch[index].pid,
        allowance: userFarmAllowances[index],
        tokenBalance: userFarmTokenBalances[index],
        stakedBalance: userStakedBalances[index],
        earnings: userFarmEarnings[index],
      }
    })
  },
  {
    condition: (arg, { getState }) => {
      const { nftFarms } = getState()
      if (nftFarms.loadingKeys[stringify({ type: fetchFarmUserDataAsync.typePrefix, arg })]) {
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
export const fetchNftPoolsStakingLimitsAsync = (chainId: ChainId): ThunkAction<Promise<void>, AppState, unknown, AnyAction> => async (dispatch, getState) => {
  const poolsWithStakingLimit = getState()
    .nftFarms.data.filter(({ stakingLimit }) => stakingLimit !== null && stakingLimit !== undefined)
    .map((pool) => pool.pid)

  try {
    const stakingLimits = await fetchNftPoolsStakingLimits({ poolsWithStakingLimit, chainId, provider: getViemClients })

    const stakingLimitData = farmsConfig.map((pool) => {
      if (poolsWithStakingLimit.includes(pool.pid)) {
        return { pid: pool.pid }
      }
      const { stakingLimit, numberSecondsForUserLimit } = stakingLimits[pool.pid] || {
        stakingLimit: BIG_ZERO,
        numberSecondsForUserLimit: 0,
      }
      return {
        pid: pool.pid,
        stakingLimit: stakingLimit.toJSON(),
        numberSecondsForUserLimit,
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
    setPoolsPublicData: (state, action: PayloadAction<Pick<SerializedNftFarm, 'pid' | 'stakingLimit' | 'numberSecondsForUserLimit'>[]>) => {
      const livePoolsData = action.payload
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
    builder.addCase(fetchFarmUserDataAsync.pending, (state, { meta }) => {
      if (!includesWalletScan(meta.arg.pids)) return
      const account = meta.arg.account.toLowerCase()
      const previous = state.walletScan
      state.walletScan = {
        account,
        requestId: meta.requestId,
        status: previous?.account === account && previous.status === 'ready' ? 'ready' : 'loading',
      }
    })
    builder.addCase(fetchFarmUserDataAsync.fulfilled, (state, action) => {
      const account = action.meta.arg.account.toLowerCase()
      if (state.walletScan && state.walletScan.account !== account) return
      if (state.userDataAccount && state.userDataAccount !== account) {
        state.data.forEach((farm) => {
          farm.userData = undefined
        })
      }
      action.payload.forEach((userDataEl) => {
        const { pid } = userDataEl
        const index = state.data.findIndex((farm) => farm.pid === pid)
        state.data[index] = { ...state.data[index], userData: userDataEl }
      })
      state.userDataLoaded = true
      state.userDataAccount = account
      if (state.walletScan?.requestId === action.meta.requestId) state.walletScan.status = 'ready'
    })
    builder.addCase(fetchFarmUserDataAsync.rejected, (state, { meta }) => {
      if (state.walletScan?.requestId === meta.requestId) state.walletScan.status = 'error'
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
