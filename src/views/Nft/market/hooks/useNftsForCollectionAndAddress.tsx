import { useWeb3React } from '@web3-react/core'
import axios from 'axios'
import { IPFS_GATEWAY } from 'config'
import { useCoinCollectNFTContract } from "hooks/useContract"
import nftFarmsConfig from 'config/constants/nftFarms'
import { getAddress } from 'utils/addressHelpers'
import useSWR from 'swr'
import { isAddress } from 'utils'
import { FetchStatus } from 'config/constants/types'
import { multicallPolygonv1 } from 'utils/multicall'
import erc721ABI from 'config/abi/erc721.json'


export const useNftsForCollectionAndAddress = (selectedPid: number) => {
    const { account } = useWeb3React()
    
    const nftPool = nftFarmsConfig.filter(({ pid }) => pid == selectedPid)[0]
    const collectionAddress = getAddress(nftPool.nftAddresses)
    const collectionContract = useCoinCollectNFTContract(collectionAddress)


    const getNfts = async () => {
      try {
        const tokenIds = await collectionContract.walletOfOwner(account);
    
        let tokenIdsNumber = [];
    
        if (nftPool["staticNftImage"]) {
          // If staticNftImage exists, use that image directly
          tokenIdsNumber = tokenIds.map((id) => {
            return {
              tokenId: id.toNumber(),
              collectionAddress,
              image: nftPool["staticNftImage"]
            };
          });
        } else {
          // If staticNftImage doesn't exist, get image from blockchain
          const imageCalls = tokenIds.map((id) => {
            return {
              address: collectionAddress,
              name: 'tokenURI',
              params: [id.toNumber()]
            };
          });
    
          const rawTokenURIs = await multicallPolygonv1(erc721ABI, imageCalls);
    
          tokenIdsNumber = await Promise.all(tokenIds.map(async (id, index) => {
            try {
              const tokenURI = rawTokenURIs[index][0];
              const meta = await axios.get(tokenURI);
              return {
                tokenId: id.toNumber(),
                collectionAddress,
                image: meta.data.image.replace("ipfs://", `${IPFS_GATEWAY}/`)
              };
            } catch (error) {
              console.log('IPFS link is broken!', error);
              return {
                tokenId: id.toNumber(),
                collectionAddress,
                image: 'images/nfts/no-profile-md.png'
              };
            }
          }));
        }
    
        console.log("promise done");
        return tokenIdsNumber;
      } catch (error) {
        console.log('Error fetching NFTs:', error);
        throw error; // Re-throw the error to trigger SWR's error handling
      }
    };
    

        const { data, status, error, mutate } = useSWR(isAddress(account) ? [account, selectedPid, 'unstakedNftList'] : null, async () => getNfts(), {
          onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
            if (retryCount < 3) {
              // Retry the SWR request up to 3 times on error
              setTimeout(() => revalidate({ retryCount: retryCount + 1 }), 1000);
            }
          },
        });

    return { nfts: data ?? [], isLoading: status !== FetchStatus.Fetched, error, revalidateNfts: mutate }
}
