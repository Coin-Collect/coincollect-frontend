import { Address, SerializedNftFarmConfig } from 'config/constants/types'
import BigNumber from 'bignumber.js'
import { BigNumber as EthersBigNumber } from '@ethersproject/bignumber'
import { BIG_TEN, BIG_ZERO } from '../../utils/bigNumber'
import { fetchPublicFarmsData } from './fetchPublicFarmData'
import { fetchMasterChefData } from './fetchMasterChefData'
import farmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import { multicallPolygonv1, multicallPolygonv2 } from 'utils/multicall'
import chunk from 'lodash/chunk'
import { simplePolygonRpcProvider } from 'utils/providers'
import { getAddress as getViemAddress, parseAbi } from 'viem'
import { getViemClients } from 'utils/viem'
import { ChainId } from '@coincollect/sdk'
import { CHAIN_ID } from 'config/constants/networks'
import { POLYGON_BLOCK_TIME } from 'config'
import fromPairs from 'lodash/fromPairs'

const scheduleAbi = parseAbi([
  'function startBlock() view returns (uint256)',
  'function bonusEndBlock() view returns (uint256)',
])
const stakingLimitAbi = parseAbi([
  'function hasUserLimit() view returns (bool)',
  'function poolLimitPerUser() view returns (uint256)',
  'function numberBlocksForUserLimit() view returns (uint256)',
])

const smartNftStakeFarms = farmsConfig.filter(
  (farm): farm is SerializedNftFarmConfig & { contractAddresses: Address } => farm.contractAddresses !== undefined,
)
const startEndBlockCalls = smartNftStakeFarms.flatMap((nftFarmConfig) => {
  return [
    {
      abi: scheduleAbi,
      address: getViemAddress(getAddress(nftFarmConfig.contractAddresses, ChainId.POLYGON)),
      functionName: 'startBlock',
    },
    {
      abi: scheduleAbi,
      address: getViemAddress(getAddress(nftFarmConfig.contractAddresses, ChainId.POLYGON)),
      functionName: 'bonusEndBlock',
    },
  ]
})

export const fetchNftFarmsTimeLimits = async (chainId: number, provider: typeof getViemClients) => {
  
  const client = provider({ chainId })
  const [block, startEndBlockRaw] = await Promise.all([
    client.getBlock({ blockTag: 'latest' }),
    client.multicall({
      contracts: startEndBlockCalls,
      allowFailure: false,
    }),
  ])

  const startEndBlockResult = chunk(startEndBlockRaw, 2)

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
}: { poolsWithStakingLimit: number[]; chainId: number; provider: typeof getViemClients }): Promise<{ [key: string]: { stakingLimit: BigNumber; numberSecondsForUserLimit: number } }> => {
  const validPools = smartNftStakeFarms
    .filter((p) => !p.isFinished)
    .filter((p) => !poolsWithStakingLimit.includes(p.pid))

  if (validPools.length === 0) return {}

  // Get the staking limit for each valid pool
  const poolStakingCalls = validPools
    .map((validPool) => {
      const contractAddress = getViemAddress(getAddress(validPool.contractAddresses, ChainId.POLYGON))
      return (['hasUserLimit', 'poolLimitPerUser', 'numberBlocksForUserLimit'] as const).map((method) => ({
        address: contractAddress,
        functionName: method,
        abi: stakingLimitAbi,
      } as const))
    })
    .flat()

  const client = provider({ chainId })

  const poolStakingResultRaw = await client.multicall({
    contracts: poolStakingCalls,
    allowFailure: true,
  })
  
  const poolStakingChunkedResultRaw = chunk(poolStakingResultRaw, 3)
  return fromPairs(
    poolStakingChunkedResultRaw.map((stakingLimitRaw, index) => {
      const [enabled, limit, duration] = stakingLimitRaw
      if (enabled.status !== 'success' || enabled.result !== true || limit.status !== 'success' || duration.status !== 'success') {
        return [validPools[index].pid, { stakingLimit: BIG_ZERO, numberSecondsForUserLimit: 0 }]
      }
      const stakingLimit = typeof limit.result === 'bigint' ? new BigNumber(limit.result.toString()) : BIG_ZERO
      const numberBlocksForUserLimit = typeof duration.result === 'bigint' ? Number(duration.result) : 0
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
