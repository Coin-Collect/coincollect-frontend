import { useWeb3React } from '@web3-react/core'
import axios from 'axios'
import { IPFS_GATEWAY } from 'config'
import { useCoinCollectNFTContract } from "hooks/useContract"
import { useEffect, useState } from "react"
import nftFarmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import useSWR from 'swr'
import { isAddress } from 'utils'
import { FetchStatus } from 'config/constants/types'


export const useNftsForCollectionAndAddress = (selectedPid: number) => {
    const { account } = useWeb3React()
    
    const nftPool = nftFarmsConfig.filter(({ pid }) => pid == selectedPid)[0]
    const collectionAddress = getAddress(nftPool.nftAddresses)
    const collectionContract = useCoinCollectNFTContract(collectionAddress)


        const getNfts = async () => {
            
              const tokenIds = await collectionContract.walletOfOwner(account)

              const tokenIdsNumber = await Promise.all(tokenIds.map(async (id) => {

                let meta = null;
                try {
                  //@ts-ignore
                  const tokenURI = await collectionContract.tokenURI(id.toNumber())
                  meta = await axios.get(tokenURI)
                  return {tokenId: id.toNumber(), image: meta.data.image.replace("ipfs://", `${IPFS_GATEWAY}/`)}
                } catch (error) {
                  console.log('IPFS link is broken!', error);
                  return {tokenId: id.toNumber(), image: 'images/nfts/no-profile-md.png'}
                }
                
              }))
              console.log("promise done")
              return tokenIdsNumber
            
        }

        const { data, status, error } = useSWR(isAddress(account) ? [account, selectedPid, 'unstakedNftList'] : null, async () => getNfts())

    

    return { nfts: data ?? [], isLoading: status !== FetchStatus.Fetched, error }
}

