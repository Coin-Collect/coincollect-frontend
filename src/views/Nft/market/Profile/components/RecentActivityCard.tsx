import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Card, CardBody, Flex, Heading, Skeleton, Text } from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { formatDistanceToNowStrict } from 'date-fns'
import { isAddress } from 'utils'
import { getUserActivity } from 'state/nftMarket/helpers'
import { Activity, NftToken } from 'state/nftMarket/types'
import ActivityEventText from 'views/Nft/market/components/Activity/ActivityEventText'
import { nftsBaseUrl } from 'views/Nft/market/constants'
import { fetchActivityNftMetadata } from '../../ActivityHistory/utils/fetchActivityNftMetadata'
import { sortUserActivity } from '../utils/sortUserActivity'

const MAX_RECENT_ACTIVITIES = 4

interface RecentActivityCardProps {
  accountAddress: string
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ accountAddress }) => {
  const { t } = useTranslation()
  const [activities, setActivities] = useState<Activity[]>([])
  const [isActivityLoading, setIsActivityLoading] = useState(true)
  const [nftMetadata, setNftMetadata] = useState<Record<string, NftToken>>({})
  const [isMetadataLoading, setIsMetadataLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchRecentActivity = async () => {
      if (!accountAddress || !isAddress(accountAddress)) {
        if (isMounted) {
          setActivities([])
          setIsActivityLoading(false)
        }
        return
      }

      try {
        setIsActivityLoading(true)
        const userActivity = await getUserActivity(accountAddress.toLowerCase())
        if (!isMounted) {
          return
        }
        const sortedActivity = sortUserActivity(accountAddress, userActivity)
        setActivities(sortedActivity.slice(0, MAX_RECENT_ACTIVITIES))
      } catch (error) {
        console.error('Failed to fetch recent activity', error)
        if (isMounted) {
          setActivities([])
        }
      } finally {
        if (isMounted) {
          setIsActivityLoading(false)
        }
      }
    }

    fetchRecentActivity()

    return () => {
      isMounted = false
    }
  }, [accountAddress])

  useEffect(() => {
    let isMounted = true

    const fetchMetadata = async () => {
      if (!activities.length) {
        if (isMounted) {
          setNftMetadata({})
          setIsMetadataLoading(false)
        }
        return
      }

      try {
        setIsMetadataLoading(true)
        const metadata = await fetchActivityNftMetadata(activities)
        if (!isMounted) {
          return
        }
        const metadataMap = metadata.reduce<Record<string, NftToken>>((accum, nft) => {
          if (!nft?.tokenId) {
            return accum
          }
          const collectionAddress = nft.collectionAddress?.toLowerCase() ?? ''
          const key = `${collectionAddress}-${nft.tokenId}`
          accum[key] = nft
          return accum
        }, {})
        setNftMetadata(metadataMap)
      } catch (error) {
        console.error('Failed to fetch recent activity metadata', error)
        if (isMounted) {
          setNftMetadata({})
        }
      } finally {
        if (isMounted) {
          setIsMetadataLoading(false)
        }
      }
    }

    fetchMetadata()

    return () => {
      isMounted = false
    }
  }, [activities])

  const activityHref = useMemo(() => {
    return accountAddress ? `${nftsBaseUrl}/profile/${accountAddress}/activity` : nftsBaseUrl
  }, [accountAddress])

  const isLoading = isActivityLoading || isMetadataLoading

  const renderSkeleton = () => {
    return (
      <Box>
        {Array.from({ length: MAX_RECENT_ACTIVITIES }).map((_, index) => (
          <Box key={`recent-activity-skeleton-${index}`} mb={index === MAX_RECENT_ACTIVITIES - 1 ? '0' : '12px'}>
            <Skeleton height="32px" />
          </Box>
        ))}
      </Box>
    )
  }

  const renderActivityRows = () => {
    if (!activities.length) {
      return <Text color="textSubtle">{t('No NFT market history found')}</Text>
    }

    return activities.map((activity, index) => {
      const collectionId = activity.nft.collection?.id?.toLowerCase() ?? ''
      const metadataKey = `${collectionId}-${activity.nft.tokenId}`
      const nft = nftMetadata[metadataKey]
      const nftName = nft?.name ?? `#${activity.nft.tokenId}`
      const collectionName = nft?.collectionName ?? activity.nft.collection?.id ?? '-'
      const timestamp = Number(activity.timestamp) * 1000
      const formattedTime = Number.isFinite(timestamp) && timestamp > 0
        ? formatDistanceToNowStrict(timestamp, { addSuffix: true })
        : '-'

      return (
        <Box key={`${activity.tx}-${activity.timestamp}`} mb={index === activities.length - 1 ? '0' : '16px'}>
          <Flex alignItems="center" flexWrap="wrap">
            <ActivityEventText marketEvent={activity.marketEvent} fontWeight={600} mr="8px" />
            <Text bold>{nftName}</Text>
          </Flex>
          <Text fontSize="12px" color="textSubtle">
            {collectionName}
          </Text>
          <Text fontSize="12px" color="textSubtle">
            {formattedTime}
          </Text>
        </Box>
      )
    })
  }

  return (
    <Card>
      <CardBody>
        <Flex alignItems="center" justifyContent="space-between" mb="16px">
          <Heading scale="md">{t('Recent activity')}</Heading>
          <Button as={NextLinkFromReactRouter} variant="text" scale="sm" to={activityHref} px="0">
            {t('View all activity')}
          </Button>
        </Flex>
        {isLoading ? renderSkeleton() : renderActivityRows()}
      </CardBody>
    </Card>
  )
}

export default RecentActivityCard
