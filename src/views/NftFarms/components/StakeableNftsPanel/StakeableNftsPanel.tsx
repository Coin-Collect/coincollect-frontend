import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Skeleton,
  Text,
  Image,
} from '@pancakeswap/uikit'
import { useTranslation } from 'contexts/Localization'
import { NextLinkFromReactRouter } from 'components/NextLink'
import { StakeableFarmWithNfts } from 'views/NftFarms/hooks/useDashboard'
import { NftToken } from 'state/nftMarket/types'

interface StakeableNftsPanelProps {
  account?: string | null
  isLoading: boolean
  stakeableFarms: StakeableFarmWithNfts[]
  totalEligibleNfts: number
  error?: unknown
  onRetry?: () => Promise<NftToken[] | undefined>
  maxInitialFarms?: number
  nftPreviewCount?: number
}

const PanelWrapper = styled(Card)`
  border-radius: 24px;
  padding: 24px;
  margin-bottom: 24px;
`

const Header = styled(Flex)`
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`

const FarmGroup = styled(Box)`
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 18px;
  overflow: hidden;
  margin-top: 24px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
`

const FarmBanner = styled(Box)<{ $backgroundUrl?: string }>`
  position: relative;
  min-height: 120px;
  background: ${({ theme }) => theme.colors.gradients.cardHeader};
  ${({ $backgroundUrl }) =>
    $backgroundUrl
      ? `background-image: linear-gradient(0deg, rgba(23, 11, 43, 0.5), rgba(23, 11, 43, 0.5)), url(${$backgroundUrl});
          background-size: cover;
          background-position: center;`
      : ''};
`

const FarmAvatar = styled(Image)`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 3px solid ${({ theme }) => theme.colors.backgroundAlt};
  position: absolute;
  bottom: -36px;
  left: 24px;
  background-color: ${({ theme }) => theme.colors.backgroundAlt};
`

const FarmContent = styled(Box)`
  padding: 48px 24px 24px;
`

const NftList = styled(Flex)`
  flex-wrap: wrap;
  gap: 12px;
`

const NftThumbnail = styled(Image)`
  width: 72px;
  height: 72px;
  border-radius: 16px;
  object-fit: cover;
  background: ${({ theme }) => theme.colors.backgroundAlt2};
`

const FooterActions = styled(Flex)`
  margin-top: 24px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`

const DEFAULT_FARMS_PREVIEW = 3
const DEFAULT_NFT_PREVIEW_COUNT = 4
const FALLBACK_NFT_IMAGE = '/images/nfts/no-profile-md.png'
const EXPLORE_COLLECTIONS_URL = '/nfts/collections'

const resolveImage = (nft: NftToken): string => {
  if (nft?.image?.thumbnail) {
    return nft.image.thumbnail
  }
  if (nft?.image?.original) {
    return nft.image.original
  }
  return FALLBACK_NFT_IMAGE
}

