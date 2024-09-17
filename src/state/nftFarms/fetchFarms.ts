import { SerializedNftFarmConfig } from 'config/constants/types'
import BigNumber from 'bignumber.js'
import { BigNumber as EthersBigNumber } from '@ethersproject/bignumber'
import { BIG_TEN, BIG_ZERO } from '../../utils/bigNumber'
import { fetchPublicFarmsData } from './fetchPublicFarmData'
import { fetchMasterChefData } from './fetchMasterChefData'
import farmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import { multicallPolygonv1, multicallPolygonv2 } from 'utils/multicall'
import sousChefABI from 'config/abi/sousChef.json'
import sousChefV2 from '../../config/abi/sousChefV2.json'
import chunk from 'lodash/chunk'
import { simplePolygonRpcProvider } from 'utils/providers'
import { polygon } from 'wagmi/chains'
import { getViemClients } from 'utils/viem'
import { ChainId } from '@coincollect/sdk'
import { CHAIN_ID } from 'config/constants/networks'
import { POLYGON_BLOCK_TIME } from 'config'
import { fromPairs } from 'lodash'

const smartNftStakeFarms = farmsConfig.filter((f) => f.contractAddresses)
const startEndBlockCalls = smartNftStakeFarms.flatMap((nftFarmConfig) => {
  return [
    {
      abi: sousChefABI,
      address: getAddress(nftFarmConfig.contractAddresses),
      functionName: 'startBlock',
    },
    {
      abi: sousChefABI,
      address: getAddress(nftFarmConfig.contractAddresses),
      functionName: 'bonusEndBlock',
    },
  ]
})

export const fetchNftFarmsTimeLimits = async (chainId, provider) => {
  
  const client = provider({ chainId })
  const [block, startEndBlockRaw] = await Promise.all([
    client.getBlock({ blockTag: 'latest' }),
    client.multicall({
      contracts: startEndBlockCalls,
      allowFailure: false,
    }),
  ])

  const startEndBlockResult = startEndBlockRaw.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / 2)

    if (!resultArray[chunkIndex]) {
      // eslint-disable-next-line no-param-reassign
      resultArray[chunkIndex] = [] // start a new chunk
    }

    resultArray[chunkIndex].push(item)

    return resultArray
  }, [])

  const getTimestampFromBlock = (targetBlock: number) => {
    return Number(block.timestamp) + (targetBlock - Number(block.number)) * POLYGON_BLOCK_TIME
  }
  
  return smartNftStakeFarms.map((nftFarmConfig, index) => {
    const [startBlock, endBlock] = startEndBlockResult[index]
    return {
      pid: nftFarmConfig.pid,
      startTimestamp: getTimestampFromBlock(Number(startBlock)),
      endTimestamp: getTimestampFromBlock(Number(endBlock)),
    }
  })
}

export const fetchNftPoolsStakingLimits = async ({
  poolsWithStakingLimit,
  chainId,
  provider,
}): Promise<{ [key: string]: { stakingLimit: BigNumber; numberSecondsForUserLimit: number } }> => {
  const validPools = smartNftStakeFarms
    .filter((p) => !p.isFinished)
    .filter((p) => !poolsWithStakingLimit.includes(p.pid))

  // Get the staking limit for each valid pool
  const poolStakingCalls = validPools
    .map((validPool) => {
      const contractAddress = getAddress(validPool.contractAddresses)
      return (['hasUserLimit', 'poolLimitPerUser', 'numberBlocksForUserLimit'] as const).map((method) => ({
        address: contractAddress,
        functionName: method,
        abi: sousChefV2,
      } as const))
    })
    .flat()

  const client = provider({ chainId })

  const poolStakingResultRaw = await client.multicall({
    contracts: poolStakingCalls,
    allowFailure: true,
  })
  
  const chunkSize = poolStakingCalls.length / validPools.length
  const poolStakingChunkedResultRaw = chunk(poolStakingResultRaw.flat(), chunkSize)
  return fromPairs(
    poolStakingChunkedResultRaw.map((stakingLimitRaw, index) => {
      const hasUserLimit = stakingLimitRaw[0]?.result as boolean
      const stakingLimit =
        hasUserLimit && stakingLimitRaw[1].result ? new BigNumber(stakingLimitRaw[1].result.toString()) : BIG_ZERO
      const numberBlocksForUserLimit = stakingLimitRaw[2].result ? Number(stakingLimitRaw[2].result) : 0
      const numberSecondsForUserLimit = numberBlocksForUserLimit * POLYGON_BLOCK_TIME
      return [validPools[index].pid, { stakingLimit, numberSecondsForUserLimit }]
    }),
  )
}

const fetchFarms = async (farmsToFetch: SerializedNftFarmConfig[], currentBlock: number, chainId: number) => {
  
  const [block, timeLimits] = await Promise.all([
    getViemClients({chainId})?.getBlock({ blockTag: 'latest' }),
    fetchNftFarmsTimeLimits(chainId, getViemClients),
  ])
  
  // Information about LP Token Contract(Pair)
  const farmResult = await fetchPublicFarmsData(farmsToFetch)

  // Only farms in nftStakeContract(not smartchef)
  const coinCollectFarms = farmsToFetch.filter((f) => !f.contractAddresses)
  const smartNftStakePools = farmsToFetch.filter((f) => f.contractAddresses)
  
  // Information about Farming Pools on Masterchef
  const oldNftStakePoolResult = await fetchMasterChefData(coinCollectFarms, false)
  
  const smartNftStakePoolResult = await fetchMasterChefData(smartNftStakePools, true)
  

  return farmsToFetch.map((farm, index) => {
    const timeLimit = timeLimits.find((entry) => entry.pid === farm.pid)
    const isPoolEndBlockExceeded = block.timestamp > 0 && timeLimit ? block.timestamp > Number(timeLimit.endTimestamp) : false
    const isPoolFinished = farm.isFinished || isPoolEndBlockExceeded

    // LP Token Contract(Pair) datas
    const [lpTokenBalanceMC] = farmResult[index]
      
    // Farming Pools on Masterchef
    const [info, totalAllocPoint] = coinCollectFarms.includes(farm) ? oldNftStakePoolResult[index] : [null,null]
    const allocPoint = info ? new BigNumber(info.allocPoint?._hex) : BIG_ZERO
    const poolWeight = totalAllocPoint ? allocPoint.div(new BigNumber(totalAllocPoint)) : BIG_ZERO
    const totalShares = farm.contractAddresses ? smartNftStakePoolResult[index - coinCollectFarms.length] : BIG_ZERO

    return {
      ...farm,
      ...timeLimit,
      totalStaked: new BigNumber(lpTokenBalanceMC).toJSON(),
      poolWeight: poolWeight.toJSON(),
      multiplier: `${allocPoint.div(100).toString()}X`,
      isFinished: isPoolFinished,
      totalShares: new BigNumber(totalShares).toJSON(),
    }
  })
}

export default fetchFarms
