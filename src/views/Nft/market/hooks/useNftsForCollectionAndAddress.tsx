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
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    
    const nftPool = nftFarmsConfig.filter(({ pid }) => pid == selectedPid)[0]
    const collectionAddress = getAddress(nftPool.nftAddresses)
    const collectionContract = useCoinCollectNFTContract(collectionAddress)


    useEffect(() => {
     
        const getNfts = async () => {
            try {
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
              setAllNfts(tokenIdsNumber)
            } catch (error) {
              console.log("promise error")
              console.log(error)
              setErrorMessage("Network error!")
              setAllNfts(null)
            } finally {
              setIsLoading(false)
            }
        }

        if(!allNfts) {
            getNfts()
        }
      
    }, [])
    
    

    return { nfts: allNfts ?? [], isLoading, errorMessage }
}

