import { useEffect, useMemo, useState } from 'react'
import { Grid, Text, Flex, Button, Heading, Box } from '@pancakeswap/uikit'
import { NftToken } from 'state/nftMarket/types'
import { useTranslation } from 'contexts/Localization'
import { CollectibleLinkCard } from '../../components/CollectibleCard'
import GridPlaceholder from '../../components/GridPlaceholder'
import NoNftsImage from '../../components/Activity/NoNftsImage'
import { groupNftsByCollection, INITIAL_COLLECTION_BATCH, CollectionGroup } from '../utils/groupNftsByCollection'

const UserNfts: React.FC<{ nfts: NftToken[]; isLoading: boolean }> = ({ nfts, isLoading }) => {
  const { t } = useTranslation()

  const groupedCollections = useMemo<CollectionGroup[]>(() => groupNftsByCollection(nfts), [nfts])
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    setVisibleCounts((prev) => {
      const next: Record<string, number> = {}

      groupedCollections.forEach((group) => {
        const current = prev[group.key]
        const defaultCount = Math.min(group.nfts.length, INITIAL_COLLECTION_BATCH)
        next[group.key] = Math.min(group.nfts.length, current ?? defaultCount)
      })

      return next
    })
  }, [groupedCollections])

  const handleCollectionLoadMore = (collectionKey: string) => {
    setVisibleCounts((prev) => {
      const group = groupedCollections.find((item) => item.key === collectionKey)
      if (!group) {
        return prev
      }

      const current = prev[collectionKey] ?? Math.min(group.nfts.length, INITIAL_COLLECTION_BATCH)
      const nextCount = Math.min(group.nfts.length, current + INITIAL_COLLECTION_BATCH)

      if (current === nextCount) {
        return prev
      }

      return { ...prev, [collectionKey]: nextCount }
    })
  }

  return (
    <>
      {/* User has no NFTs */}
      {nfts.length === 0 && !isLoading ? (
        <Flex p="24px" flexDirection="column" alignItems="center">
          <NoNftsImage />
          <Text pt="8px" bold>
            {t('No NFTs found')}
          </Text>
        </Flex>
      ) : // User has NFTs and data has been fetched
      nfts.length > 0 ? (
        groupedCollections.map((group) => {
          const groupName = group.collectionName ?? t('Unknown collection')
          const visibleCount = visibleCounts[group.key] ?? Math.min(group.nfts.length, INITIAL_COLLECTION_BATCH)
          const displayedNfts = group.nfts.slice(0, visibleCount)
          const hasMore = visibleCount < group.nfts.length

          if (displayedNfts.length === 0) {
            return null
          }

          return (
            <Box key={group.key} mb="32px">
              <Flex justifyContent="space-between" alignItems="center" mb="16px">
                <Heading scale="md">{groupName}</Heading>
                <Text color="textSubtle">{t('%count% NFT(s)', { count: group.nfts.length })}</Text>
              </Flex>
              <Grid
                gridGap="16px"
                gridTemplateColumns={['1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)', null, 'repeat(4, 1fr)']}
                alignItems="start"
              >
                {displayedNfts.map((nft) => {
                  const { marketData } = nft

                  return (
                    <CollectibleLinkCard
                      key={`${group.key}-${nft.tokenId}`}
                      nft={nft}
                      currentAskPrice={
                        marketData?.currentAskPrice &&
                        marketData?.isTradable &&
                        parseFloat(marketData.currentAskPrice)
                      }
                    />
                  )
                })}
              </Grid>
              {hasMore && (
                <Flex justifyContent="center" mt="16px">
                  <Button scale="sm" variant="secondary" onClick={() => handleCollectionLoadMore(group.key)}>
                    {t('Load more')}
                  </Button>
                </Flex>
              )}
            </Box>
          )
        })
      ) : (
        // User NFT data hasn't been fetched
        <GridPlaceholder />
      )}
    </>
  )
}

export default UserNfts
