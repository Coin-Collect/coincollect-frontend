import BigNumber from 'bignumber.js'
import erc721ABI from 'config/abi/erc721collection.json'
import masterchefABI from 'config/abi/masterchef.json'
import coinCollectNftStakeABI from 'config/abi/coinCollectNftStake.json'
import smartNftStakeABI from '../../config/abi/smartNftStake.json'
import { multicallPolygonv1 } from 'utils/multicall'
import { getAddress, getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import { SerializedNftFarmConfig } from 'config/constants/types'
import nftFarmsConfig from 'config/constants/nftFarms'

export const fetchFarmUserAllowances = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  const masterChefAddress = getCoinCollectNftStakeAddress()

  const calls: { address: string, name: string, params: any[] }[] = []

  for (const farm of farmsToFetch) {
    
      const nftContractAddress = getAddress(farm.nftAddresses)
      const smartNftPoolAddress = farm.contractAddresses ? getAddress(farm.contractAddresses) : null
      calls.push({ address: nftContractAddress, name: 'isApprovedForAll', params: [account, smartNftPoolAddress ?? masterChefAddress] })

      if(farm?.supportedCollectionPids && farm.supportedCollectionPids.length > 0) {
        for (const pid of farm.supportedCollectionPids) {
          const supportedPool = nftFarmsConfig.find(farm => farm.pid === pid);
          const supportedNftContractAddress = getAddress(supportedPool.nftAddresses)
          calls.push({ address: supportedNftContractAddress, name: 'isApprovedForAll', params: [account, smartNftPoolAddress] })
        }
      }
    
  }

  const rawAllowances = await multicallPolygonv1<boolean[]>(erc721ABI, calls)
  const parsedNftAllowances: boolean[][] = []
  let currentIndex = 0
  for (const farm of farmsToFetch) {

    const allowancesForPool: boolean[] = []

    // Allowance of main collection
    allowancesForPool.push(rawAllowances[currentIndex]?.[0] ?? false)
    currentIndex++
    if (farm?.supportedCollectionPids && farm.supportedCollectionPids.length > 0) {
      // Allowances for supported collections
      for (const pid of farm.supportedCollectionPids) {
        allowancesForPool.push(rawAllowances[currentIndex]?.[0] ?? false)
        currentIndex++
      }
    }
    parsedNftAllowances.push(allowancesForPool)
  }
  
  return parsedNftAllowances
}
// Staked Nft Balance
export const fetchFarmUserTokenBalances = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  
  const calls = farmsToFetch.map((farm) => {
    const nftContractAddress = getAddress(farm.nftAddresses)
    return {
      address: nftContractAddress,
      name: 'balanceOf',
      params: [account],
    }
  })

  const rawTokenBalances = await multicallPolygonv1(erc721ABI, calls)
  const parsedTokenBalances = rawTokenBalances.map((tokenBalance) => {
    return new BigNumber(tokenBalance).toJSON()
  })
  return parsedTokenBalances
}

export const fetchFarmUserStakedBalances = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  const masterChefAddress = getCoinCollectNftStakeAddress()
  const coinCollectFarms = farmsToFetch.filter((f) => !f.contractAddresses)
  const smartNftFarms = farmsToFetch.filter((f) => f.contractAddresses)

  const coinCollectNftsCalls = coinCollectFarms.map((farm) => {
    return {
      address: masterChefAddress,
      name: 'balanceOf',
      params: [farm.pid, account],
    }
  })

  const smartNftPoolCalls = smartNftFarms.map((farm) => {
    return {
      address: getAddress(farm.contractAddresses),
      name: 'balanceOf',
      params: [account],
    }
  })

  const [rawStakedBalances_1, rawStakedBalances_2] = await Promise.all([
    multicallPolygonv1(coinCollectNftStakeABI, coinCollectNftsCalls),
    multicallPolygonv1(smartNftStakeABI, smartNftPoolCalls),
  ]);

  const rawStakedBalances = [...rawStakedBalances_1, ...rawStakedBalances_2]
  const parsedStakedBalances = rawStakedBalances.map((stakedBalance) => {
    return new BigNumber(stakedBalance).toJSON()
  })
  return parsedStakedBalances
}

export const fetchFarmUserEarnings = async (account: string, farmsToFetch: SerializedNftFarmConfig[]) => {
  const masterChefAddress = getCoinCollectNftStakeAddress() //getMasterChefAddress()
  // Only farms in nftStakeContract(not smartchef)
  const coinCollectFarms = farmsToFetch.filter((f) => !f.contractAddresses)
  const smartNftFarms = farmsToFetch.filter((f) => f.contractAddresses)
  
  const coinCollectNftsCalls = coinCollectFarms.map((farm) => {
    return {
      address: masterChefAddress,
      name: 'pendingReward',
      params: [farm.pid, account],
    }
  })

  const smartNftPoolCalls = smartNftFarms.map((farm) => {
    return {
      address: getAddress(farm.contractAddresses),
      name: 'pendingReward',
      params: [account],
    }
  })

  const rawEarnings_1 = await multicallPolygonv1(coinCollectNftStakeABI, coinCollectNftsCalls)
  const rawEarnings_2 = await multicallPolygonv1(smartNftStakeABI, smartNftPoolCalls)
  const rawEarnings = [...rawEarnings_1, ...rawEarnings_2]
  const parsedEarnings = rawEarnings.map((earnings) => {
    return new BigNumber(earnings).toJSON()
  })
  return parsedEarnings
}
