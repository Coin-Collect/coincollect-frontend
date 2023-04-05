import BigNumber from 'bignumber.js'
import erc20ABI from 'config/abi/erc20.json'
import erc721ABI from 'config/abi/erc721collection.json'
import masterchefABI from 'config/abi/masterchef.json'
import coinCollectFarmABI from 'config/abi/coinCollectFarm.json'
import { multicallPolygonv1 } from 'utils/multicall'
import { getAddress, getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import { SerializedNftFarmConfig } from 'config/constants/types'

export const fetchFarmUserAllowances = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  const masterChefAddress = getCoinCollectNftStakeAddress() //getMasterChefAddress()

  const calls = farmsToFetch.map((farm) => {
    const nftContractAddress = getAddress(farm.nftAddresses)
    return { address: nftContractAddress, name: 'isApprovedForAll', params: [account, masterChefAddress] }
  })
  const rawNftAllowances = await multicallPolygonv1<boolean[]>(erc721ABI, calls)
  const parsedNftAllowances = rawNftAllowances.map((approved) => {
    return approved?.[0]
  })
  return parsedNftAllowances
}

export const fetchFarmUserTokenBalances = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  const calls = farmsToFetch.map((farm) => {
    const lpContractAddress = getAddress(farm.lpAddresses)
    return {
      address: lpContractAddress,
      name: 'balanceOf',
      params: [account],
    }
  })

  const rawTokenBalances = await multicallPolygonv1(erc20ABI, calls)
  const parsedTokenBalances = rawTokenBalances.map((tokenBalance) => {
    return new BigNumber(tokenBalance).toJSON()
  })
  return parsedTokenBalances
}

export const fetchFarmUserStakedBalances = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  const masterChefAddress = getCoinCollectNftStakeAddress() //getMasterChefAddress()

  const calls = farmsToFetch.map((farm) => {
    return {
      address: masterChefAddress,
      name: 'userInfo',
      params: [farm.pid, account],
    }
  })

  const rawStakedBalances = await multicallPolygonv1(masterchefABI, calls)
  const parsedStakedBalances = rawStakedBalances.map((stakedBalance) => {
    return new BigNumber(stakedBalance[0]._hex).toJSON()
  })
  return parsedStakedBalances
}

export const fetchFarmUserEarnings = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  const masterChefAddress = getCoinCollectNftStakeAddress() //getMasterChefAddress()

  const calls = farmsToFetch.map((farm) => {
    return {
      address: masterChefAddress,
      name: 'pendingReward',
      params: [farm.pid, account],
    }
  })

  const rawEarnings = await multicallPolygonv1(coinCollectFarmABI, calls)
  const parsedEarnings = rawEarnings.map((earnings) => {
    return new BigNumber(earnings).toJSON()
  })
  return parsedEarnings
}
