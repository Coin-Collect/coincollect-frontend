import { Activity, NftToken } from 'state/nftMarket/types'
import { getNftsFromCollectionApi, getNftsFromDifferentCollectionsApi } from 'state/nftMarket/helpers'
import uniqBy from 'lodash/uniqBy'
import { pancakeBunniesAddress } from '../../constants'

export const fetchActivityNftMetadata = async (activities: Activity[]): Promise<NftToken[]> => {
  const bunniesAddress = pancakeBunniesAddress.toLowerCase()
  const entries = activities.flatMap(({ nft }) =>
    nft?.collection ? [{ tokenId: nft.tokenId, collectionAddress: nft.collection.id, otherId: nft.otherId }] : [],
  )
  const bunnies = entries.filter(({ collectionAddress }) => collectionAddress.toLowerCase() === bunniesAddress)
  const otherTokens = uniqBy(
    entries.filter(({ collectionAddress }) => collectionAddress.toLowerCase() !== bunniesAddress),
    ({ collectionAddress, tokenId }) => `${collectionAddress.toLowerCase()}:${tokenId}`,
  )
  const [bunnyMetadata, otherMetadata] = await Promise.all([
    bunnies.length > 0 ? getNftsFromCollectionApi(pancakeBunniesAddress).catch(() => null) : null,
    getNftsFromDifferentCollectionsApi(otherTokens),
  ])
  const bunnyTokens = bunnies.flatMap(({ tokenId, collectionAddress, otherId }) => {
    const data = bunnyMetadata?.data[otherId]
    if (!data) return []

    return [{
      ...data,
      tokenId,
      attributes: [{ traitType: 'bunnyId', value: otherId }],
      collectionAddress,
      collectionName: data.collection.name,
    }]
  })
  return otherMetadata.concat(bunnyTokens)
}
