import { PageMeta } from "components/Layout/Page";
import { NextRouter, useRouter } from "next/router"
import { useEffect, useMemo } from "react";
import Header from "views/Nft/market/Collection/Header";
import Items from "views/Nft/market/Collection/Items";
import CollectionNfts from "views/Nft/market/Collection/Items/CollectionNfts";
import { Box, Button, Card, CardBody, CardRibbon, ChevronLeftIcon, Grid, LogoIcon, Step } from '@pancakeswap/uikit'
import Container from "components/Layout/Container";
import { useAppDispatch } from "state";
import { fetchNftsFromCollections } from "state/nftMarket/reducer";
import { CollectibleLinkCard } from "views/Nft/market/components/CollectibleCard";
import MarketPageHeader from "views/Nft/market/components/MarketPageHeader";
import TopBar from "views/Nft/market/Collection/TopBar";
import BannerHeader from "views/Nft/market/components/BannerHeader";
import MarketPageTitle from "views/Nft/market/components/MarketPageTitle";
import StatBox, { StatBoxItem } from "views/Nft/market/components/StatBox";
import { formatNumber } from "utils/formatBalance";
import useTranslation from "contexts/Localization/useTranslation";
import AvatarImage from "views/Nft/market/components/BannerHeader/AvatarImage";
import { Text } from '@pancakeswap/uikit'
import { nftsBaseUrl } from "views/Nft/market/constants";
import styled, { keyframes } from "styled-components";
import { NextLinkFromReactRouter } from "components/NextLink";
import Row from "components/Layout/Row";
import { multicallv2 } from "utils/multicall";
import  useWeb3React  from 'hooks/useWeb3React'
import { isAddress } from 'utils'
import useSWR from "swr";
import { getCollectionApi } from "pages/nfts/collections/mint/[collectionAddress]";
import useToast from "hooks/useToast";
import { Contract } from "@ethersproject/contracts";
import { MintingCurrentCard } from "views/Nft/market/Collection/Minting/components/MintingCard";
import useGetPublicIfoV2Data from 'views/Nft/market/Collection/Minting/hooks/v2/useGetPublicIfoData'
import useGetWalletIfoV3Data from 'views/Nft/market/Collection/Minting/hooks/v3/useGetWalletIfoData'
import { mintingConfig } from 'config/constants'
import MintingSteps from "./components/MintingSteps";
import MintingQuestions from "./components/MintingQuestions";
import MintingLayout, { MintingLayoutWrapper } from "./components/MintingLayout";
import IfoPoolVaultCard from "views/Ifos/components/IfoPoolVaultCard";
import { useContext } from 'react'
import { FarmsPageLayout, FarmsContext } from 'views/NftFarms'
import FarmCard from 'views/NftFarms/components/FarmCard/FarmCard'
import { getDisplayApr } from 'views/NftFarms/Farms'
import BigNumber from 'bignumber.js'
import { getNftFarmApr } from 'utils/apr'
import nftFarmsConfig from 'config/constants/nftFarms'
import { useFarmFromLpSymbol, useFarmFromPid, usePollFarmsWithUserData, usePriceCakeBusd } from 'state/nftFarms/hooks'
import useStakeFarms from "views/NftFarms/hooks/useStakeFarms";
import { StyledCard } from "../../../../../../packages/uikit/src/components/Card/StyledCard";
import FlexLayout from "components/Layout/Flex";
import PoolCard from "views/Pools/components/PoolCard";
import NewestForCollection from "../../Home/NewestForCollection";
import IfoAchievement from "./components/MintingCard/Achievement";
import ActivityHistoryMinting from "../../ActivityHistory/ActivityHistoryMinting";


const BackLink = styled(NextLinkFromReactRouter)`
  align-items: center;
  background: rgba(25, 26, 32, 0.64);
  border-radius: 999px;
  color: #ffffff;
  display: inline-flex;
  font-weight: 600;
  gap: 8px;
  padding: 6px 12px;
  font-size: 14px;
  line-height: 1.25;
  text-decoration: none;
  backdrop-filter: blur(6px);
  transition: color 200ms ease;

  svg {
    fill: currentColor;
    transition: fill 200ms ease;
  }

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.colors.primaryBright || theme.colors.primary};
  }
`

const SocialOverlay = styled(Box)`
  align-items: center;
  background: rgba(25, 26, 32, 0.64);
  border-radius: 999px;
  display: inline-flex;
  padding: 8px 12px;
  backdrop-filter: blur(6px);
  color: #ffffff;
`

