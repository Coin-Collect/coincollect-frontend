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
import erc721ABI from 'config/abi/erc721.json'
import BigNumber from 'bignumber.js'
import nftFarmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import useSWR from 'swr'
import { isAddress } from 'utils'
import { FetchStatus } from 'config/constants/types'


export const useStakedNfts = (selectedPid: number) => {
  const { account } = useWeb3React()
  const { stakedBalance } = useFarmUser(selectedPid)
  const nftStakeContractAddress = getCoinCollectNftStakeAddress()

  const nftPool = nftFarmsConfig.filter(({ pid }) => pid == selectedPid)[0]
  const collectionAddress = getAddress(nftPool.nftAddresses)
  const smartNftStakeAddress = nftPool.contractAddresses ? getAddress(nftPool.contractAddresses) : null


  const getNfts = async () => {

    const calls = range(stakedBalance.toNumber()).map((i) => {
      return {
        address: smartNftStakeAddress ?? nftStakeContractAddress,
        name: 'tokenOfOwnerByIndex',
        params: smartNftStakeAddress ? [account, i] : [selectedPid, account, i],
      }
    })

    const rawTokens = await multicallPolygonv1(smartNftStakeAddress ? smartNftStakeABI : coinCollectNftStakeABI, calls)

    const parsedTokenIds = rawTokens.map((token) => {
      if (!smartNftStakeAddress) {
        return { tokenId: new BigNumber(token).toJSON() };
      } else {
        const [tokenAddress, tokenId] = token;
        return {
          tokenId: new BigNumber(tokenId._hex).toJSON(),
          tokenAddress: tokenAddress
        };
      }
    });

    const imageCalls = parsedTokenIds.map((token) => {
      const { tokenId, tokenAddress } = token;
      return {
        address: smartNftStakeAddress ? tokenAddress : collectionAddress,
        name: 'tokenURI',
        params: [tokenId],
      }
    })
    const rawTokenURIs = await multicallPolygonv1(erc721ABI, imageCalls)

    const tokenIdsNumber = await Promise.all(parsedTokenIds.map(async (token, index) => {
      const { tokenId, tokenAddress } = token;
      
      let meta = null;
      try {
        //@ts-ignore
        const tokenURI = rawTokenURIs[index][0];
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