const extractErrorMessage = (error?: unknown): string | null => {
  if (!error) {
    return null
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return null
}

const StakeableNftsPanel: React.FC<StakeableNftsPanelProps> = ({
  account,
  isLoading,
  stakeableFarms,
  totalEligibleNfts,
  error,
  onRetry,
  maxInitialFarms = DEFAULT_FARMS_PREVIEW,
  nftPreviewCount = DEFAULT_NFT_PREVIEW_COUNT,
}) => {
  const { t } = useTranslation()
  const [visibleFarmCount, setVisibleFarmCount] = useState(maxInitialFarms)
  const [expandedFarms, setExpandedFarms] = useState<Record<number, boolean>>({})

  const errorMessage = extractErrorMessage(error)
  const hasAccount = Boolean(account)

  useEffect(() => {
    setVisibleFarmCount(maxInitialFarms)
  }, [maxInitialFarms, stakeableFarms.length])

  const farmsToRender = useMemo(
    () => stakeableFarms.slice(0, visibleFarmCount),
    [stakeableFarms, visibleFarmCount],
  )

  const hasMoreFarms = stakeableFarms.length > visibleFarmCount

  const handleToggleFarm = (pid: number) => {
    setExpandedFarms((prev) => ({ ...prev, [pid]: !prev[pid] }))
  }

  const renderLoading = () => (
    <PanelWrapper>
      <Header>
        <Heading scale="md">{t('NFTs ready to stake')}</Heading>
      </Header>
      <Box mt="24px">
        <Skeleton height="120px" mb="16px" />
        <Skeleton height="120px" mb="16px" />
        <Skeleton height="120px" />
      </Box>
    </PanelWrapper>
  )

  if (!hasAccount) {
    return (
      <PanelWrapper>
        <Header>
          <Heading scale="md">{t('NFTs ready to stake')}</Heading>
        </Header>
        <Text mt="16px" color="textSubtle">
          {t('Connect your wallet to see which NFTs you can start staking.')}
        </Text>
      </PanelWrapper>
    )
  }

  if (isLoading) {
    return renderLoading()
  }

  if (errorMessage) {
    return (
      <PanelWrapper>
        <Header>
          <Heading scale="md">{t('NFTs ready to stake')}</Heading>
        </Header>
        <Text mt="16px" color="failure">
          {t('We couldn’t load your NFTs. %message%', { message: errorMessage })}
        </Text>
        <FooterActions>
          {onRetry && (
            <Button variant="secondary" onClick={() => onRetry()}>
              {t('Try again')}
            </Button>
          )}
          <Button as={NextLinkFromReactRouter} to={EXPLORE_COLLECTIONS_URL} variant="text">
            {t('Explore collections')}
          </Button>
        </FooterActions>
      </PanelWrapper>
    )
  }

  if (stakeableFarms.length === 0) {
    return (
      <PanelWrapper>
        <Header>
          <Heading scale="md">{t('NFTs ready to stake')}</Heading>
        </Header>
        <Text mt="16px" color="textSubtle">
          {t('You don’t have any NFTs that can be staked right now. Discover new collections to mint or trade.')}
        </Text>
        <Button as={NextLinkFromReactRouter} to={EXPLORE_COLLECTIONS_URL} mt="16px">
          {t('Discover collections')}
        </Button>
      </PanelWrapper>
    )
  }

  return (
    <PanelWrapper>
      <Header>
        <Heading scale="md">{t('NFTs ready to stake')}</Heading>
        <Text color="textSubtle">
          {t('%count% NFTs eligible', { count: totalEligibleNfts })}
        </Text>
      </Header>
      {farmsToRender.map(({ farm, eligibleNfts }) => {
        const isExpanded = expandedFarms[farm.pid] ?? false
        const previewNfts = isExpanded ? eligibleNfts : eligibleNfts.slice(0, nftPreviewCount)
        const remainingCount = eligibleNfts.length - previewNfts.length
        const bannerUrl = farm.banner
        const avatarUrl = farm.avatar ?? FALLBACK_NFT_IMAGE
        const poolName = farm.lpSymbol.replace(/NFT$/i, '').trim()
        const stakeCtaLabel = t('Stake in %pool% Pool', { pool: poolName || farm.lpSymbol })

        return (
          <FarmGroup key={farm.pid}>
            <FarmBanner $backgroundUrl={bannerUrl}>
              <FarmAvatar
                src={avatarUrl}
                alt={farm.lpSymbol}
                width={72}
                height={72}
              />
            </FarmBanner>
            <FarmContent>
              <Heading scale="sm">{farm.lpSymbol}</Heading>
              <Text color="textSubtle" mt="8px">
                {t('%count% NFTs ready', { count: eligibleNfts.length })}
              </Text>
              <Box mt="16px">
                <NftList>
                  {previewNfts.map((nft) => (
                    <NftThumbnail
                      key={`${nft.collectionAddress}-${nft.tokenId}`}
                      src={resolveImage(nft)}
                      alt={nft.name}
                    />
                  ))}
                  {remainingCount > 0 && !isExpanded && (
                    <Flex
                      width="72px"
                      height="72px"
                      borderRadius="16px"
                      alignItems="center"
                      justifyContent="center"
                      backgroundColor="backgroundAlt2"
                    >
                      <Text color="textSubtle" bold>
                        +{remainingCount}
                      </Text>
                    </Flex>
                  )}
                </NftList>
              </Box>
              {eligibleNfts.length > nftPreviewCount && (
                <Button
                  scale="sm"
                  variant="text"
                  mt="12px"
                  onClick={() => handleToggleFarm(farm.pid)}
                >
                  {isExpanded
                    ? t('Show fewer NFTs')
                    : t('Show all %count% NFTs', { count: eligibleNfts.length })}
                </Button>
              )}
              <FooterActions>
                <Button
                  as={NextLinkFromReactRouter}
                  to={`/nftpools?modal=stake&pid=${farm.pid}`}
                >
                  {stakeCtaLabel}
                </Button>
              </FooterActions>
            </FarmContent>
          </FarmGroup>
        )
      })}
      {hasMoreFarms && (
        <Flex mt="24px" justifyContent="center">
          <Button
            variant="secondary"
            onClick={() => setVisibleFarmCount((count) => count + maxInitialFarms)}
          >
            {t('Show more pools')}
          </Button>
        </Flex>
      )}
    </PanelWrapper>
  )
}

export default StakeableNftsPanel