const badgeFloat = keyframes`
  0%, 100% {
    transform: translateY(0);
    box-shadow: 0 22px 46px rgba(32, 10, 78, 0.38);
  }

  50% {
    transform: translateY(-6px);
    box-shadow: 0 28px 58px rgba(32, 10, 78, 0.52);
  }
`

const DiscountBadge = styled(Box)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 14px 20px;
  border-radius: 28px;
  background: rgba(0, 0, 0, 0.5);
  color: #ffffff;
  box-shadow: none;
  text-align: center;
  text-align: right;
  overflow: hidden;
  isolation: isolate;
  animation: ${badgeFloat} 6.5s ease-in-out infinite;
  min-width: 0;
  max-width: 320px;
  width: max-content;
  pointer-events: none;
`

const DiscountValue = styled(Text)`
  margin-top: 4px;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1.1;
  text-shadow:
    0 26px 52px rgba(2, 2, 8, 0.65),
    0 0 24px rgba(0, 0, 0, 0.45),
    0 0 2px rgba(0, 0, 0, 0.8);
  -webkit-text-stroke: 1px rgba(0, 0, 0, 0.65);
  paint-order: stroke fill;

  ${({ theme }) => theme.mediaQueries.md} {
    font-size: 48px;
  }
`

const DiscountLeftText = styled(Text)`
  margin-top: 6px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-shadow:
    0 14px 32px rgba(2, 2, 8, 0.55),
    0 0 16px rgba(0, 0, 0, 0.35),
    0 0 1px rgba(0, 0, 0, 0.8);
  -webkit-text-stroke: 0.75px rgba(0, 0, 0, 0.6);
  paint-order: stroke fill;
`


const IfoStepBackground = styled(Box)`
  background: ${({ theme }) => theme.colors.gradients.bubblegum};
