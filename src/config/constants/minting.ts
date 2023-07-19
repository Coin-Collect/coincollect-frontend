import { Token, ChainId } from '@coincollect/sdk'
import tokens from './tokens'
import farms from './farms'
import { Ifo, Minting } from './types'
import { getCoinCollectBronzeNftAddress, getCoinCollectGoldNftAddress, getCoinCollectNftAddress, getCoinCollectSilverNftAddress, getLotNftAddress } from 'utils/addressHelpers'

//export const cakeBnbLpToken = new Token(ChainId.MAINNET, farms[1].lpAddresses[ChainId.MAINNET], 18, farms[1].lpSymbol)

const collectionLinks = {
  'starter': 'https://opensea.io/collection/coincollect-nfts',
  'bronze': 'https://opensea.io/collection/coincollect-bronze-nft',
  'silver': 'https://opensea.io/collection/coincollect-silver-nft',
  'gold': 'https://opensea.io/collection/coincollect-gold-nft',
  'lot': 'www.lotnft.com'
}

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
      { 'tokenId': 5, 'image': 'https://i.seadn.io/gae/ZoAedbU7HPpWA2PZVoDXDP9jnD7f89tQi_qswW9_4vdOh9boeHpawxDARmvSVWeZtVc9uMy1Y9vNkYO57MmWTp9PsLHzLr98Znm-3Q?auto=format&dpr=1&w=1000', 'link': collectionLinks['starter'] },
      { 'tokenId': 25, 'image': 'https://i.seadn.io/gae/68uO7RwfcZupc_CfKlH9hsK3tfZWBDetY_bqcnrHNN5LsxH7dsQLEkWyMWDmdp7lQI2oBR7e9IVPzhzXCyWfDQ3wwCIGSq-juA3L?auto=format&dpr=1&w=1000', 'link': collectionLinks['bronze'] },
      { 'tokenId': 54, 'image': 'https://i.seadn.io/gae/SE_Wv4fq1J1gUPr8VKFSAjYAB38VOD1ickB9-M-AkycRfQ5PHEe8NvgxLdQBA0dYVrOR5oO6sag-aZrziSad8fDkA0p8jRfy-MPmTIs?auto=format&dpr=1&w=1000', 'link': collectionLinks['silver'] },
      { 'tokenId': 67, 'image': 'https://i.seadn.io/gae/bHePLGqsdW8CP4PmRf0Q-Eoc03sT9ebaqgNLcjtW4lkufeowLQ1Z7-dqnBG-Nhzwefr-xY2We-ZIszraPcGJt0jZqoZnqex_lXj6hg?auto=format&dpr=1&w=1000', 'link': collectionLinks['gold'] },
    ],
    faq: [
      {
        title: "What is an NFT?",
        description: ["An NFT, or non-fungible token, is a digital asset that is unique and cannot be replaced. NFTs are often used to represent digital art, music, videos, and other collectibles. They can be bought, sold, and traded on NFT marketplaces."]
      },
      {
        title: "How do NFTs work?",
        description: ["NFTs are stored on a blockchain, which is a digital ledger that records transactions. The blockchain ensures that NFTs are secure and cannot be counterfeited."]
      },
      {
        title: "How do I buy an NFT?",
        description: ["To buy an NFT, you will need to create a digital wallet and fund it with cryptocurrency. You can then use your digital wallet to buy NFTs on an NFT marketplace."]
      }
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
    openSeaUrl: 'https://opensea.io/collection/coincollect-nfts',
    cmcUrl: 'cmc.com',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
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
    showCase: [
      { 'tokenId': 5, 'image': 'https://i.seadn.io/gae/ZoAedbU7HPpWA2PZVoDXDP9jnD7f89tQi_qswW9_4vdOh9boeHpawxDARmvSVWeZtVc9uMy1Y9vNkYO57MmWTp9PsLHzLr98Znm-3Q?auto=format&dpr=1&w=1000', 'link': collectionLinks['starter'] },
      { 'tokenId': 25, 'image': 'https://i.seadn.io/gae/68uO7RwfcZupc_CfKlH9hsK3tfZWBDetY_bqcnrHNN5LsxH7dsQLEkWyMWDmdp7lQI2oBR7e9IVPzhzXCyWfDQ3wwCIGSq-juA3L?auto=format&dpr=1&w=1000', 'link': collectionLinks['bronze'] },
      { 'tokenId': 54, 'image': 'https://i.seadn.io/gae/SE_Wv4fq1J1gUPr8VKFSAjYAB38VOD1ickB9-M-AkycRfQ5PHEe8NvgxLdQBA0dYVrOR5oO6sag-aZrziSad8fDkA0p8jRfy-MPmTIs?auto=format&dpr=1&w=1000', 'link': collectionLinks['silver'] },
      { 'tokenId': 67, 'image': 'https://i.seadn.io/gae/bHePLGqsdW8CP4PmRf0Q-Eoc03sT9ebaqgNLcjtW4lkufeowLQ1Z7-dqnBG-Nhzwefr-xY2We-ZIszraPcGJt0jZqoZnqex_lXj6hg?auto=format&dpr=1&w=1000', 'link': collectionLinks['gold'] },
    ],
    faq: [
      {
        title: "What is an NFT?",
        description: ["An NFT, or non-fungible token, is a digital asset that is unique and cannot be replaced. NFTs are often used to represent digital art, music, videos, and other collectibles. They can be bought, sold, and traded on NFT marketplaces."]
      },
      {
        title: "How do NFTs work?",
        description: ["NFTs are stored on a blockchain, which is a digital ledger that records transactions. The blockchain ensures that NFTs are secure and cannot be counterfeited."]
      },
      {
        title: "How do I buy an NFT?",
        description: ["To buy an NFT, you will need to create a digital wallet and fund it with cryptocurrency. You can then use your digital wallet to buy NFTs on an NFT marketplace."]
      }
    ],
    poolUnlimited: {
      saleAmount: '3300 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://coincollect.org',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/coincollect-bronze-nft',
    cmcUrl: 'cmc.com',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
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
    showCase: [
      { 'tokenId': 5, 'image': 'https://i.seadn.io/gae/ZoAedbU7HPpWA2PZVoDXDP9jnD7f89tQi_qswW9_4vdOh9boeHpawxDARmvSVWeZtVc9uMy1Y9vNkYO57MmWTp9PsLHzLr98Znm-3Q?auto=format&dpr=1&w=1000', 'link': collectionLinks['starter'] },
      { 'tokenId': 25, 'image': 'https://i.seadn.io/gae/68uO7RwfcZupc_CfKlH9hsK3tfZWBDetY_bqcnrHNN5LsxH7dsQLEkWyMWDmdp7lQI2oBR7e9IVPzhzXCyWfDQ3wwCIGSq-juA3L?auto=format&dpr=1&w=1000', 'link': collectionLinks['bronze'] },
      { 'tokenId': 54, 'image': 'https://i.seadn.io/gae/SE_Wv4fq1J1gUPr8VKFSAjYAB38VOD1ickB9-M-AkycRfQ5PHEe8NvgxLdQBA0dYVrOR5oO6sag-aZrziSad8fDkA0p8jRfy-MPmTIs?auto=format&dpr=1&w=1000', 'link': collectionLinks['silver'] },
      { 'tokenId': 67, 'image': 'https://i.seadn.io/gae/bHePLGqsdW8CP4PmRf0Q-Eoc03sT9ebaqgNLcjtW4lkufeowLQ1Z7-dqnBG-Nhzwefr-xY2We-ZIszraPcGJt0jZqoZnqex_lXj6hg?auto=format&dpr=1&w=1000', 'link': collectionLinks['gold'] },
    ],
    faq: [
      {
        title: "What is an NFT?",
        description: ["An NFT, or non-fungible token, is a digital asset that is unique and cannot be replaced. NFTs are often used to represent digital art, music, videos, and other collectibles. They can be bought, sold, and traded on NFT marketplaces."]
      },
      {
        title: "How do NFTs work?",
        description: ["NFTs are stored on a blockchain, which is a digital ledger that records transactions. The blockchain ensures that NFTs are secure and cannot be counterfeited."]
      },
      {
        title: "How do I buy an NFT?",
        description: ["To buy an NFT, you will need to create a digital wallet and fund it with cryptocurrency. You can then use your digital wallet to buy NFTs on an NFT marketplace."]
      }
    ],
    poolUnlimited: {
      saleAmount: '2200 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://coincollect.org',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/coincollect-silver-nft',
    cmcUrl: 'cmc.com',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
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
      { 'tokenId': 5, 'image': 'https://i.seadn.io/gae/ZoAedbU7HPpWA2PZVoDXDP9jnD7f89tQi_qswW9_4vdOh9boeHpawxDARmvSVWeZtVc9uMy1Y9vNkYO57MmWTp9PsLHzLr98Znm-3Q?auto=format&dpr=1&w=1000', 'link': collectionLinks['starter'] },
      { 'tokenId': 25, 'image': 'https://i.seadn.io/gae/68uO7RwfcZupc_CfKlH9hsK3tfZWBDetY_bqcnrHNN5LsxH7dsQLEkWyMWDmdp7lQI2oBR7e9IVPzhzXCyWfDQ3wwCIGSq-juA3L?auto=format&dpr=1&w=1000', 'link': collectionLinks['bronze'] },
      { 'tokenId': 54, 'image': 'https://i.seadn.io/gae/SE_Wv4fq1J1gUPr8VKFSAjYAB38VOD1ickB9-M-AkycRfQ5PHEe8NvgxLdQBA0dYVrOR5oO6sag-aZrziSad8fDkA0p8jRfy-MPmTIs?auto=format&dpr=1&w=1000', 'link': collectionLinks['silver'] },
      { 'tokenId': 67, 'image': 'https://i.seadn.io/gae/bHePLGqsdW8CP4PmRf0Q-Eoc03sT9ebaqgNLcjtW4lkufeowLQ1Z7-dqnBG-Nhzwefr-xY2We-ZIszraPcGJt0jZqoZnqex_lXj6hg?auto=format&dpr=1&w=1000', 'link': collectionLinks['gold'] },
    ],
    faq: [
      {
        title: "What is an NFT?",
        description: ["An NFT, or non-fungible token, is a digital asset that is unique and cannot be replaced. NFTs are often used to represent digital art, music, videos, and other collectibles. They can be bought, sold, and traded on NFT marketplaces."]
      },
      {
        title: "How do NFTs work?",
        description: ["NFTs are stored on a blockchain, which is a digital ledger that records transactions. The blockchain ensures that NFTs are secure and cannot be counterfeited."]
      },
      {
        title: "How do I buy an NFT?",
        description: ["To buy an NFT, you will need to create a digital wallet and fund it with cryptocurrency. You can then use your digital wallet to buy NFTs on an NFT marketplace."]
      }
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
    openSeaUrl: 'https://opensea.io/collection/coincollect-gold-nft',
    cmcUrl: 'cmc.com',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
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
    showCase: [
      { 'tokenId': 5, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_20.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 25, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_21.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 54, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_22.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 67, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_23.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
    ],
    faq: [
      {
        title: "What is an NFT?",
        description: ["An NFT, or non-fungible token, is a digital asset that is unique and cannot be replaced. NFTs are often used to represent digital art, music, videos, and other collectibles. They can be bought, sold, and traded on NFT marketplaces."]
      },
      {
        title: "How do NFTs work?",
        description: ["NFTs are stored on a blockchain, which is a digital ledger that records transactions. The blockchain ensures that NFTs are secure and cannot be counterfeited."]
      },
      {
        title: "How do I buy an NFT?",
        description: ["To buy an NFT, you will need to create a digital wallet and fund it with cryptocurrency. You can then use your digital wallet to buy NFTs on an NFT marketplace."]
      }
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
    openSeaUrl: 'https://opensea.io/collection/lotshare-nft',
    cmcUrl: 'cmc.com',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/lotShareApp',
  },
]

export default ifos
