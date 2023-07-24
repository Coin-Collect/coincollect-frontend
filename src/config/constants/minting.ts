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
    stake_pid: 1,
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
        title: "What types of NFTs does CoinCollect offer?",
        description: ["CoinCollect provides four distinct categories of NFTs, namely Starter, Bronze, Silver, and Gold. The Starter NFT is a free offering intended for community development and surprisingly includes all advantages seen in the other types. The Gold NFT is considered the most prestigious and valuable among the available categories."]
      },
      {
        title: "What benefits do I get from CoinCollect NFTs?",
        description: ["Owning a CoinCollect NFT carries a slew of perks. These include the ability to stake your NFTs in any active pool on CoinCollect to accumulate new tokens. You'll also gain access to all pools on the claim page, secure discounts across various collections, be whitelisted for upcoming projects, participate in exclusive minting events, and obtain a special Discord role in our owned communities. The platform is also continually working on launching more exciting benefits."]
      },
      {
        title: "How can I get these NFTs?",
        description: ["For acquiring a Starter NFT, you need to check secondary marketplaces like OpenSea. However, the Bronze, Silver, and Gold NFTs can be directly minted on CoinCollect. With every sale, the pricing elevates, naturally causing an increase in the floor price."]
      },
      {
        title: "Can I use CoinCollect NFTs on other platforms?",
        description: ["Yes, you certainly can. CoinCollect NFTs are built on the Polygon blockchain and are thus compatible with any other marketplaces that support Polygon, such as OpenSea."]
      },
      {
        title: "What's the value growth potential for these NFTs?",
        description: ["The valuation of the NFTs is designed to increase as their availability decreases. Therefore, as sales progress, the floor price climbs accordingly, suggesting a potential for value appreciation."]
      },
      {
        title: "How secure are CoinCollect NFTs?",
        description: ["CoinCollect NFTs are self-custodial, implying that you are in charge of securing your wallet. When your NFTs are staked in our pools, they are protected by reliable, open-source smart contracts on the blockchain adhering to market-standard security practices."]
      },
      {
        title: "What can I do with CoinCollect NFTs if I buy one?",
        description: ["If you purchase a CoinCollect NFT, you can benefit from various features. You can claim your tokens directly from the Claim Page and stake them in any pool via the NFT Stake page. Additionally, you can enjoy a discount on subsequent purchases from any collection of your choice. Exclusive Discord roles are also accessible from our Discord server. Lastly, if you wish to sell your NFT, you can do so on OpenSea or any other preferred marketplace."]
      },
      {
        title: "Why should I buy a CoinCollect NFT?",
        description: ["Purchasing a CoinCollect NFT offers the opportunity for passive income through staking and the potential for value appreciation. Owners enjoy exclusive benefits, including access to new projects, private minting events, special Discord roles, and discounts on subsequent purchases. Furthermore, as CoinCollect is an evolving, innovative DeFi platform, investing in its NFTs allows you to be part of a dynamic and forward-thinking community."]
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
    cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================Bronze NFTS====================================
  {
    id: 'coincollectbronzefts',
    stake_pid: 2,
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
        title: "What types of NFTs does CoinCollect offer?",
        description: ["CoinCollect provides four distinct categories of NFTs, namely Starter, Bronze, Silver, and Gold. The Starter NFT is a free offering intended for community development and surprisingly includes all advantages seen in the other types. The Gold NFT is considered the most prestigious and valuable among the available categories."]
      },
      {
        title: "What benefits do I get from CoinCollect NFTs?",
        description: ["Owning a CoinCollect NFT carries a slew of perks. These include the ability to stake your NFTs in any active pool on CoinCollect to accumulate new tokens. You'll also gain access to all pools on the claim page, secure discounts across various collections, be whitelisted for upcoming projects, participate in exclusive minting events, and obtain a special Discord role in our owned communities. The platform is also continually working on launching more exciting benefits."]
      },
      {
        title: "How can I get these NFTs?",
        description: ["For acquiring a Starter NFT, you need to check secondary marketplaces like OpenSea. However, the Bronze, Silver, and Gold NFTs can be directly minted on CoinCollect. With every sale, the pricing elevates, naturally causing an increase in the floor price."]
      },
      {
        title: "Can I use CoinCollect NFTs on other platforms?",
        description: ["Yes, you certainly can. CoinCollect NFTs are built on the Polygon blockchain and are thus compatible with any other marketplaces that support Polygon, such as OpenSea."]
      },
      {
        title: "What's the value growth potential for these NFTs?",
        description: ["The valuation of the NFTs is designed to increase as their availability decreases. Therefore, as sales progress, the floor price climbs accordingly, suggesting a potential for value appreciation."]
      },
      {
        title: "How secure are CoinCollect NFTs?",
        description: ["CoinCollect NFTs are self-custodial, implying that you are in charge of securing your wallet. When your NFTs are staked in our pools, they are protected by reliable, open-source smart contracts on the blockchain adhering to market-standard security practices."]
      },
      {
        title: "What can I do with CoinCollect NFTs if I buy one?",
        description: ["If you purchase a CoinCollect NFT, you can benefit from various features. You can claim your tokens directly from the Claim Page and stake them in any pool via the NFT Stake page. Additionally, you can enjoy a discount on subsequent purchases from any collection of your choice. Exclusive Discord roles are also accessible from our Discord server. Lastly, if you wish to sell your NFT, you can do so on OpenSea or any other preferred marketplace."]
      },
      {
        title: "Why should I buy a CoinCollect NFT?",
        description: ["Purchasing a CoinCollect NFT offers the opportunity for passive income through staking and the potential for value appreciation. Owners enjoy exclusive benefits, including access to new projects, private minting events, special Discord roles, and discounts on subsequent purchases. Furthermore, as CoinCollect is an evolving, innovative DeFi platform, investing in its NFTs allows you to be part of a dynamic and forward-thinking community."]
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
    cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================Silver NFTS====================================
  {
    id: 'coincollectsilverfts',
    stake_pid: 3,
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
        title: "What types of NFTs does CoinCollect offer?",
        description: ["CoinCollect provides four distinct categories of NFTs, namely Starter, Bronze, Silver, and Gold. The Starter NFT is a free offering intended for community development and surprisingly includes all advantages seen in the other types. The Gold NFT is considered the most prestigious and valuable among the available categories."]
      },
      {
        title: "What benefits do I get from CoinCollect NFTs?",
        description: ["Owning a CoinCollect NFT carries a slew of perks. These include the ability to stake your NFTs in any active pool on CoinCollect to accumulate new tokens. You'll also gain access to all pools on the claim page, secure discounts across various collections, be whitelisted for upcoming projects, participate in exclusive minting events, and obtain a special Discord role in our owned communities. The platform is also continually working on launching more exciting benefits."]
      },
      {
        title: "How can I get these NFTs?",
        description: ["For acquiring a Starter NFT, you need to check secondary marketplaces like OpenSea. However, the Bronze, Silver, and Gold NFTs can be directly minted on CoinCollect. With every sale, the pricing elevates, naturally causing an increase in the floor price."]
      },
      {
        title: "Can I use CoinCollect NFTs on other platforms?",
        description: ["Yes, you certainly can. CoinCollect NFTs are built on the Polygon blockchain and are thus compatible with any other marketplaces that support Polygon, such as OpenSea."]
      },
      {
        title: "What's the value growth potential for these NFTs?",
        description: ["The valuation of the NFTs is designed to increase as their availability decreases. Therefore, as sales progress, the floor price climbs accordingly, suggesting a potential for value appreciation."]
      },
      {
        title: "How secure are CoinCollect NFTs?",
        description: ["CoinCollect NFTs are self-custodial, implying that you are in charge of securing your wallet. When your NFTs are staked in our pools, they are protected by reliable, open-source smart contracts on the blockchain adhering to market-standard security practices."]
      },
      {
        title: "What can I do with CoinCollect NFTs if I buy one?",
        description: ["If you purchase a CoinCollect NFT, you can benefit from various features. You can claim your tokens directly from the Claim Page and stake them in any pool via the NFT Stake page. Additionally, you can enjoy a discount on subsequent purchases from any collection of your choice. Exclusive Discord roles are also accessible from our Discord server. Lastly, if you wish to sell your NFT, you can do so on OpenSea or any other preferred marketplace."]
      },
      {
        title: "Why should I buy a CoinCollect NFT?",
        description: ["Purchasing a CoinCollect NFT offers the opportunity for passive income through staking and the potential for value appreciation. Owners enjoy exclusive benefits, including access to new projects, private minting events, special Discord roles, and discounts on subsequent purchases. Furthermore, as CoinCollect is an evolving, innovative DeFi platform, investing in its NFTs allows you to be part of a dynamic and forward-thinking community."]
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
    cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================Gold NFTS====================================
  {
    id: 'coincollectgoldfts',
    stake_pid: 4,
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
        title: "What types of NFTs does CoinCollect offer?",
        description: ["CoinCollect provides four distinct categories of NFTs, namely Starter, Bronze, Silver, and Gold. The Starter NFT is a free offering intended for community development and surprisingly includes all advantages seen in the other types. The Gold NFT is considered the most prestigious and valuable among the available categories."]
      },
      {
        title: "What benefits do I get from CoinCollect NFTs?",
        description: ["Owning a CoinCollect NFT carries a slew of perks. These include the ability to stake your NFTs in any active pool on CoinCollect to accumulate new tokens. You'll also gain access to all pools on the claim page, secure discounts across various collections, be whitelisted for upcoming projects, participate in exclusive minting events, and obtain a special Discord role in our owned communities. The platform is also continually working on launching more exciting benefits."]
      },
      {
        title: "How can I get these NFTs?",
        description: ["For acquiring a Starter NFT, you need to check secondary marketplaces like OpenSea. However, the Bronze, Silver, and Gold NFTs can be directly minted on CoinCollect. With every sale, the pricing elevates, naturally causing an increase in the floor price."]
      },
      {
        title: "Can I use CoinCollect NFTs on other platforms?",
        description: ["Yes, you certainly can. CoinCollect NFTs are built on the Polygon blockchain and are thus compatible with any other marketplaces that support Polygon, such as OpenSea."]
      },
      {
        title: "What's the value growth potential for these NFTs?",
        description: ["The valuation of the NFTs is designed to increase as their availability decreases. Therefore, as sales progress, the floor price climbs accordingly, suggesting a potential for value appreciation."]
      },
      {
        title: "How secure are CoinCollect NFTs?",
        description: ["CoinCollect NFTs are self-custodial, implying that you are in charge of securing your wallet. When your NFTs are staked in our pools, they are protected by reliable, open-source smart contracts on the blockchain adhering to market-standard security practices."]
      },
      {
        title: "What can I do with CoinCollect NFTs if I buy one?",
        description: ["If you purchase a CoinCollect NFT, you can benefit from various features. You can claim your tokens directly from the Claim Page and stake them in any pool via the NFT Stake page. Additionally, you can enjoy a discount on subsequent purchases from any collection of your choice. Exclusive Discord roles are also accessible from our Discord server. Lastly, if you wish to sell your NFT, you can do so on OpenSea or any other preferred marketplace."]
      },
      {
        title: "Why should I buy a CoinCollect NFT?",
        description: ["Purchasing a CoinCollect NFT offers the opportunity for passive income through staking and the potential for value appreciation. Owners enjoy exclusive benefits, including access to new projects, private minting events, special Discord roles, and discounts on subsequent purchases. Furthermore, as CoinCollect is an evolving, innovative DeFi platform, investing in its NFTs allows you to be part of a dynamic and forward-thinking community."]
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
    cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/CoinCollectOrg',
  },
  //============================LOT NFTS====================================
  {
    id: 'lotnfts',
    stake_pid: 5,
    name: 'LotShare Prime NFT',
    description: 'Embrace the future of land investment with LotShare, where blockchain technology tokenizes land lots for global access and liquidity. Leverage the exclusive LOT token to unlock rich benefits and secure your share in land sale revenues.',
    address: getLotNftAddress(),
    symbol: 'LOT',
    totalSupply: 2556,
    isActive: true,
    status: 'liveprivate', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileLot.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerLotLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerLotSm.png",
    },
    showCase: [
      { 'tokenId': 57, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_20.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 245, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_21.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 454, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_22.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 679, 'image': 'https://coincollect.org/assets/images/showcase/lotNFT_23.png', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
    ],
    faq: [
      {
        title: "What is LotShare?",
        description: ["LotShare is a revolutionary real estate investment platform. It democratizes land ownership by tokenizing land lots, offering global accessibility, and empowering a new generation of property investors with smart contract power, shared revenue opportunities, and enhanced liquidity."]
      },
      {
        title: "How does LotShare work?",
        description: ["LotShare acquires land and divides it into smaller units, represented by NFTs. These NFTs are available for purchase on the LotShare platform and OpenSea. When land sales occur, revenue is distributed among NFT holders, fostering shared success and value creation."]
      },
      {
        title: "What is the LOT token and what benefits does it offer?",
        description: ["The LOT token is integral to the LotShare ecosystem. It enables you to buy, sell, or trade land NFTs, provides access to early land lot releases, and allows you to take part in ecosystem governance. Additionally, holding the LOT token can yield transaction fee discounts, staking rewards, and a share of revenue from land sales."]
      },
      {
        title: "What are LotShare Prime NFTs?",
        description: ["LotShare Prime NFTs are special assets that offer additional benefits to their holders, including insurance, VIP membership, discounts, early access, special offers, priority support, and community participation."]
      },
      {
        title: "How can I earn from LotShare?",
        description: ["Investors can earn from LotShare through the shared revenue model, which fairly distributes the revenue from land sales among NFT holders. Additionally, holding and staking LOT tokens yield rewards, and LOT token holders can benefit from transaction fee discounts."]
      },
      {
        title: "Is there flexibility in investing with LotShare?",
        description: ["Yes, LotShare offers unparalleled liquidity and flexibility in land investments. Investors can buy, sell, or trade their NFTs whenever they want or return them at a low cost."]
      },
      {
        title: "How is transparency and reliability ensured with LotShare?",
        description: ["LotShare leverages smart contract technology to ensure transparent and reliable transactions. All transactions and commissions are recorded openly and are auditable."]
      },
      {
        title: "What future plans does LotShare have for expansion?",
        description: ["LotShare plans to consistently add new land lots to its portfolio using cost-effective methods, providing new opportunities and potential for value creation for investors."]
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
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/lotShareApp',
  },
]

export default ifos
