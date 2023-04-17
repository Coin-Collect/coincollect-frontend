import { useWeb3React } from '@web3-react/core'
import axios from 'axios'
import { IPFS_GATEWAY } from 'config'
import { useEffect, useState } from "react"
import { getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import { useFarmUser } from 'state/nftFarms/hooks'
import { range } from 'lodash'
import { multicallPolygonv1 } from 'utils/multicall'
import coinCollectNftStakeABI from 'config/abi/coinCollectNftStake.json'
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

    
     
        const getNfts = async () => {

              const calls = range(tokenBalance.toNumber()).map((i) => {
                return {
                  address: nftStakeContractAddress,
                  name: 'tokenOfOwnerByIndex',
                  params: [selectedPid, account, i],
                }
              })
              
              const rawTokenIds = await multicallPolygonv1(coinCollectNftStakeABI, calls)
          
              const parsedTokenIds = rawTokenIds.map((tokenId) => {
                return new BigNumber(tokenId).toJSON()
              })
              
              const tokenIdsNumber = await Promise.all(parsedTokenIds.map(async (id) => {
                
                let meta = null;
                try {
                  //@ts-ignore
                  const tokenURI = await collectionContract.tokenURI(id)
                  meta = await axios(tokenURI)
                  return {tokenId: id, image: meta.data.image.replace("ipfs://", `${IPFS_GATEWAY}/`)}
                } catch (error) {
                  console.log('IPFS link is broken!', error);
                  return {tokenId: id, image: 'images/nfts/no-profile-md.png'}
                }

              }))

              return tokenIdsNumber
        }

        const { data, status, error } = useSWR(isAddress(account) ? [account, selectedPid, 'stakedNftList'] : null, async () => getNfts())

        return { nfts: data ?? [], isLoading: status !== FetchStatus.Fetched, error }
}

