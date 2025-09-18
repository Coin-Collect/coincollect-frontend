import { useMemo } from 'react'
import isEmpty from 'lodash/isEmpty'
import { useGetCollections } from 'state/nftMarket/hooks'
import { ApiCollections, NftLocation, NftToken, TokenIdWithCollectionAddress } from 'state/nftMarket/types'
import { Profile } from 'state/types'
import { isAddress } from 'utils'
import useSWR from 'swr'
import { FetchStatus } from 'config/constants/types'
import { laggyMiddleware } from 'hooks/useSWRContract'
import { multicallPolygonv2 } from 'utils/multicall'
import coinCollectNftAbi from 'config/abi/coinCollectNft.json'
import { combineNftMarketAndMetadata, walletOfOwnerApi } from 'state/nftMarket/helpers'
import axios from 'axios'
import { IPFS_GATEWAY } from 'config'
import erc721ABI from 'config/abi/erc721.json'
import nftFarms from 'config/constants/nftFarms'
import { ChainId } from '@coincollect/sdk'

const useNftsForAddress = (account: string, profile: Profile, isProfileFetching: boolean) => {
  const { data: collections } = useGetCollections()

  const hasProfileNft = profile?.tokenId
  const profileNftTokenId = profile?.tokenId?.toString()
  const profileNftCollectionAddress = profile?.collectionAddress

  const profileNftWithCollectionAddress = useMemo(() => {
    if (hasProfileNft) {
      return {
        tokenId: profileNftTokenId,
        collectionAddress: profileNftCollectionAddress,
        nftLocation: NftLocation.PROFILE,
      }
    }
    return null
  }, [profileNftTokenId, profileNftCollectionAddress, hasProfileNft])

  const { status, data, mutate } = useSWR(
    !isProfileFetching && !isEmpty(collections) && isAddress(account) ? [account, 'userNfts'] : null,
    async () => getCompleteAccountNftData(account, collections, profileNftWithCollectionAddress),
    { use: [laggyMiddleware] },
  )

  return { nfts: data ?? [], isLoading: status !== FetchStatus.Fetched, refresh: mutate }
}

export default useNftsForAddress


type WalletTokenWithCollectionAddress = TokenIdWithCollectionAddress & { symbol?: string }

type CollectionCandidate = {
  address: string
  symbol?: string
}

const ACTIVE_CHAIN_ID = (() => {
  const envChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID)
  return Number.isFinite(envChainId) && envChainId > 0 ? envChainId : ChainId.POLYGON
})()

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


const getCompleteAccountNftData = async (
  account: string,
  collections: ApiCollections,
  profileNftWithCollectionAddress?: TokenIdWithCollectionAddress,
): Promise<NftToken[]> => {
  const walletNftIdsWithCollectionAddress = await fetchWalletTokenIdsForCollections(account, collections)
  
  if (profileNftWithCollectionAddress?.tokenId) {
    walletNftIdsWithCollectionAddress.unshift(profileNftWithCollectionAddress)
  }
  

  const walletTokenIds = walletNftIdsWithCollectionAddress
    .filter((walletNft) => {
      // Profile Pic NFT is no longer wanted in this array, hence the filter
      return profileNftWithCollectionAddress?.tokenId !== walletNft.tokenId
    })
    .map((nft) => nft.tokenId)

  

  const metadataForAllNfts = await getNftsFromDifferentCollectionsApi([
    //...forSaleNftIds,
    ...walletNftIdsWithCollectionAddress,
  ])


  const completeNftData = combineNftMarketAndMetadata(
    metadataForAllNfts,
    [],//marketDataForSaleNfts,
    [],//walletNftsWithMarketData,
    walletTokenIds,
    [],//tokenIdsForSale,
    profileNftWithCollectionAddress?.tokenId,
  )


  return completeNftData
}

