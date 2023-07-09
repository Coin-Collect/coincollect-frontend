import erc20 from 'config/abi/erc20.json'
import chunk from 'lodash/chunk'
import { getAddress, getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import { multicallPolygonv2 } from 'utils/multicall'
import { SerializedNftFarm } from '../types'
import { SerializedNftFarmConfig } from '../../config/constants/types'
import { nftFarmsConfig } from 'config/constants'
//import BigNumber from 'bignumber.js'
import { BigNumber } from '@ethersproject/bignumber'

const fetchFarmCalls = (farm: SerializedNftFarm) => {
  const { contractAddresses, nftAddresses, supportedCollectionPids } = farm;
  
  // Stake Pool Address
  const nftAddress = getAddress(nftAddresses);
  const contractAddress = contractAddresses ? getAddress(contractAddresses) : getCoinCollectNftStakeAddress();
  
  const calls = [
    // Balance of LP tokens in the master chef contract
    {
      address: nftAddress,
      name: 'balanceOf',
      params: [contractAddress],
    },
  ];

  if (supportedCollectionPids && supportedCollectionPids.length > 0) {
    for (const pid of supportedCollectionPids) {
      const supportedPool = nftFarmsConfig.find((farm) => farm.pid === pid);
      const supportedNftAddress = getAddress(supportedPool.nftAddresses);
      
      calls.push({
        address: supportedNftAddress,
        name: 'balanceOf',
        params: [contractAddress],
      });
    }
  }

  return calls;
};


export const fetchPublicFarmsData = async (farms: SerializedNftFarmConfig[]): Promise<any[]> => {
  const farmCalls = farms.flatMap((farm) => fetchFarmCalls(farm))
  const chunkSize = farmCalls.length / farms.length
  const farmMultiCallResult = await multicallPolygonv2(erc20, farmCalls)

  const updatedfarmMultiCallResult= [];
  let currentIndex = 0

  for (const farm of farms) {
    const { supportedCollectionPids } = farm;

    let totalBalance = BigNumber.from(farmMultiCallResult[currentIndex][0]._hex);
    currentIndex++;
  
    
    if (supportedCollectionPids && supportedCollectionPids.length > 0) {
      for (const pid of supportedCollectionPids) {
        totalBalance = totalBalance.add(BigNumber.from(farmMultiCallResult[currentIndex][0]._hex));
        currentIndex++;
      }
    }

    updatedfarmMultiCallResult.push(totalBalance.toHexString())

  }

  return chunk(updatedfarmMultiCallResult, chunkSize)
}
