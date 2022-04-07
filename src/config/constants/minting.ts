import { Token, ChainId } from '@pancakeswap/sdk'
import tokens from './tokens'
import farms from './farms'
import { Ifo, Minting } from './types'
import { getCoinCollectBronzeNftAddress, getCoinCollectNftAddress } from 'utils/addressHelpers'

//export const cakeBnbLpToken = new Token(ChainId.MAINNET, farms[1].lpAddresses[ChainId.MAINNET], 18, farms[1].lpSymbol)

const ifos: Minting[] = [
  //============================Free Mint NFTS====================================
  {
    id: 'coincollectfreenfts',
    name: 'CoinCollect NFTs',
    description: 'CoinCollect is a Decentralized NFT finance Protocol operating on Multi-Chains, that helps NFT traders, high yield farmers, liquidity providers, developers and web 3.0 startups to participate in an open financial market with no barriers to entry.',
    address: getCoinCollectNftAddress(),
    symbol: 'cNFT',
    totalSupply: 5000,
    isActive: true,
    status: 'finished',
    avatar: "https://coincollect.org/assets/images/clone/nft350.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banner-lg.png",
      small: "https://coincollect.org/assets/images/clone/banner-lg.png",
    },
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
    name: 'CoinCollect Bronze NFTs',
    description: 'CoinCollect Bronze Nft Description',
    address: getCoinCollectBronzeNftAddress(),
    symbol: 'cNFTBronze',
    totalSupply: 5000,
    isActive: true,
    status: 'live',
    avatar: "https://cdn.pixabay.com/photo/2020/11/10/15/51/bear-5730216__340.png",
    banner: {
      large: "https://cdn.pixabay.com/photo/2019/07/07/17/48/avatar-4322968_960_720.png",
      small: "https://cdn.pixabay.com/photo/2019/07/07/17/48/avatar-4322968_960_720.png",
    },
    poolUnlimited: {
      saleAmount: '5000 NFT',
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
    name: 'CoinCollect Silver NFTs',
    description: 'CoinCollect Silver Nft Description',
    address: getCoinCollectBronzeNftAddress(),
    symbol: 'cNFTSilver',
    totalSupply: 5000,
    isActive: true,
    status: 'live',
    avatar: "https://cdn.pixabay.com/photo/2021/01/18/08/32/naruto-5927441__340.png",
    banner: {
      large: "https://cdn.pixabay.com/photo/2018/09/30/01/49/fantasy-3712662_960_720.jpg",
      small: "https://cdn.pixabay.com/photo/2018/09/30/01/49/fantasy-3712662_960_720.jpg",
    },
    poolUnlimited: {
      saleAmount: '5000 NFT',
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
    name: 'CoinCollect Gold NFTs',
    description: 'CoinCollect Gold Nft Description',
    address: getCoinCollectBronzeNftAddress(),
    symbol: 'cNFTGold',
    totalSupply: 5000,
    isActive: true,
    status: 'live',
    avatar: "https://cdn.pixabay.com/photo/2022/03/31/07/25/woman-7102383__340.png",
    banner: {
      large: "https://cdn.pixabay.com/photo/2019/07/05/05/47/fantasy-4317735_960_720.jpg",
      small: "https://cdn.pixabay.com/photo/2019/07/05/05/47/fantasy-4317735_960_720.jpg",
    },
    poolUnlimited: {
      saleAmount: '5000 NFT',
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
