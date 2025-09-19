import { NftToken } from 'state/nftMarket/types'

export interface CollectionGroup {
  key: string
  collectionAddress?: string
  collectionName?: string
  nfts: NftToken[]
}

export const INITIAL_COLLECTION_BATCH = 4

export const groupNftsByCollection = (nfts: NftToken[]): CollectionGroup[] => {
  if (!Array.isArray(nfts) || nfts.length === 0) {
    return []
  }

  const groups: Record<string, CollectionGroup> = {}
  const order: string[] = []

  nfts.forEach((nft) => {
    const collectionAddress = nft.collectionAddress?.toLowerCase()
    const fallbackKey = nft.collectionName?.toLowerCase() ?? nft.tokenId
    const groupKey = collectionAddress ?? fallbackKey

    if (!groupKey) {
      return
    }

    if (!groups[groupKey]) {
      groups[groupKey] = {
        key: groupKey,
        collectionAddress: nft.collectionAddress,
        collectionName: nft.collectionName,
        nfts: [],
      }
      order.push(groupKey)
    }

    const group = groups[groupKey]
    if (!group.collectionName && nft.collectionName) {
      group.collectionName = nft.collectionName
    }
    if (!group.collectionAddress && nft.collectionAddress) {
      group.collectionAddress = nft.collectionAddress
    }

    group.nfts.push(nft)
  })

  return order.map((key) => groups[key]).filter((group) => group && group.nfts.length > 0)
}