`


export default function Minting() {

  const router = useRouter()
  const collectionAddress = router.query.collectionAddress as string
  const collection = useGetCollection(collectionAddress)
  const { totalSupply, maxSupply, cost, status, numberTokensListed, banner, avatar, name, description } = collection
  // Prefer matching minting config by address; fallback to name
  const minting = useMemo(() => {
    const byAddress = mintingConfig.find((ifo) => ifo.address?.toLowerCase() === collectionAddress?.toLowerCase())
    return byAddress ?? mintingConfig.find((ifo) => ifo.name === name)
  }, [collectionAddress, name])
  const { t } = useTranslation()
  const { account, library } = useWeb3React()
  const { toastError } = useToast()
  const publicIfoData = useGetPublicIfoV2Data(minting!)
  const walletIfoData = useGetWalletIfoV3Data(minting!)
  const { chosenFarmsMemoized } = useContext(FarmsContext)
  const cakePrice = usePriceCakeBusd()

  usePollFarmsWithUserData()
  const farm = useFarmFromPid(minting?.stake_pid ?? 0)

  // Compute APR to match nftpools FarmCard expectations
  const mainCollectionWeight = nftFarmsConfig.filter((f) => f.pid == (farm?.pid ?? 0))[0]?.mainCollectionWeight
  const isSmartNftStakePool = Boolean(farm?.contractAddresses)
  const totalStakedNum = (farm?.totalStaked ?? new BigNumber(0)).toNumber()
  const totalSharesNum = (farm?.totalShares ?? new BigNumber(0)).toNumber()
  const totalLiquidityWithThreshold = new BigNumber(
    Math.max(farm?.participantThreshold ?? 0, isSmartNftStakePool ? totalSharesNum : totalStakedNum),
  )
  const { cakeRewardsApr, lpRewardsApr } = getNftFarmApr(
    new BigNumber(farm?.poolWeight ?? 0),
    farm?.tokenPerBlock ? parseFloat(farm.tokenPerBlock) : 0,
    totalLiquidityWithThreshold,
    mainCollectionWeight,
  )
  const farmWithApr = farm ? { ...farm, apr: cakeRewardsApr, lpRewardsApr, liquidity: (farm?.totalStaked ?? new BigNumber(0)) } : null

  const discountHighlight = useMemo(() => {
    if (!minting || !publicIfoData) {
      return null
    }

    const { isLastPrice, cost, nextPrice, lastPrice, partialMaxSupply, totalSupply } = publicIfoData

    const baselinePrice = isLastPrice ? 0 : (lastPrice ?? nextPrice ?? 0)
    if (!baselinePrice || baselinePrice <= 0) {
      return null
    }

    const discountAmount = Math.max((baselinePrice ?? 0) - (cost ?? 0), 0)
    if (discountAmount <= 0) {
      return null
    }

    const discountPercent = Math.max(Math.round((discountAmount / baselinePrice) * 100), 0)
    if (discountPercent <= 0) {
      return null
    }

    const unitsLeft = Math.max((partialMaxSupply ?? 0) - (totalSupply ?? 0), 0)

    const leftDisplay = new Intl.NumberFormat().format(Math.max(unitsLeft, 0))

    return {
      percent: discountPercent,
      leftDisplay,
    }
  }, [minting, publicIfoData])

  // Build social meta from collection data
  const pageMeta = useMemo(() => {
    const meta: { title?: string; description?: string; image?: string } = {}
    if (name) meta.title = `Mint ${name} | CoinCollect`
    if (description) meta.description = description
    if (banner?.large) meta.image = banner.large
    return meta
  }, [name, description, banner])

  return (
    <>
      <PageMeta customMeta={pageMeta} />
      <MarketPageHeader>
        <BannerHeader
          bannerImage={banner.large}
          avatar={<AvatarImage src={avatar} />}
          topLeftOverlay={
            <BackLink to={`${nftsBaseUrl}/collections`}>
              <ChevronLeftIcon color="currentColor" width="20px" />
              {t('Back')}
            </BackLink>
          }
          topRightOverlay={
            <SocialOverlay>
              {minting && (
                <IfoAchievement
                  ifo={minting}
                  publicIfoData={publicIfoData}
                  variant="compact"
                  iconColor="#FFFFFF"
                  hoverColor="primaryBright"
                />
              )}
            </SocialOverlay>
          }
          bottomRightOverlay={
            discountHighlight ? (
              <DiscountBadge>
                <DiscountValue>
                  {t('%percent%% OFF', { percent: discountHighlight.percent })}
                </DiscountValue>
                {discountHighlight.leftDisplay && (
                  <DiscountLeftText>
                    {t('%count% left at this price', { count: discountHighlight.leftDisplay })}
                  </DiscountLeftText>
                )}
              </DiscountBadge>
            ) : null
          }
        />

        <MarketPageTitle
          title={name}
          description={description ? <Text color="textSubtle">{t(description)}</Text> : null}
        >


          <StatBox>
            <StatBoxItem title={t('Minted')} stat={`${totalSupply}/${maxSupply}`} />
            <StatBoxItem title={t('Price')} stat={(cost) + ' POL'} />
            <StatBoxItem title={t('Status')} stat={status} />
          </StatBox>


        </MarketPageTitle>
      </MarketPageHeader>




      <MintingLayout id="current-minting" py={['24px', '24px', '40px']}>

        <Container>

          <MintingLayoutWrapper>

            {farmWithApr && (
              <FarmCard
                farm={farmWithApr}
                displayApr={getDisplayApr(farmWithApr.apr) ?? ''}
                cakePrice={cakePrice}
                account={account ?? undefined}
                removed={false}
              />
            )}
            {minting && (
              <MintingCurrentCard ifo={minting} publicIfoData={publicIfoData} walletIfoData={walletIfoData} />
            )}

          </MintingLayoutWrapper>

        </Container>

        <Container>
          <Card>
            <ActivityHistoryMinting  collectionAddress={collectionAddress} />
          </Card>
        </Container>

        <Container>
          {minting && <NewestForCollection mintingData={minting} />}
        </Container>

        <IfoStepBackground>
          <Container>
            {minting && (
              <MintingSteps isLive={minting.status === 'live'} ifo={minting} walletIfoData={walletIfoData} />
            )}
          </Container>
        </IfoStepBackground>

        <Container>
          {minting && <MintingQuestions mintingData={minting} />}
        </Container>

      </MintingLayout>




    </>
  )
}


const useGetCollection = (collectionAddress: string): any | undefined => {
  const checksummedCollectionAddress = isAddress(collectionAddress) || ''
  const { data } = useSWR(
    checksummedCollectionAddress ? ['minting', 'collections', checksummedCollectionAddress.toLowerCase()] : null,
    async () => getCollectionApi(checksummedCollectionAddress),
  )

  const collectionObject = data ?? {}
  return collectionObject
}
