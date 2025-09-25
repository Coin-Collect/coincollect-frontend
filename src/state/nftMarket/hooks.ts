import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useAppDispatch } from 'state'
import { pancakeBunniesAddress } from 'views/Nft/market/constants'
import { isAddress } from 'utils'
import erc721Abi from 'config/abi/erc721.json'
import { useSWRMulticall } from 'hooks/useSWRContract'
import { EMPTY_ARRAY, EMPTY_OBJECT } from 'utils/constantObjects'
import { getPancakeProfileAddress } from 'utils/addressHelpers'
import useSWR from 'swr'
import useSWRImmutable from 'swr/immutable'
import isEmpty from 'lodash/isEmpty'
import shuffle from 'lodash/shuffle'
import { FetchStatus } from 'config/constants/types'

import { fetchNewPBAndUpdateExisting } from './reducer'
import { State } from '../types'
import { ApiCollections, NftActivityFilter, NftFilter, NftToken, Collection, MintingActivity } from './types'
import { getCollection, getCollections, getLastMintedNft, mintingActivityApi } from './helpers'
import BigNumber from 'bignumber.js'

const DEFAULT_NFT_ORDERING = { field: 'currentAskPrice', direction: 'asc' as 'asc' | 'desc' }
const DEFAULT_NFT_ACTIVITY_FILTER = { typeFilters: [], collectionFilters: [] }

// Returns a function that fetches more NFTs for specified bunny id
// as well as updating existing PB NFTs in state
// Note: PancakeBunny specific
export const useFetchByBunnyIdAndUpdate = (bunnyId: string) => {
  const dispatch = useAppDispatch()

  const { latestPancakeBunniesUpdateAt, isUpdatingPancakeBunnies } = useSelector(
    (state: State) => state.nftMarket.data.loadingState,
  )

  // Extra guard in case market data shifts
  // we don't wanna fetch same tokens multiple times
  const existingBunniesInState = useGetAllBunniesByBunnyId(bunnyId)
  const existingTokensWithBunnyId = existingBunniesInState ? existingBunniesInState.map((nft) => nft.tokenId) : []

  const allPancakeBunnies = useNftsFromCollection(pancakeBunniesAddress)
  const allExistingPBTokenIds = allPancakeBunnies ? allPancakeBunnies.map((nft) => nft.tokenId) : []

  const firstBunny = existingBunniesInState.length > 0 ? existingBunniesInState[0] : null

  // If we already have NFT with this bunny id in state - we can reuse its metadata without making API request
  const existingMetadata = useMemo(() => {
    return firstBunny
      ? {
          name: firstBunny.name,
          description: firstBunny.description,
          collection: { name: firstBunny.collectionName },
          image: firstBunny.image,
        }
      : null
  }, [firstBunny])

  // This fetches more bunnies when called
  const fetchMorePancakeBunnies = (orderDirection: 'asc' | 'desc') => {
    dispatch(
      fetchNewPBAndUpdateExisting({
        bunnyId,
        existingTokensWithBunnyId,
        allExistingPBTokenIds,
        existingMetadata,
        orderDirection,
      }),
    )
  }

  return { isUpdatingPancakeBunnies, latestPancakeBunniesUpdateAt, fetchMorePancakeBunnies }
}

export const useLoadingState = () => {
  return useSelector((state: State) => state.nftMarket.data.loadingState)
}

export const useGetCollections = (): { data: ApiCollections; status: FetchStatus } => {
  const { data, error } = useSWR(['nftMarket', 'collections'], async () => getCollections())
  const collections = data ?? ({} as ApiCollections)
  const status: FetchStatus = error
    ? FetchStatus.Failed
    : data === undefined
    ? FetchStatus.Fetching
    : FetchStatus.Fetched
  return { data: collections as unknown as ApiCollections, status }
}

export const useGetCollection = (collectionAddress: string): Collection | undefined => {
  const checksummedCollectionAddress = isAddress(collectionAddress) || ''
  const { data } = useSWR(
    checksummedCollectionAddress ? ['nftMarket', 'collections', checksummedCollectionAddress.toLowerCase()] : null,
    async () => getCollection(checksummedCollectionAddress),
  )
  const collectionObject = data ?? {}
  return collectionObject[checksummedCollectionAddress]
}

export const useGetShuffledCollections = (): { data: ApiCollections; status: FetchStatus } => {
  const { data, error } = useSWRImmutable(['nftMarket', 'collections'], async () => getCollections())
  const collections = data ?? ({} as ApiCollections)

  // Compute status from the primary fetch
  const status: FetchStatus = error
    ? FetchStatus.Failed
    : data === undefined
    ? FetchStatus.Fetching
    : FetchStatus.Fetched

  // Shuffle deterministically when data is available; avoid second SWR indirection
  const shuffled = useMemo(() => {
    if (!isEmpty(collections)) {
      return shuffle(collections as unknown as any[])
    }
    return collections
  }, [collections])

  return { data: shuffled as unknown as ApiCollections, status }
}

