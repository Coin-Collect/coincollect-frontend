import { PageMeta } from "components/Layout/Page";
import { NextRouter, useRouter } from "next/router"
import { useEffect, useMemo } from "react";
import Header from "views/Nft/market/Collection/Header";
import Items from "views/Nft/market/Collection/Items";
import CollectionNfts from "views/Nft/market/Collection/Items/CollectionNfts";
import { Box, Button, Card, CardBody, CardRibbon, ChevronLeftIcon, Flex, Grid, LogoIcon, Step } from '@pancakeswap/uikit'
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
import styled from "styled-components";
import { NextLinkFromReactRouter } from "components/NextLink";
import Row from "components/Layout/Row";
import { multicallv2 } from "utils/multicall";
import { useWeb3React } from "@web3-react/core";
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
import { useFarmFromLpSymbol, useFarmFromPid, usePollFarmsWithUserData, usePriceCakeBusd } from 'state/nftFarms/hooks'
import useStakeFarms from "views/NftFarms/hooks/useStakeFarms";
import { StyledCard } from "../../../../../../packages/uikit/src/components/Card/StyledCard";
import FlexLayout from "components/Layout/Flex";
import NftStakeCard from "./components/NftStakeCard";
import PoolCard from "views/Pools/components/PoolCard";
import NewestForCollection from "../../Home/NewestForCollection";


const BackLink = styled(NextLinkFromReactRouter)`
  align-items: center;
  color: ${({ theme }) => theme.colors.primary};
  display: inline-flex;
  font-weight: 600;
`


const IfoStepBackground = styled(Box)`
  background: ${({ theme }) => theme.colors.gradients.bubblegum};
`


export default function Minting() {

  const router = useRouter()
  const collectionAddress = router.query.collectionAddress as string
  const collection = useGetCollection(collectionAddress)
  const { totalSupply, maxSupply, cost, status, numberTokensListed, banner, avatar, name, description } = collection
  const minting = mintingConfig.find((ifo) => ifo.name === name)
  const { t } = useTranslation()
  const { account, library } = useWeb3React()
  const { toastError } = useToast()
  const publicIfoData = useGetPublicIfoV2Data(minting)
  const walletIfoData = useGetWalletIfoV3Data(minting)
  const { chosenFarmsMemoized } = useContext(FarmsContext)
  const cakePrice = usePriceCakeBusd()

  const { isLastPrice, nextPrice } = publicIfoData

  usePollFarmsWithUserData()
  const farm= useFarmFromPid(minting.stake_pid)
  
  return (
    <>
      <PageMeta />
      <MarketPageHeader>
        <Flex alignItems="center" justifyContent="space-between" mb="24px">
          <BackLink to={`${nftsBaseUrl}/collections`}>
            <ChevronLeftIcon color="primary" width="24px" />
            {t('All Collections')}
          </BackLink>

        </Flex>
        <BannerHeader bannerImage={banner.large} avatar={<AvatarImage src={avatar} />} />
        <MarketPageTitle
          title={name}
          description={description ? <Text color="textSubtle">{t(description)}</Text> : null}
        >
          <StatBox>
            <StatBoxItem title={t('Minted')} stat={`${totalSupply}/${maxSupply}`} />
            <StatBoxItem title={t('Price')} stat={(!isLastPrice ? nextPrice : cost) + ' Matic'} />
            <StatBoxItem title={t('Status')} stat={status} />
          </StatBox>
        </MarketPageTitle>
      </MarketPageHeader>





      <MintingLayout id="current-minting" py={['24px', '24px', '40px']}>

        <Container>

          <MintingLayoutWrapper>
          
          <NftStakeCard farm={farm} account={account} />
          
            <MintingCurrentCard ifo={minting} publicIfoData={publicIfoData} walletIfoData={walletIfoData} />
          </MintingLayoutWrapper>

        </Container>

        <Container>
          <NewestForCollection mintingData={minting} />
        </Container>

        <IfoStepBackground>
          <Container>
            <MintingSteps isLive={minting.status === 'live'} ifo={minting} walletIfoData={walletIfoData} />
          </Container>
        </IfoStepBackground>

        <Container>
          <MintingQuestions mintingData={minting} />
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
