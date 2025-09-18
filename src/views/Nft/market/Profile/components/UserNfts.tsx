import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import BigNumber from 'bignumber.js'
import {
  Box,
  Button,
  ButtonMenu,
  ButtonMenuItem,
  Flex,
  Grid,
  Heading,
  Spinner,
  Text,
  useModal,
} from '@pancakeswap/uikit'
import FlexLayout from 'components/Layout/Flex'
import { NftLocation, NftToken } from 'state/nftMarket/types'
import { useTranslation } from 'contexts/Localization'
import formatRewardAmount from 'utils/formatRewardAmount'
import FarmCard, { NftFarmWithStakedValue } from 'views/NftFarms/components/FarmCard/FarmCard'
import { CollectibleActionCard } from '../../components/CollectibleCard'
import GridPlaceholder from '../../components/GridPlaceholder'
import ProfileNftModal from '../../components/ProfileNftModal'
import NoNftsImage from '../../components/Activity/NoNftsImage'
import SellModal from '../../components/BuySellModals/SellModal'
import { groupNftsByCollection, INITIAL_COLLECTION_BATCH, CollectionGroup } from '../utils/groupNftsByCollection'
import { useClaimInfo } from 'views/Claim/hooks/useClaimInfo'
import claimConfig from 'config/constants/claim'
import ClaimCard from 'views/Claim/components/ClaimCard'
import OnboardingHero from './OnboardingHero'

const REWARD_TOKEN_DECIMALS = new BigNumber(10).pow(18)

interface ProfileNftProps {
  nft: NftToken | null
  location: NftLocation | null
}

interface SellNftProps {
  nft: NftToken | null
  location: NftLocation | null
  variant: 'sell' | 'edit' | null
}

interface UserNftsProps {
  account?: string
  walletNfts: NftToken[]
  isWalletLoading: boolean
  stakedFarms: NftFarmWithStakedValue[]
  isStakedLoading: boolean
  totalStakedBalance: BigNumber
  onRefreshWallet: () => void
  onSuccessSale: () => void
  onSuccessEditProfile: () => void
}

enum NftFilter {
  ALL = 0,
  UNSTAKED = 1,
  STAKED = 2,
  CLAIM = 3,
}

const getDisplayApr = (apr?: number | null) => {
  if (apr === undefined || apr === null) {
    return null
  }

  return formatRewardAmount(new BigNumber(apr))
}

