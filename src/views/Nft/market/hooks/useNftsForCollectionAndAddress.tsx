import useWeb3React from 'hooks/useWeb3React'
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
import { walletOfOwnerApi } from 'state/nftMarket/helpers'

const FALLBACK_IMAGE = '/images/nfts/no-profile-md.png'
const FALLBACK_COLLECTION_NAME = 'Unknown Collection'

const normalizeIpfsUri = (uri?: string | null) => {
  if (!uri) {
    return undefined
  }

  if (uri.startsWith('ipfs://ipfs/')) {
    return uri.replace('ipfs://ipfs/', `${IPFS_GATEWAY}/`)
  }

  if (uri.startsWith('ipfs://')) {
    return uri.replace('ipfs://', `${IPFS_GATEWAY}/`)
  }

  if (uri.startsWith('ipfs/')) {
    return uri.replace('ipfs/', `${IPFS_GATEWAY}/`)
  }

  return uri
}


export const useNftsForCollectionAndAddress = (selectedPid: number) => {
    const { account } = useWeb3React()
    
    const nftPool = nftFarmsConfig.filter(({ pid }) => pid == selectedPid)[0]
    const collectionAddress = getAddress(nftPool.nftAddresses)
    const collectionContract = useCoinCollectNFTContract(collectionAddress)
    const resolveCollectionName = async () => {
      try {
        const name = await collectionContract.name()
        return name || nftPool?.lpSymbol || FALLBACK_COLLECTION_NAME
      } catch (error) {
        return nftPool?.lpSymbol || FALLBACK_COLLECTION_NAME
      }
    }


    const getNfts = async () => {
      try {
        const collectionName = await resolveCollectionName()
        const nftData = nftPool["useApi"] ? await walletOfOwnerApi(account, [collectionAddress]) : await collectionContract.walletOfOwner(account);
        const tokenIds = nftPool["useApi"] ? nftData.map(nft => nft.tokenId) : nftData;
    
        let tokenIdsNumber = [];
    
        if (nftPool["staticNftImage"]) {
          // If staticNftImage exists, use that image directly
          tokenIdsNumber = tokenIds.map((id) => {
            return {
              tokenId: id.toString(),
              collectionAddress,
              image: normalizeIpfsUri(nftPool["staticNftImage"]) ?? FALLBACK_IMAGE,
              collectionName,
            };
          });
        } else if (nftPool["useApi"]) {
          tokenIdsNumber = nftData.map(nft => ({
            tokenId: nft.tokenId.toString(),
            collectionAddress,
            image: normalizeIpfsUri(nft.media?.["thumbnail"]) ?? FALLBACK_IMAGE,
            collectionName,
          }));
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
              const metadataUrl = normalizeIpfsUri(tokenURI) ?? tokenURI
              const meta = await axios.get(metadataUrl);
              const rawImage = meta.data?.image ?? meta.data?.image_url ?? meta.data?.imageUrl
              const image = normalizeIpfsUri(rawImage) ?? FALLBACK_IMAGE
              return {
                tokenId: id.toNumber(),
                collectionAddress,
                image,
                collectionName,
              };
            } catch (error) {
              console.log('IPFS link is broken!', error);
              return {
                tokenId: id.toNumber(),
                collectionAddress,
                image: FALLBACK_IMAGE,
                collectionName,
              };
            }
          }));
        }

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