export const useNftsFromCollection = (collectionAddress: string) => {
  const checksummedCollectionAddress = isAddress(collectionAddress) || ''
  const nfts: NftToken[] = useSelector((state: State) => state.nftMarket.data.nfts[checksummedCollectionAddress])
  return nfts
}

export const useGetAllBunniesByBunnyId = (bunnyId: string) => {
  const nfts: NftToken[] = useSelector((state: State) => state.nftMarket.data.nfts[pancakeBunniesAddress])
  return nfts ? nfts.filter((nft) => nft.attributes[0].value === bunnyId && nft.marketData.isTradable) : EMPTY_ARRAY
}

export const useApprovalNfts = (nftsInWallet: NftToken[]) => {
  const nftApprovalCalls = useMemo(
    () =>
      nftsInWallet.map((nft: NftToken) => {
        const { tokenId, collectionAddress } = nft

        return {
          address: collectionAddress,
          name: 'getApproved',
          params: [tokenId],
        }
      }),
    [nftsInWallet],
  )

  const { data } = useSWRMulticall(erc721Abi, nftApprovalCalls)

  const approvedTokenIds = Array.isArray(data)
    ? data
        .flat()
        .reduce(
          (acc, address, index) => ({ ...acc, [nftsInWallet[index].tokenId]: getPancakeProfileAddress() === address }),
          {},
        )
    : null

  return { data: approvedTokenIds }
}

export const useGetNftFilters = (collectionAddress: string) => {
  const collectionFilter: NftFilter = useSelector((state: State) => state.nftMarket.data.filters[collectionAddress])
  return collectionFilter ? collectionFilter.activeFilters : EMPTY_OBJECT
}

export const useGetNftFilterLoadingState = (collectionAddress: string) => {
  const collectionFilter: NftFilter = useSelector((state: State) => state.nftMarket.data.filters[collectionAddress])
  return collectionFilter ? collectionFilter.loadingState : FetchStatus.Idle
}

export const useGetNftOrdering = (collectionAddress: string) => {
  const collectionFilter: NftFilter = useSelector((state: State) => state.nftMarket.data.filters[collectionAddress])
  return collectionFilter ? collectionFilter.ordering : DEFAULT_NFT_ORDERING
}

export const useGetNftShowOnlyOnSale = (collectionAddress: string) => {
  const collectionFilter: NftFilter = useSelector((state: State) => state.nftMarket.data.filters[collectionAddress])
  return collectionFilter ? collectionFilter.showOnlyOnSale : true
}

export const useTryVideoNftMedia = () => {
  const tryVideoNftMedia = useSelector((state: State) => state.nftMarket.data.tryVideoNftMedia)
  return tryVideoNftMedia ?? true
}

export const useGetNftActivityFilters = (collectionAddress: string) => {
  const collectionFilter: NftActivityFilter = useSelector(
    (state: State) => state.nftMarket.data.activityFilters[collectionAddress],
  )
  return collectionFilter || DEFAULT_NFT_ACTIVITY_FILTER
}

export const useMintingActivity = (
  collectionAddress: string,
) => {

  const { data, status, error, mutate } = useSWR(
    [collectionAddress, 'mintingActivities'], 
    async () => mintingActivityApi(collectionAddress), {
    //refreshInterval: 60 * 1000,
    revalidateIfStale: false,
    revalidateOnFocus: false,
  });

  const processedData: MintingActivity[] = data && !data["error"] ? data["result"]["transfers"].map(({ tokenId, asset, hash, from, to, rawContract, metadata }) => ({
    tokenId: new BigNumber(tokenId).toString(),
    asset,
    marketEvent: "Minted",
    tx: hash,
    from,
    to,
    address: rawContract?.address,
    timestamp: metadata?.blockTimestamp
  })) : [];

  return { activities: processedData, isLoading: status !== FetchStatus.Fetched, error, refresh: mutate }

}

export const useLastMintedNft = (
  ownerAddress: string,
  collectionAddress: string,
  chainId: number
) => {

  const { data, status, error, mutate, isValidating } = useSWR(
    [collectionAddress, 'lastMintedNft'], 
    async () => getLastMintedNft(ownerAddress, collectionAddress, chainId), {
    revalidateOnFocus: false,
    revalidateIfStale: true,
    revalidateOnReconnect: false
  });

  return { lastMintedNft: data ?? null, isLoading: status !== FetchStatus.Fetched, error, isValidating }

}
