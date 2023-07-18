import { Token, ChainId } from '@coincollect/sdk'
import tokens from './tokens'
import farms from './farms'
import { Ifo, Minting } from './types'
import { getCoinCollectBronzeNftAddress, getCoinCollectGoldNftAddress, getCoinCollectNftAddress, getCoinCollectSilverNftAddress, getLotNftAddress } from 'utils/addressHelpers'

//export const cakeBnbLpToken = new Token(ChainId.MAINNET, farms[1].lpAddresses[ChainId.MAINNET], 18, farms[1].lpSymbol)

const ifos: Minting[] = [
  //============================Free Mint NFTS====================================
  {
    id: 'coincollectfreenfts',
    name: 'CoinCollect Starter NFT',
    description: 'CoinCollect Starter NFTs are most valuable FREE utility NFTs on the market. Starter NFT is a gift and a lifetime privilege to our community. Starter NFTs earn new tokens from pools and airdrops. it also has a chance on whitelists',
    address: getCoinCollectNftAddress(),
    symbol: 'STARTER',
    totalSupply: 5000,
    isActive: true,
    status: 'finished',
    avatar: "https://coincollect.org/assets/images/clone/nft350.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banner-lg.png",
      small: "https://coincollect.org/assets/images/clone/banner-lg.png",
    },
    showCase: [
      {'tokenId': 5, 'image': 'https://i.seadn.io/gcs/files/3fae93b32198738f84fabf7ff36790ed.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
      {'tokenId': 25, 'image': 'https://i.seadn.io/gcs/files/b374a51c97a9bf2de710109e697373c4.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
      {'tokenId': 54, 'image': 'https://i.seadn.io/gcs/files/a8c8cf3022473fd69985fed085f89318.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
      {'tokenId': 67, 'image': 'https://i.seadn.io/gcs/files/935ed2c8f67898dc5f9d4c80c16598b0.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
    ],
    poolUnlimited: {
      saleAmount: '5000 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://coincollect.org',
    version: 1.0,
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================Bronze NFTS====================================
  {
    id: 'coincollectbronzefts',
    name: 'CoinCollect Bronze NFT',
    description: 'CoinCollect Bronze NFTs are the cheapest valuable utility NFTs that has all the features of Starter NFTs also 5x more powerful than Starter NFTs. Bronze NFTs earn more than Starter NFTs from pools and airdrops. it also has more chance on whitelists',
    address: getCoinCollectBronzeNftAddress(),
    symbol: 'BRONZE',
    totalSupply: 3300,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileBronze.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerBronzeLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerBronzeSm.png",
    },
    poolUnlimited: {
      saleAmount: '3300 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://coincollect.org',
    version: 3.1,
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================Silver NFTS====================================
  {
    id: 'coincollectsilverfts',
    name: 'CoinCollect Silver NFT',
    description: 'CoinCollect Silver NFTs are the medium powerful utility NFTs that has all the features of Bronze NFTs also 15x more powerful than Starter NFTs. Silver NFTs earn more than Bronze NFTs from pools and airdrops. it also has more chance on whitelists',
    address: getCoinCollectSilverNftAddress(),
    symbol: 'SILVER',
    totalSupply: 2200,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileSilver.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerSilverLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerSilverSm.png",
    },
    poolUnlimited: {
      saleAmount: '2200 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://coincollect.org',
    version: 3.1,
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================Gold NFTS====================================
  {
    id: 'coincollectgoldfts',
    name: 'CoinCollect Gold NFT',
    description: 'CoinCollect Gold NFTs are the most valuable utility NFTs that has all the features of Starter NFTs also 45x more powerful than Starter NFTs. Gold NFTs earn more than Silver NFTs from pools and airdrops. it also has more chance on whitelists',
    address: getCoinCollectGoldNftAddress(),
    symbol: 'GOLD',
    totalSupply: 1100,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileGold.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerGoldLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerGoldSm.png",
    },
    showCase: [
      {'tokenId': 5, 'image': 'https://i.seadn.io/gcs/files/3fae93b32198738f84fabf7ff36790ed.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
      {'tokenId': 25, 'image': 'https://i.seadn.io/gcs/files/b374a51c97a9bf2de710109e697373c4.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
      {'tokenId': 54, 'image': 'https://i.seadn.io/gcs/files/a8c8cf3022473fd69985fed085f89318.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
      {'tokenId': 67, 'image': 'https://i.seadn.io/gcs/files/935ed2c8f67898dc5f9d4c80c16598b0.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/assets/ethereum/0x306b1ea3ecdf94ab739f1910bbda052ed4a9f949/14549'},
    ],
    poolUnlimited: {
      saleAmount: '1100 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://coincollect.org',
    version: 3.1,
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================LOT NFTS====================================
  {
    id: 'lotnfts',
    name: 'Lot NFT',
    description: 'CoinCollect Gold NFTs are the most valuable utility NFTs that has all the features of Starter NFTs also 45x more powerful than Starter NFTs. Gold NFTs earn more than Silver NFTs from pools and airdrops. it also has more chance on whitelists',
    address: getLotNftAddress(),
    symbol: 'LOT',
    totalSupply: 1100,
    isActive: true,
    status: 'liveprivate', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileLot.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerLotLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerLotSm.png",
    },
    poolUnlimited: {
      saleAmount: '1100 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://coincollect.org',
    version: 3.1,
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
]

export default ifos
