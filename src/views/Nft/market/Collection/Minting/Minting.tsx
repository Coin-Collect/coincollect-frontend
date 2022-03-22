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


const BackLink = styled(NextLinkFromReactRouter)`
  align-items: center;
  color: ${({ theme }) => theme.colors.primary};
  display: inline-flex;
  font-weight: 600;
`


const IfoStepBackground = styled(Box)`
  background: ${({ theme }) => theme.colors.gradients.bubblegum};
`

const activeIfo = mintingConfig.find((ifo) => ifo.isActive)


export default function Minting() {

  const router = useRouter()
  const collectionAddress = router.query.collectionAddress as string
  const collection = useGetCollection(collectionAddress)
  const { totalSupply, numberTokensListed, banner, avatar } = collection
  const { t } = useTranslation()
  const { account, library } = useWeb3React()
  const { toastError } = useToast()
  const publicIfoData = useGetPublicIfoV2Data(activeIfo)
  const walletIfoData = useGetWalletIfoV3Data(activeIfo)


  async function mint() {
    console.log(account)
    if (!account) {
      toastError(t('Provider Error'), t('No provider was found'))
    }

    const nftAbi = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "approved", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "operator", "type": "address" }, { "indexed": false, "internalType": "bool", "name": "approved", "type": "bool" }], "name": "ApprovalForAll", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "baseExtension", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "cost", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "isSaleActive", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "maxMintQuantityPerTx", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "maxSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_to", "type": "address" }, { "internalType": "uint256", "name": "_quantity", "type": "uint256" }], "name": "mint", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "quantityAllowedPerAddress", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "_data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "_newBaseExtension", "type": "string" }], "name": "setBaseExtension", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "string", "name": "_newBaseURI", "type": "string" }], "name": "setBaseURI", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_newCost", "type": "uint256" }], "name": "setCost", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_maxMintQuantityPerTx", "type": "uint256" }], "name": "setMaxMintQuantityPerTx", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "_quantity", "type": "uint256" }], "name": "setQuantityAllowedPerAddress", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "toggleSaleActivation", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "_owner", "type": "address" }], "name": "walletOfOwner", "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }]
    const contract = new Contract("0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD", nftAbi, library.getSigner())
    contract.mint(account, 1)


  }



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
            <Button startIcon={<LogoIcon />} onClick={mint}>Mint</Button>
          </StatBox>
        </MarketPageTitle>
      </MarketPageHeader>





      <MintingLayout id="current-minting" py={['24px', '24px', '40px']}>

        <Container>

          <MintingLayoutWrapper>
            <MintingCurrentCard ifo={activeIfo} publicIfoData={publicIfoData} walletIfoData={walletIfoData} />
          </MintingLayoutWrapper>

        </Container>



        <IfoStepBackground>
          <Container>
            <MintingSteps isLive={activeIfo.status === 'live'} ifo={activeIfo} walletIfoData={walletIfoData} />
          </Container>
        </IfoStepBackground>

        <Container>
          <MintingQuestions />
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
