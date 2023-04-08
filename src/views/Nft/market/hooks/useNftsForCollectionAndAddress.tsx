import { useCoinCollectNFTContract } from "hooks/useContract"
import { useState } from "react"

export const useNftsForCollectionAndAddress = async (collectionAddress: string, account: string) => {
    
   const collectionContract = useCoinCollectNFTContract(collectionAddress)
   const res = await collectionContract.walletOfOwner(account)
   
            
   return 5
  
}

