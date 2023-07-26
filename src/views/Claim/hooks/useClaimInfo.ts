import { useWeb3React } from '@web3-react/core'
import useSWR, { KeyedMutator } from 'swr'
import { FetchStatus } from 'config/constants/types'
import { useCoinCollectClaimRewardContract, useCoinCollectClaimRewardV2Contract } from 'hooks/useContract'
import claimConfig from 'config/constants/claim'
import BigNumber from 'bignumber.js'

const getSpecificData = (claimInfo, dataType) => {
  if (dataType == "userClaimInfo") {
    return claimInfo[2]
  } else if (dataType == "rewardBalances") {
    return claimInfo[3]
  } else if (dataType == "targetNftsForClaimIndex") {

    const targetNftsForClaimIndex = []
    for (let i = 0; i < claimInfo[1].length; i += 1) {
      const addressList = Array(claimInfo[1][i][1].length).fill(claimInfo[1][i][0]);
      const nftList = claimInfo[1][i][1].map((nft: BigNumber)=>nft.toNumber());
      targetNftsForClaimIndex.push([addressList, nftList])
    }
    return targetNftsForClaimIndex
    
  } else if (dataType == "communityNfts") {

    const communityNfts = [[],[]]
    for (let i = 0; i < claimInfo[0].length; i += 1) {
      const addressList = Array(claimInfo[0][i][1].length).fill(claimInfo[0][i][0]);
      const nftList = claimInfo[0][i][1].map((nft: BigNumber)=>nft.toNumber());
      communityNfts[0].push(...addressList)
      communityNfts[1].push(...nftList)
    }
    return communityNfts

  }

}


const getClaimInfo = async (account, claimRewardContract, claimRewardV2Contract) => {
    const claimInfo = await claimRewardContract.getInfo(account);
    const claimInfo2 = await claimRewardV2Contract.getInfo(account);


  try {
    
    let claimIndex1 = 0;
    let claimIndex2 = 0;
    const claimDetails = claimConfig.map((claim) => {
      
      const info = claim.version == 2 ? claimInfo2 : claimInfo;
      const claimIndex = claim.version == 2 ? claimIndex2++ : claimIndex1++;

      return {
        ...claim,
        userWeight: new BigNumber(getSpecificData(info, "userClaimInfo")[claimIndex]?.totalWeights?._hex).toNumber(),
        remainingClaims: new BigNumber(getSpecificData(info, "userClaimInfo")[claimIndex]?.remainingClaims?._hex).toNumber(),
        rewardBalance: new BigNumber(getSpecificData(info, "rewardBalances")[claimIndex]?._hex).toNumber(),
        nftsToClaim: [[...getSpecificData(info, "targetNftsForClaimIndex")[claimIndex]?.[0] ?? [], ...getSpecificData(info, "communityNfts")[0]], [...getSpecificData(info, "targetNftsForClaimIndex")[claimIndex]?.[1] ?? [], ...getSpecificData(info, "communityNfts")[1]]],
      }
    })
    

    return claimDetails

  } catch (error) {
    console.log(error)
    return null
  }
    
}

export const useClaimInfo = (): {
  data: any
  isInitialized: boolean
  isLoading: boolean
  refresh: KeyedMutator<any>
} => {
  const { account } = useWeb3React()
  const claimRewardContract = useCoinCollectClaimRewardContract()
  const claimRewardV2Contract = useCoinCollectClaimRewardV2Contract()

  const { data, status, mutate } = useSWR(account ? [account, 'claimInfo'] : null, () => getClaimInfo(account, claimRewardContract, claimRewardV2Contract))

  const isLoading = status === FetchStatus.Fetching
  const isInitialized = status === FetchStatus.Fetched || status === FetchStatus.Failed


  return { data, isInitialized, isLoading, refresh: mutate }
}