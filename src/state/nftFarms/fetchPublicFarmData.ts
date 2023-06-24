import erc20 from 'config/abi/erc20.json'
import chunk from 'lodash/chunk'
import { getAddress, getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import { multicallPolygonv2 } from 'utils/multicall'
import { SerializedNftFarm } from '../types'
import { SerializedNftFarmConfig } from '../../config/constants/types'

const fetchFarmCalls = (farm: SerializedNftFarm) => {
  const { contractAddresses, nftAddresses } = farm
  
  // Stake Pool Address
  const nftAddress = getAddress(nftAddresses)
  const contractAddress = contractAddresses ? getAddress(contractAddresses) : getCoinCollectNftStakeAddress()
  
  return [
    // Balance of LP tokens in the master chef contract
    {
      address: nftAddress,
      name: 'balanceOf',
      params: [contractAddress],
    },
    // Total supply of LP tokens
    {
      address: nftAddress,
      name: 'totalSupply',
    },
  ]
}

export const fetchPublicFarmsData = async (farms: SerializedNftFarmConfig[]): Promise<any[]> => {
  const farmCalls = farms.flatMap((farm) => fetchFarmCalls(farm))
  const chunkSize = farmCalls.length / farms.length
  const farmMultiCallResult = await multicallPolygonv2(erc20, farmCalls)
  return chunk(farmMultiCallResult, chunkSize)
}
