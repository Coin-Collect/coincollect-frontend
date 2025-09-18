import { useState, useEffect, useMemo, useRef } from 'react'
import BigNumber from 'bignumber.js'
import {
  Box,
  Button,
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

  const walletHasNfts = walletNfts.length > 0
  const walletIsEmpty = walletNfts.length === 0 && !isWalletLoading
  const poolCount = stakedFarms.length

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
          <Grid
            gridGap="16px"
            gridTemplateColumns={['1fr', 'repeat(2, 1fr)', 'repeat(3, 1fr)', null, 'repeat(4, 1fr)']}
            alignItems="start"
          >
            {walletNfts.map((nft) => {
              const { marketData, location } = nft

              return (
                <CollectibleActionCard
                  isUserNft
                  onClick={() => handleCollectibleClick(nft, location)}
                  key={`${nft.tokenId}-${nft.name}`}
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
        ) : (
          <GridPlaceholder />
        )}
      </Box>

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
    </>
  )
}

export default UserNfts
