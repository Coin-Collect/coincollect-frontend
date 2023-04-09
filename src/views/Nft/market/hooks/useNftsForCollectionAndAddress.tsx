import { useWeb3React } from '@web3-react/core'
import axios from 'axios'
import { IPFS_GATEWAY } from 'config'
import { useCoinCollectNFTContract } from "hooks/useContract"
import { useEffect, useState } from "react"
import nftFarmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'


export const useNftsForCollectionAndAddress = (selectedPid: number) => {
    const { account } = useWeb3React()
    const [isLoading, setIsLoading] = useState(true)
    const [allNfts, setAllNfts] = useState<{tokenId: number; image: any;}[]>(null)
    
    const nftPool = nftFarmsConfig.filter(({ pid }) => pid ==selectedPid )[0]
    const collectionAddress = getAddress(nftPool.nftAddresses)
    const collectionContract = useCoinCollectNFTContract(collectionAddress)

    useEffect(() => {
     
        const getNfts = async () => {
            try {
              const tokenIds = await collectionContract.walletOfOwner(account)

              const tokenIdsNumber = await  Promise.all(tokenIds.map(async (id) => {

                //@ts-ignore
                const tokenURI = await collectionContract.tokenURI(id.toNumber())
                const meta = await axios(tokenURI)

                return {tokenId: id.toNumber(), image: meta.data.image.replace("ipfs:", IPFS_GATEWAY)}
              }))
              
              setAllNfts(tokenIdsNumber)
            } catch (error) {
              setAllNfts(null)
            } finally {
              setIsLoading(false)
            }
        }

        if(!allNfts) {
            getNfts()
        }
      
    }, [allNfts])
    
    

    return { nfts: allNfts ?? [], isLoading }
}