export const fetchWalletTokenIdsForCollections = async (
  account: string,
  collections: ApiCollections,
): Promise<WalletTokenWithCollectionAddress[]> => {
  const collectionList: CollectionCandidate[] = []
  const collectionMetaByAddress = new Map<string, CollectionCandidate>()

  Object.values(collections ?? {}).forEach((collection) => {
    const collectionAddress = collection?.address
    if (!collectionAddress) {
      return
    }
    const normalizedAddress = collectionAddress.toLowerCase()
    if (collectionMetaByAddress.has(normalizedAddress)) {
      return
    }
    const candidate: CollectionCandidate = {
      address: collectionAddress,
      symbol: collection?.symbol,
    }
    collectionMetaByAddress.set(normalizedAddress, candidate)
    collectionList.push(candidate)
  })

  nftFarms.forEach((farm) => {
    const collectionAddress = farm?.nftAddresses?.[ACTIVE_CHAIN_ID]
    if (!collectionAddress) {
      return
    }
    const normalizedAddress = collectionAddress.toLowerCase()
    if (collectionMetaByAddress.has(normalizedAddress)) {
      return
    }
    const candidate: CollectionCandidate = {
      address: collectionAddress,
      symbol: farm?.lpSymbol,
    }
    collectionMetaByAddress.set(normalizedAddress, candidate)
    collectionList.push(candidate)
  })

  if (collectionList.length === 0) {
    return []
  }

  const tokenIdCalls = collectionList.map((collection) => {
    const { address: collectionAddress } = collection

    return {
      address: collectionAddress,
      name: 'walletOfOwner',
      params: [account],
    }
  })

  let tokenIdResultRaw

  try {
    tokenIdResultRaw = await multicallPolygonv2(coinCollectNftAbi, tokenIdCalls, { requireSuccess: false })
  } catch (error) {
    console.error('Failed to fetch wallet NFT token IDs via multicall', error)
    return []
  }

  const nftLocation = NftLocation.WALLET
  const fallbackCollections: CollectionCandidate[] = []
  const fallbackAddresses = new Set<string>()
  const seenTokens = new Set<string>()

  const walletNfts = tokenIdResultRaw.reduce<WalletTokenWithCollectionAddress[]>((acc, tokenIdResult, index) => {
    if (!tokenIdResult) {
      const fallbackMeta = collectionList[index]
      if (fallbackMeta && !fallbackAddresses.has(fallbackMeta.address)) {
        fallbackCollections.push(fallbackMeta)
        fallbackAddresses.add(fallbackMeta.address)
      }
      return acc
    }

    const [tokenIds] = tokenIdResult as [Array<{ toString(): string }>]

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      const fallbackMeta = collectionList[index]
      if (fallbackMeta && !fallbackAddresses.has(fallbackMeta.address)) {
        fallbackCollections.push(fallbackMeta)
        fallbackAddresses.add(fallbackMeta.address)
      }
      return acc
    }

    const { address: collectionAddress } = tokenIdCalls[index]
    const collectionMeta = collectionList[index]

    tokenIds.forEach((tokenIdBn) => {
      if (!tokenIdBn) {
        return
      }

      const tokenId = tokenIdBn.toString()

      if (!tokenId) {
        return
      }

      const dedupeKey = `${collectionAddress.toLowerCase()}-${tokenId}`
      if (seenTokens.has(dedupeKey)) {
        return
      }

      seenTokens.add(dedupeKey)

      acc.push({
        tokenId,
        collectionAddress,
        nftLocation,
        symbol: collectionMeta?.['symbol'],
      })
    })

    return acc
  }, [])

  if (fallbackCollections.length > 0) {
    try {
      const fallbackTokens = await walletOfOwnerApi(
        account,
        fallbackCollections.map((collection) => collection.address),
      )

      if (Array.isArray(fallbackTokens)) {
        fallbackTokens.forEach((token) => {
          const tokenId = token?.tokenId?.toString?.()
          const collectionAddress = token?.collectionAddress

          if (!tokenId || !collectionAddress) {
            return
          }

          const collectionMeta = collectionMetaByAddress.get(collectionAddress.toLowerCase())

          const dedupeKey = `${collectionAddress.toLowerCase()}-${tokenId}`
          if (seenTokens.has(dedupeKey)) {
            return
          }

          seenTokens.add(dedupeKey)

          walletNfts.push({
            tokenId,
            collectionAddress,
            nftLocation,
            symbol: collectionMeta?.symbol,
          })
        })
      }
    } catch (error) {
      console.error('Failed to fetch wallet NFT token IDs via API fallback', error)
    }
  }

  return walletNfts
}

export const getNftsFromDifferentCollectionsApi = async (
  from: { collectionAddress: string; tokenId: string }[],
): Promise<NftToken[]> => {

  const imageCalls = from.map((token) => {
    return {
      address: token.collectionAddress,
      name: 'tokenURI',
      params: [token.tokenId],
    }
  })

  let rawTokenURIs

  try {
    rawTokenURIs = await multicallPolygonv2(erc721ABI, imageCalls, { requireSuccess: false })
  } catch (error) {
    console.error('Failed to fetch NFT metadata via multicall', error)
    rawTokenURIs = []
  }
  
  const items = await Promise.all(from.map(async (token, index) => {

    let meta = null;
    try {
      const tokenUriResult = rawTokenURIs?.[index]
      const tokenURI = Array.isArray(tokenUriResult) ? tokenUriResult[0] : null
      const metadataUrl = normalizeIpfsUri(tokenURI) ?? tokenURI

      if (!metadataUrl) {
        throw new Error('Missing tokenURI')
      }

      meta = await axios.get(metadataUrl)
      return {
        tokenId: token.tokenId,
        name: meta.data.name,
        collectionName: token.symbol,
        collectionAddress: token.collectionAddress,
        description: meta.data.description,
        attributes: meta.data.attributes ?? [],
        image: {
          original: normalizeIpfsUri(meta.data.image) ?? meta.data.image,
          thumbnail: normalizeIpfsUri(meta.data.image) ?? meta.data.image,
        }
      }
   } catch (error) {
      console.log('IPFS link is broken!', error);
      return {
        tokenId: token.tokenId,
        name: "Name data cannot be fetched",
        collectionName: token.symbol,
        collectionAddress: token.collectionAddress,
        description: "Description data cannot be fetched",
        attributes: [],
        image: {
          original: 'images/nfts/no-profile-md.png',
          thumbnail: 'images/nfts/no-profile-md.png',
        }
      }
   }



  }))
  
  return items
}
