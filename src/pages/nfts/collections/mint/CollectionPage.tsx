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
import { getCollectionApi } from "./[collectionAddress]";

const BackLink = styled(NextLinkFromReactRouter)`
  align-items: center;
  color: ${({ theme }) => theme.colors.primary};
  display: inline-flex;
  font-weight: 600;
`
//TODO: Move to view
export default function Collections() {
  
  const router = useRouter()
  const collectionAddress = router.query.collectionAddress as string
  const collection = useGetCollection(collectionAddress)
  const { totalSupply, numberTokensListed, banner, avatar } = collection
  const { t } = useTranslation()
  const {account} = useWeb3React()


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
          title={collection.name}
          description={collection.description ? <Text color="textSubtle">{t(collection.description)}</Text> : null}
        >
          <StatBox>
            <StatBoxItem title={t('Minted')} stat={`${totalSupply}/5000`} />
            <StatBoxItem title={t('Price')} stat={"0.0 ETH"} />
            <StatBoxItem title={t('Status')} stat={"Active"} />
            <Button startIcon={<LogoIcon />}>Mint</Button>
          </StatBox>
        </MarketPageTitle>
      </MarketPageHeader>


      <div style={{ padding: "32px", width: "500px" }}>
      <Row>
        <Card ribbon={<CardRibbon variantColor="failure" text="Free Mint" />}>
          <div style={{ height: "112px", backgroundColor: "#191326" }} />
          <CardBody style={{ height: "150px" }}>Ribbons will truncate when text is too long</CardBody>
          <Button width="100%" startIcon={<LogoIcon />}>Free Mint</Button>
        </Card>
      </Row>
    </div>

    <div style={{ padding: "32px"}}>
      <Row>
        <Step index={0} statusFirstPart="past">
          <Card>
            <CardBody>
              <h2>Connect Wallet</h2>
              <div>
                  Connect your desired walled. We Prefer Metamask
              </div>
            </CardBody>
          </Card>
        </Step>
      </Row>
      <Row>
        <Step index={1} statusFirstPart="past" statusSecondPart="future">
          <Card>
            <CardBody>
              <h2>Change Network</h2>
              <div>
                You will be coonected to Polygon network.
              </div>
            </CardBody>
          </Card>
        </Step>
      </Row>
      <Row>
        <Step index={2} statusFirstPart="past">
          <Card>
            <CardBody>
              <h2>Hit Mint Buton</h2>
              <div>
                Hit free mint button, if you have matic for gas fee.
              </div>
            </CardBody>
          </Card>
        </Step>
      </Row>
    </div>



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
