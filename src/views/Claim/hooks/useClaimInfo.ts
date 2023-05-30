import { useWeb3React } from '@web3-react/core'
import useSWR, { KeyedMutator } from 'swr'
import { FetchStatus } from 'config/constants/types'
import { useCoinCollectClaimRewardContract } from 'hooks/useContract'
import claimConfig from 'config/constants/claim'
import BigNumber from 'bignumber.js'


const getClaimInfo = async (account, claimRewardContract) => {
    const claimInfo = await claimRewardContract.getInfo(account);
    
    const communityNfts = [[],[]]
    for (let i = 0; i < claimInfo[0].length; i += 1) {
      const addressList = Array(claimInfo[0][i][1].length).fill(claimInfo[0][i][0]);
      const nftList = claimInfo[0][i][1].map((nft: BigNumber)=>nft.toNumber());
      communityNfts[0].push(...addressList)
      communityNfts[1].push(...nftList)
    }

    const targetNftsForClaimIndex = []
    for (let i = 0; i < claimInfo[1].length; i += 1) {
      const addressList = Array(claimInfo[1][i][1].length).fill(claimInfo[1][i][0]);
      const nftList = claimInfo[1][i][1].map((nft: BigNumber)=>nft.toNumber());
      targetNftsForClaimIndex.push([addressList, nftList])
    }

    const userClaimInfo = claimInfo[2]
    const rewardBalances = claimInfo[3]

  try {
    
    const claimDetails = claimConfig.map((claim, claimIndex) => ({
      ...claim,
      userWeight: new BigNumber(userClaimInfo[claimIndex]?.totalWeights?._hex).toNumber(),
      remainingClaims: new BigNumber(userClaimInfo[claimIndex]?.remainingClaims?._hex).toNumber(),
      rewardBalance: new BigNumber(rewardBalances[claimIndex]?._hex).toNumber(),
      nftsToClaim: [[...targetNftsForClaimIndex[claimIndex]?.[0] ?? [], ...communityNfts[0]], [...targetNftsForClaimIndex[claimIndex]?.[1] ?? [], ...communityNfts[1]]],
    }))

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

  const { data, status, mutate } = useSWR(account ? [account, 'claimInfo'] : null, () => getClaimInfo(account, claimRewardContract))

  const isLoading = status === FetchStatus.Fetching
  const isInitialized = status === FetchStatus.Fetched || status === FetchStatus.Failed


  return { data, isInitialized, isLoading, refresh: mutate }
}