const UserNfts: React.FC<UserNftsProps> = ({
  account,
  walletNfts,
  isWalletLoading,
  stakedFarms,
  isStakedLoading,
  totalStakedBalance,
  onRefreshWallet,
  onSuccessSale,
  onSuccessEditProfile,
}) => {
  const [clickedProfileNft, setClickedProfileNft] = useState<ProfileNftProps>({ nft: null, location: null })
  const [clickedSellNft, setClickedSellNft] = useState<SellNftProps>({ nft: null, location: null, variant: null })
  const previousStakeAmount = useRef<string | null>(null)
  const [onPresentProfileNftModal] = useModal(
    <ProfileNftModal nft={clickedProfileNft.nft} onSuccess={onSuccessEditProfile} />,
  )
  const [onPresentSellModal] = useModal(
    <SellModal
      variant={clickedSellNft.variant}
      nftToSell={clickedSellNft.nft}
      onSuccessSale={onSuccessSale}
      onSuccessEditProfile={onSuccessEditProfile}
    />,
  )
  const { t } = useTranslation()

  const groupedWalletCollections = useMemo<CollectionGroup[]>(
    () => groupNftsByCollection(walletNfts),
    [walletNfts],
  )

  const walletHasNfts = groupedWalletCollections.length > 0
  const walletIsEmpty = !walletHasNfts && !isWalletLoading
  const poolCount = stakedFarms.length

  const [activeFilter, setActiveFilter] = useState<NftFilter>(NftFilter.ALL)
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})

  const claimInfo = useClaimInfo()

  const claimableClaims = useMemo(() => {
    if (!claimInfo?.data) {
      return []
    }

    return claimInfo.data
      .map((claimDetail, index) => ({
        index,
        config: claimConfig[index],
        detail: claimDetail,
      }))
      .filter(({ config, detail }) => {
        if (!config || !detail) {
          return false
        }

        if (config.isFinished) {
          return false
        }

        if ((detail.remainingClaims ?? 0) <= 0) {
          return false
        }

        if ((detail.userWeight ?? 0) === 0) {
          return false
        }

        const requiredReward = new BigNumber(config.baseAmount ?? 0)
          .times(detail.userWeight ?? 1)
          .times(REWARD_TOKEN_DECIMALS)

        const rewardBalance = new BigNumber(detail.rewardBalance ?? 0)

        return rewardBalance.gte(requiredReward)
      })
  }, [claimInfo?.data])

  useEffect(() => {
    setVisibleCounts((prev) => {
      const next: Record<string, number> = {}

      groupedWalletCollections.forEach((group) => {
        const current = prev[group.key]
        const defaultCount = Math.min(group.nfts.length, INITIAL_COLLECTION_BATCH)
        next[group.key] = Math.min(group.nfts.length, current ?? defaultCount)
      })

      return next
    })
  }, [groupedWalletCollections])

  const handleCollectionLoadMore = useCallback(
    (collectionKey: string) => {
      setVisibleCounts((prev) => {
        const group = groupedWalletCollections.find((item) => item.key === collectionKey)
        if (!group) {
          return prev
        }

        const current = prev[collectionKey] ?? Math.min(group.nfts.length, INITIAL_COLLECTION_BATCH)
        const nextCount = Math.min(group.nfts.length, current + INITIAL_COLLECTION_BATCH)

        if (nextCount === current) {
          return prev
        }

        return { ...prev, [collectionKey]: nextCount }
      })

      onRefreshWallet()
    },
    [groupedWalletCollections, onRefreshWallet],
  )

  const showUnstaked = activeFilter === NftFilter.ALL || activeFilter === NftFilter.UNSTAKED
  const showStaked = activeFilter === NftFilter.ALL || activeFilter === NftFilter.STAKED
  const showClaimRewards = activeFilter === NftFilter.ALL || activeFilter === NftFilter.CLAIM

  const stakedSummaryText = useMemo(() => {
    if (poolCount === 0) {
      return t('Track the pools where your NFTs are working for you.')
    }

    return t('You are staking in %poolCount% NFT pool(s).', { poolCount })
  }, [poolCount, t])

  const handleCollectibleClick = (nft: NftToken, location: NftLocation) => {
    switch (location) {
      case NftLocation.PROFILE:
        setClickedProfileNft({ nft, location })
        break
      case NftLocation.WALLET:
        setClickedSellNft({ nft, location, variant: 'sell' })
        break
      case NftLocation.FORSALE:
        setClickedSellNft({ nft, location, variant: 'edit' })
        break
      default:
        break
    }
  }

  useEffect(() => {
    if (clickedProfileNft.nft) {
      onPresentProfileNftModal()
    }
    // exhaustive deps disabled as the useModal dep causes re-render loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedProfileNft])

  useEffect(() => {
    if (clickedSellNft.nft) {
      onPresentSellModal()
    }
    // exhaustive deps disabled as the useModal dep causes re-render loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedSellNft])

  useEffect(() => {
    if (!totalStakedBalance) {
      return
    }

    const currentStakeTotal = totalStakedBalance.toString()
    if (previousStakeAmount.current && previousStakeAmount.current !== currentStakeTotal) {
      onRefreshWallet()
    }
    previousStakeAmount.current = currentStakeTotal
  }, [totalStakedBalance, onRefreshWallet])

  return (
    <>
      <OnboardingHero
        totalNfts={walletNfts.length}
        stakedPoolCount={poolCount}
        claimableCount={claimableClaims.length}
        walletNfts={walletNfts}
      />
      <Flex mb="24px" justifyContent="center">
        <ButtonMenu
          scale="sm"
          variant="subtle"
          activeIndex={activeFilter}
          onItemClick={(index) => setActiveFilter(index as NftFilter)}
        >
          <ButtonMenuItem>{t('All')}</ButtonMenuItem>
          <ButtonMenuItem>{t('Unstaked NFTs')}</ButtonMenuItem>
          <ButtonMenuItem>{t('Staked Pools')}</ButtonMenuItem>
          <ButtonMenuItem>{t('Claim Rewards')}</ButtonMenuItem>
        </ButtonMenu>
      </Flex>

      {showUnstaked && (
        <Box mb="48px">
          <Flex flexDirection="column" mb="16px">
            <Heading scale="lg">{t('Unstaked NFTs')}</Heading>
            <Text mt="8px" color="textSubtle">
              {walletHasNfts
                ? t('These NFTs remain in your wallet and are ready to stake or list.')
                : t('Bring your NFTs here to see them ready for action.')}
            </Text>
          </Flex>
          {walletIsEmpty ? (
            <Flex p="24px" flexDirection="column" alignItems="center">
              <NoNftsImage />
              <Text pt="8px" bold>
                {t('No unstaked NFTs found')}
              </Text>
            </Flex>
          ) : walletHasNfts ? (
            groupedWalletCollections.map((group) => {
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
                    <Text color="textSubtle">
                      {t('%count% NFT(s)', { count: group.nfts.length })}
                    </Text>
                  </Flex>
                  <Grid
                    gridGap="16px"
                    gridTemplateColumns={['1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)', null, 'repeat(4, 1fr)']}
                    alignItems="start"
                  >
                    {displayedNfts.map((nft) => {
                      const { marketData, location } = nft

                      return (
                        <CollectibleActionCard
                          isUserNft
                          onClick={() => handleCollectibleClick(nft, location)}
                          key={`${group.key}-${nft.tokenId}`}
                          nft={nft}
                          currentAskPrice={
                            marketData?.currentAskPrice &&
                            marketData?.isTradable &&
                            parseFloat(marketData.currentAskPrice)
                          }
                          nftLocation={location}
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
            <GridPlaceholder />
          )}
        </Box>
      )}

      {showStaked && (
        <Box>
          <Flex flexDirection="column" mb="16px">
            <Heading scale="lg">{t('Staked NFT Pools')}</Heading>
            <Text mt="8px" color="textSubtle">
              {stakedSummaryText}
            </Text>
          </Flex>
          {isStakedLoading ? (
            <Flex py="40px" flexDirection="column" alignItems="center">
              <Spinner size={56} color="primary" />
              <Text mt="16px" color="textSubtle">
                {t('Loading your NFT pools...')}
              </Text>
            </Flex>
          ) : stakedFarms.length > 0 ? (
            <FlexLayout>
              {stakedFarms.map((farm) => (
                <FarmCard
                  key={farm.pid}
                  farm={farm}
                  displayApr={getDisplayApr(farm.apr)}
                  removed={farm.isFinished}
                  account={account}
                />
              ))}
            </FlexLayout>
          ) : (
            <Flex p="24px" flexDirection="column" alignItems="center" textAlign="center">
              <NoNftsImage />
              <Text pt="8px" bold>
                {t('You are not staking any NFTs yet')}
              </Text>
              <Text mt="8px" color="textSubtle" maxWidth="360px">
                {t('Stake NFTs in a pool to start earning rewards and unlock exclusive perks.')}
              </Text>
              <Button as="a" href="/nftpools" mt="16px" variant="primary">
                {t('Explore NFT Pools')}
              </Button>
            </Flex>
          )}
        </Box>
      )}

      {showClaimRewards && (
        <Box mt="48px">
          <Flex flexDirection="column" mb="16px">
            <Heading scale="lg">{t('Claim Reward Pools')}</Heading>
            <Text mt="8px" color="textSubtle">
              {t('Check active reward pools and claim any available token distributions tied to your NFTs.')}
            </Text>
          </Flex>
          {claimInfo.isLoading ? (
            <Flex py="40px" flexDirection="column" alignItems="center">
              <Spinner size={56} color="primary" />
              <Text mt="16px" color="textSubtle">
                {t('Fetching your claimable rewards...')}
              </Text>
            </Flex>
          ) : claimableClaims.length > 0 ? (
            <FlexLayout>
              {claimableClaims.map(({ index, config }) => (
                <ClaimCard
                  key={`${config.cid ?? 'claim'}-${index}`}
                  claimId={index}
                  claim={config}
                  claimData={claimInfo}
                  account={account}
                />
              ))}
            </FlexLayout>
          ) : (
            <Flex p="24px" flexDirection="column" alignItems="center" textAlign="center">
              <NoNftsImage />
              <Text pt="8px" bold>
                {t('No claimable rewards at the moment')}
              </Text>
              <Text mt="8px" color="textSubtle" maxWidth="360px">
                {t('Keep an eye on new campaigns or visit the Claim page to explore upcoming reward pools.')}
              </Text>
              <Button as="a" href="/claim" mt="16px" variant="primary">
                {t('Go to Claim Page')}
              </Button>
            </Flex>
          )}
        </Box>
      )}
    </>
  )
}

export default UserNfts
