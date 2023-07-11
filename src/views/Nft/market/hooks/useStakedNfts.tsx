import { useWeb3React } from '@web3-react/core'
import axios from 'axios'
import { IPFS_GATEWAY } from 'config'
import { useEffect, useState } from "react"
import { getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import { useFarmUser } from 'state/nftFarms/hooks'
import { range } from 'lodash'
import { multicallPolygonv1 } from 'utils/multicall'
import coinCollectNftStakeABI from 'config/abi/coinCollectNftStake.json'
import smartNftStakeABI from 'config/abi/smartNftStake.json'
import BigNumber from 'bignumber.js'
import nftFarmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import useSWR from 'swr'
import { isAddress } from 'utils'
import { FetchStatus } from 'config/constants/types'
import { useCoinCollectNFTContract } from 'hooks/useContract'


export const useStakedNfts = (selectedPid: number) => {
  const { account } = useWeb3React()
  const { tokenBalance } = useFarmUser(selectedPid)
  const nftStakeContractAddress = getCoinCollectNftStakeAddress()

  const nftPool = nftFarmsConfig.filter(({ pid }) => pid == selectedPid)[0]
  const collectionAddress = getAddress(nftPool.nftAddresses)
  const collectionContract = useCoinCollectNFTContract(collectionAddress)
  const smartNftStakeAddress = nftPool.contractAddresses ? getAddress(nftPool.contractAddresses) : null


  const getNfts = async () => {

    const calls = range(tokenBalance.toNumber()).map((i) => {
      return {
        address: smartNftStakeAddress ?? nftStakeContractAddress,
        name: 'tokenOfOwnerByIndex',
        params: smartNftStakeAddress ? [account, i] : [selectedPid, account, i],
      }
    })

    const rawTokenIds = await multicallPolygonv1(smartNftStakeAddress ? smartNftStakeABI : coinCollectNftStakeABI, calls)

    const parsedTokenIds = rawTokenIds.map((token) => {
      if (!smartNftStakeAddress) {
        return new BigNumber(token).toJSON();
      } else {
        const [tokenAddress, tokenId] = token;
        return {
          tokenId: new BigNumber(tokenId._hex).toJSON(),
          tokenAddress: tokenAddress
        };
      }
    });
    

    const tokenIdsNumber = await Promise.all(parsedTokenIds.map(async (token) => {
      const { tokenId, tokenAddress } = token;
    
      let meta = null;
      try {
        //@ts-ignore
        const tokenContract = useCoinCollectNFTContract(tokenAddress);
        const tokenURI = await collectionContract.tokenURI(tokenId);
        meta = await axios(tokenURI);
      } catch (error) {
        console.log('IPFS link is broken!', error);
      }
    
      return {
        tokenId: tokenId,
        collectionAddress: smartNftStakeAddress ? tokenAddress : collectionAddress,
        image: meta ? meta.data.image.replace("ipfs://", `${IPFS_GATEWAY}/`) : 'images/nfts/no-profile-md.png'
      };
    }));
    


    return tokenIdsNumber
  }

  const { data, status, error } = useSWR(isAddress(account) ? [account, selectedPid, 'stakedNftList'] : null, async () => getNfts())

  return { nfts: data ?? [], isLoading: status !== FetchStatus.Fetched, error }
}

