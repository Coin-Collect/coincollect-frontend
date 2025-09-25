import { Token, ChainId } from '@coincollect/sdk'
import tokens from './tokens'
import farms from './farms'
import { Ifo, Minting } from './types'
import { getCoinCollectBronzeNftAddress, getCoinCollectGoldNftAddress, getCoinCollectNftAddress, getCoinCollectSilverNftAddress, getLotNftAddress, getBlitzBrawlerNftAddress, getAvatarsAiNftAddress, getBeastHunterNftAddress, getNitroNftAddress, getPlaceDjNftAddress, getZidanogoNftAddress, getSapienXNftAddress } from 'utils/addressHelpers'

//export const cakeBnbLpToken = new Token(ChainId.MAINNET, farms[1].lpAddresses[ChainId.MAINNET], 18, farms[1].lpSymbol)

const collectionLinks = {
  'starter': 'https://opensea.io/collection/coincollect-nfts',
  'bronze': 'https://opensea.io/collection/coincollect-bronze-nft',
  'silver': 'https://opensea.io/collection/coincollect-silver-nft',
  'gold': 'https://opensea.io/collection/coincollect-gold-nft',
  'lot': 'https://lotshare.app/'
}

const ifos: Minting[] = [
  //============================Free Mint NFTS====================================
  {
    id: 'coincollectfreenfts',
    stake_pid: 37,
    name: 'CoinCollect Starter NFT',
    description: 'CoinCollect Starter NFTs are most valuable FREE utility NFTs on the market. Starter NFT is a gift and a lifetime privilege to our community. Starter NFTs earn new tokens from pools and airdrops. it also has a chance on whitelists',
    address: getCoinCollectNftAddress(),
    symbol: 'STARTER',
    chainId: ChainId.POLYGON,
    totalSupply: 5000,
    isActive: true,
    status: 'finished',
    avatar: "https://coincollect.org/assets/images/clone/nft350.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banner-lg.png",
      small: "https://coincollect.org/assets/images/clone/banner-lg.png",
    },
    sampleNftImage: { 'tokenId': 5, 'image': 'https://i.seadn.io/gae/ZoAedbU7HPpWA2PZVoDXDP9jnD7f89tQi_qswW9_4vdOh9boeHpawxDARmvSVWeZtVc9uMy1Y9vNkYO57MmWTp9PsLHzLr98Znm-3Q?auto=format&dpr=1&w=1000', 'link': collectionLinks['starter'] },
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
    stake_pid: 37,
    name: 'CoinCollect Bronze NFT',
    description: 'CoinCollect Bronze NFTs are the cheapest valuable utility NFTs that has all the features of Starter NFTs also 5x more powerful than Starter NFTs. Bronze NFTs earn more than Starter NFTs from pools and airdrops. it also has more chance on whitelists',
    address: getCoinCollectBronzeNftAddress(),
    symbol: 'BRONZE',
    chainId: ChainId.POLYGON,
    totalSupply: 3300,
    lastPrice: 80,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileBronze.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerBronzeLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerBronzeSm.png",
    },
    sampleNftImage: { 'tokenId': 25, 'image': 'https://i.seadn.io/gae/68uO7RwfcZupc_CfKlH9hsK3tfZWBDetY_bqcnrHNN5LsxH7dsQLEkWyMWDmdp7lQI2oBR7e9IVPzhzXCyWfDQ3wwCIGSq-juA3L?auto=format&dpr=1&w=1000', 'link': collectionLinks['bronze'] },
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
    stake_pid: 37,
    name: 'CoinCollect Silver NFT',
    description: 'CoinCollect Silver NFTs are the medium powerful utility NFTs that has all the features of Bronze NFTs also 15x more powerful than Starter NFTs. Silver NFTs earn more than Bronze NFTs from pools and airdrops. it also has more chance on whitelists',
    address: getCoinCollectSilverNftAddress(),
    symbol: 'SILVER',
    chainId: ChainId.POLYGON,
    totalSupply: 2200,
    lastPrice: 155,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileSilver.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerSilverLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerSilverSm.png",
    },
    sampleNftImage: { 'tokenId': 54, 'image': 'https://i.seadn.io/gae/SE_Wv4fq1J1gUPr8VKFSAjYAB38VOD1ickB9-M-AkycRfQ5PHEe8NvgxLdQBA0dYVrOR5oO6sag-aZrziSad8fDkA0p8jRfy-MPmTIs?auto=format&dpr=1&w=1000', 'link': collectionLinks['silver'] },
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
    stake_pid: 37,
    name: 'CoinCollect Gold NFT',
    description: 'CoinCollect Gold NFTs are the most valuable utility NFTs that has all the features of Starter NFTs also 45x more powerful than Starter NFTs. Gold NFTs earn more than Silver NFTs from pools and airdrops. it also has more chance on whitelists',
    address: getCoinCollectGoldNftAddress(),
    symbol: 'GOLD',
    chainId: ChainId.POLYGON,
    totalSupply: 1100,
    lastPrice: 305,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/clone/banners/profileGold.png",
    banner: {
      large: "https://coincollect.org/assets/images/clone/banners/bannerGoldLg.png",
      small: "https://coincollect.org/assets/images/clone/banners/bannerGoldSm.png",
    },
    sampleNftImage: { 'tokenId': 67, 'image': 'https://i.seadn.io/gae/bHePLGqsdW8CP4PmRf0Q-Eoc03sT9ebaqgNLcjtW4lkufeowLQ1Z7-dqnBG-Nhzwefr-xY2We-ZIszraPcGJt0jZqoZnqex_lXj6hg?auto=format&dpr=1&w=1000', 'link': collectionLinks['gold'] },
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
    stake_pid: 28,
    name: 'LotShare Prime NFT',
    description: 'Embrace the future of land investment with LotShare, where blockchain technology tokenizes land lots for global access and liquidity. Leverage the exclusive LOT token to unlock rich benefits and secure your share in land sale revenues.',
    address: getLotNftAddress(),
    symbol: 'LOT',
    chainId: ChainId.POLYGON,
    totalSupply: 2556,
    lastPrice: 100,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
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
      saleAmount: '2556 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://lotshare.app/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/lotshare',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/CoinCollectOrg',
    twitterUrl: 'https://twitter.com/lotShareApp',
  },
  //============================BlitzBrawler NFTS====================================
  {
    id: 'blitzbrawlernfts',
    stake_pid: 32,
    name: 'BlitzBrawler Player',
    description: 'BlitzBrawler combines football with blockchain, allowing users to collect unique NFT brawlers to build teams and compete in tournaments. Features include staking, renting, trading, or selling NFTs.',
    address: getBlitzBrawlerNftAddress(),
    symbol: 'BRAWLER',
    chainId: ChainId.POLYGON,
    totalSupply: 4952,
    lastPrice: 30,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/partners/blitz/blitzLogo150.png",
    banner: {
      large: "https://coincollect.org/assets/images/partners/blitz/blitzBannerLg.png",
      small: "https://coincollect.org/assets/images/partners/blitz/blitzBannerSm.png",
    },
    showCase: [
      { 'tokenId': 8, 'image': 'https://i.seadn.io/gcs/files/d123afa62c649e05eef7778901f41844.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 134, 'image': 'https://i.seadn.io/gcs/files/d7ddf6e4d08cb15cf9d18ef9278d5b00.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 201, 'image': 'https://i.seadn.io/gcs/files/8df761db003534772e5c1ca088d9729e.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
      { 'tokenId': 94, 'image': 'https://i.seadn.io/gcs/files/5db953c72fedd2df4fea7ec4dd000f38.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/coincollect-gold-nft' },
    ],
    faq: [
      {
        title: "What is BlitzBrawler?",
        description: ["BlitzBrawler is an exciting universe where football meets blockchain. It includes 4952 unique NFTs called Brawlers (BlitzBrawler Players) and a token named BLITZ that powers the ecosystem."]
      },
      {
        title: "How do I get a Brawler NFT?",
        description: ["You can purchase already minted Brawlers on OpenSea or mint a fresh Brawler exclusively from CoinCollect at a more affordable rate and with exclusive benefits. Details are available on our official website."]
      },
      {
        title: "What is the BLITZ token?",
        description: ["BLITZ is the native token within the BlitzBrawler ecosystem, used for transactions, staking, trading, and more."]
      },
      {
        title: "How can I acquire BLITZ tokens?",
        description: ["BLITZ tokens can be purchased on CoinCollect and UniSwap. For more information on acquiring BLITZ tokens, visit blitzbrawler.com."]
      },
      {
        title: "Can I trade or sell my Brawler NFT?",
        description: ["Yes, Brawlers are fully tradable and can be sold or rented on OpenSea. They can also be staked or used in competitions within the BlitzBrawler universe."]
      },
      {
        title: "How many Brawlers are there?",
        description: ["There are a total of 4952 unique Brawler NFTs within the BlitzBrawler universe."]
      },
      {
        title: "How do I participate in tournaments?",
        description: ["Tournaments are integral to the BlitzBrawler experience. Detailed instructions on entering and competing are found on our website."]
      },
      {
        title: "Is my investment safe?",
        description: ["While we prioritize security, please exercise caution and do your research when investing. Consult a financial advisor if needed."]
      }
    ],
    poolUnlimited: {
      saleAmount: '4952 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://blitzbrawler.com/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/blitzbrawler',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/blitzbrawler',
    twitterUrl: 'https://twitter.com/blitz_brawler',
  },
  //============================AvatarsAI NFTS====================================
  {
    id: 'avatarsainfts',
    stake_pid: 33,
    name: 'AvatarsAI Heroes',
    description: 'AvatarsAI ignites a fierce battle in the digital realm. Heroes and villains, armed with unique powers, strive for control over the AI-driven blockchain universe. The stakes are high, alliances shift, and every decision echoes in a thrilling fight for dominion. Join the adventure at AvatarsAI.',
    address: getAvatarsAiNftAddress(),
    symbol: 'AVATAR',
    chainId: ChainId.POLYGON,
    totalSupply: 6952,
    lastPrice: 30,
    isActive: true,
    status: 'liveprivate', /// Options: livepublic, liveprivate
    avatar: "https://i.seadn.io/gcs/files/f4234250ffb80456f4e84baa17c59400.gif?auto=format&dpr=1&w=256",
    banner: {
      large: "https://coincollect.org/assets/images/partners/avatar/avatarBannerLg.png",
      small: "https://coincollect.org/assets/images/partners/avatar/avatarBannerSg.png",
    },
    sampleNftImage: { 'tokenId': 124, 'image': 'https://i.seadn.io/gcs/files/b304c520de38cca993b1898db62754b7.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/avatarsai-heroes' },
    showCase: [
      { 'tokenId': 139, 'image': 'https://i.seadn.io/gcs/files/f7f2eb06e446528308d979d5c939cc26.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/avatarsai-heroes' },
      { 'tokenId': 181, 'image': 'https://i.seadn.io/gcs/files/94e341a551e7817d96b92cb2a934621e.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/avatarsai-heroes' },
      { 'tokenId': 223, 'image': 'https://i.seadn.io/gcs/files/0fdfef3653530ea9068e34964d0468f6.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/avatarsai-heroes' },
      { 'tokenId': 226, 'image': 'https://i.seadn.io/gcs/files/7de4770f86ec2841b2ff7123921a96c9.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/avatarsai-heroes' },
    ],
    faq: [
      {
        title: "What is AvatarsAI?",
        description: ["AvatarsAI is a thrilling digital universe where heroes and villains battle for control over the AI-driven blockchain cosmos. Unique characters and exciting strategies unfold in the fight for digital dominion."]
      },
      {
        title: "How do I join the battle in AvatarsAI?",
        description: ["You can become part of the AvatarsAI world by visiting our website at https://avatarsai.net and following the instructions to engage in the battle for digital control."]
      },
      {
        title: "What makes each character unique?",
        description: ["Each character in AvatarsAI is endowed with unique powers, contributing to an ever-evolving strategy and blurring the lines between right and wrong. The choices and alliances you make impact the unfolding conflict."]
      },
      {
        title: "Can I trade or sell my characters?",
        description: ["Yes, characters within the AvatarsAI universe are tradable and can be sold on supported platforms. More details are available on our official website."]
      },
      {
        title: "What is the AVATAR token?",
        description: ["AVATAR is the intergalactic token that powers the AI in AvatarsAI and serves as the currency for the ecosystem. It is central to the operations and transactions within the AvatarsAI universe."]
      },
      {
        title: "How can I acquire AVATAR tokens?",
        description: ["You can buy and sell AVATAR tokens via CoinCollect or Uniswap. Detailed information on obtaining the tokens is available on our official website."]
      },
      {
        title: "Can I stake or farm AVATAR tokens?",
        description: ["Yes, you can stake and farm the AVATAR token on CoinCollect. For more information on staking and farming options, please visit our official website or CoinCollect's platform."]
      },
      {
        title: "Is my investment in AvatarsAI safe?",
        description: ["While we prioritize security in AvatarsAI, it's always wise to exercise caution and conduct thorough research when investing. Consult with a financial advisor if needed."]
      }
    ],

    poolUnlimited: {
      saleAmount: '6952 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://avatarsai.net/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/avatarsai-heroes',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/avatarsai',
    twitterUrl: 'https://twitter.com/avatarsainet',
  },
  //============================BeastHunter NFTS====================================
  {
    id: 'beasthunternfts',
    stake_pid: 34,
    name: 'Beast Hunter',
    description: 'Unleash the power of your Hunters in BeastHunter! Build an unbeatable team, capture rare beasts, and explore dynamic worlds.',
    address: getBeastHunterNftAddress(),
    symbol: 'HUNTER',
    chainId: ChainId.POLYGON,
    totalSupply: 2876,
    lastPrice: 25,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/partners/BeastHunter/logo.png",
    banner: {
      large: "https://coincollect.org/assets/images/partners/BeastHunter/hunterBannerLg.png",
      small: "https://coincollect.org/assets/images/partners/BeastHunter/hunterBannerSm.png",
    },
    sampleNftImage: { 'tokenId': 11, 'image': 'https://i.seadn.io/gcs/files/61a8fc82e1d50ccaf23023547c279cb1.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/beasthunterapp' },
    showCase: [
      { 'tokenId': 14, 'image': 'https://i.seadn.io/gcs/files/029a81eceacc8480218e80d1d71d681b.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/beasthunterapp' },
      { 'tokenId': 22, 'image': 'https://i.seadn.io/gcs/files/a7fdb712724a13bbb408a4b23900956f.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/beasthunterapp' },
      { 'tokenId': 53, 'image': 'https://i.seadn.io/gcs/files/a1142935770ee58562ffd8ff683150cb.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/beasthunterapp' },
      { 'tokenId': 48, 'image': 'https://i.seadn.io/gcs/files/e506eb06bdefffa3fe44e6100043b22f.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/beasthunterapp' },
    ],
    faq: [
      {
        title: "What is BeastHunter?",
        description: ["BeastHunter is a blockchain-based NFT game where players can build, train, and strategize with their unique team of Hunters. Capture rare beasts, explore dynamic ecosystems, and stake your way to glory—all while earning $HUNT tokens."]
      },
      {
        title: "How do I get started with BeastHunter?",
        description: ["To start your journey, you'll need to own a Hunter NFT. These can be bought on OpenSea or directly from our website during exclusive sales. Once you have a Hunter, you can immediately start capturing beasts and participating in staking and farming."]
      },
      {
        title: "What are the different Hunter types?",
        description: ["We have six unique Hunter types: Elementalist, Shadowmancer, Beast Tamer, Skyseer, Mechanist, and Warden. Each type has specific abilities and attributes that influence gameplay."]
      },
      {
        title: "What can I do with $HUNT tokens?",
        description: ["The $HUNT token is the lifeblood of the BeastHunter ecosystem. Use it for in-game purchases, staking rewards, participating in contests, and much more. It's your key to unlocking the full BeastHunter experience."]
      },
      {
        title: "Can I trade my Hunters and beasts?",
        description: ["Yes, all Hunters and captured beasts are NFTs that can be traded on OpenSea or any compatible NFT marketplace. Your digital assets are fully under your control."]
      },
      {
        title: "How can I join the community?",
        description: ["Our community is vibrant and ever-growing. Join our Discord and Telegram channels to stay up-to-date with the latest news, participate in community contests, and connect with other Hunters."]
      },
      {
        title: "What's the future for BeastHunter?",
        description: ["We have an exciting roadmap that includes new beast types, gameplay features, and partnerships. Each season brings new adventures and opportunities for our community."]
      }
    ],

    poolUnlimited: {
      saleAmount: '2876 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://beasthunter.app/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/beasthunterapp',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/beasthunterapp',
    twitterUrl: 'https://twitter.com/Beasthunterapp',
  },
  //============================Nitro NFTS====================================
  {
    id: 'nitronfts',
    stake_pid: 38,
    name: 'NitroClash',
    description: 'Choose from 5000+ customizable NFT cars, earn $NITRO tokens, and dominate tracks across the universe.',
    address: getNitroNftAddress(),
    symbol: 'CAR',
    chainId: ChainId.POLYGON,
    totalSupply: 3800,
    lastPrice: 30,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/partners/NitroClash/logo256.jpg",
    banner: {
      large: "https://coincollect.org/assets/images/partners/NitroClash/nitroBannerLg.jpg",
      small: "https://coincollect.org/assets/images/partners/NitroClash/nitroBannerSm.jpg",
    },
    sampleNftImage: { 'tokenId': 43, 'image': 'https://i.seadn.io/gcs/files/60b333cf442c9131c9dd0a076f653931.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/nitroclash' },
    showCase: [
      { 'tokenId': 40, 'image': 'https://i.seadn.io/gcs/files/213ece08802dc34ce1bf15c67f566e5a.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/nitroclash' },
      { 'tokenId': 11, 'image': 'https://i.seadn.io/gcs/files/0025ad2a545a5bc8bde8eb42174d2352.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/nitroclash' },
      { 'tokenId': 18, 'image': 'https://i.seadn.io/gcs/files/c466b87da33d890765bfee4cc2189e83.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/nitroclash' },
      { 'tokenId': 22, 'image': 'https://i.seadn.io/gcs/files/9a4bc0e58ee576d533048972f95cc851.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/nitroclash' },
    ],
    faq: [
      {
        title: "What is NitroClash?",
        description: ["NitroClash is a revolutionary Play-to-Earn NFT racing and combat game. Dive into high-octane battles, race to the finish line, and unlock the power of unique NFT cars. Each race, each combat, means more $NITRO tokens in your wallet."]
      },
      {
        title: "How do I get started with NitroClash?",
        description: ["Begin your NitroClash journey by minting or purchasing a unique car NFT. You can mint a fresh car using CoinCollect, buy one from platforms like OpenSea, or even stake your car at CoinCollect to start earning $NITRO tokens."]
      },
      {
        title: "What are the different car types in NitroClash?",
        description: ["We offer six distinctive car types in NitroClash: Speedster, Tank, Artillery, Racer, Combat, and Hybrid. Each car type has its own strengths and abilities that can be utilized in races and battles."]
      },
      {
        title: "How do I use $NITRO tokens?",
        description: ["$NITRO is the primary token of NitroClash. Use it to upgrade your cars, access special in-game features, stake for rewards, and trade in various crypto marketplaces. It's your gateway to the full NitroClash experience."]
      },
      {
        title: "Can I trade my NitroClash cars?",
        description: ["Absolutely! All NitroClash cars are NFTs, which means you can sell or trade them on NFT platforms like OpenSea, Element Market, and others. Every car NFT is your digital property, giving you full control and ownership."]
      },
      {
        title: "How can I engage with the NitroClash community?",
        description: ["The NitroClash community is buzzing with activity! Join our social platforms like Telegram, Twitter, and Instagram to connect with fellow racers, discuss strategies, and stay updated on the latest developments."]
      },
      {
        title: "What's in store for the future of NitroClash?",
        description: ["Our roadmap is loaded with electrifying updates, including new track terrains, powerful car abilities, partnerships, and seasonal events. The race has just begun, and the finish line is nowhere in sight!"]
      },
      {
        title: "How can I buy or trade NFT cars in NitroClash?",
        description: ["To acquire NitroClash car NFTs, you can mint new cars from CoinCollect or buy them from NFT marketplaces such as OpenSea, Element Market, and others. The choice is yours!"]
      }
    ],


    poolUnlimited: {
      saleAmount: '3800 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://nitroclash.net/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/nitroclash',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/nitroclash',
    twitterUrl: 'https://twitter.com/nitroclashnet',
  },
  //============================PlaceDJ NFTS====================================
  {
    id: 'placedjnfts',
    stake_pid: 40,
    name: 'PlaceDJ 2.0',
    description: 'PlaceDJ 2.0 offers over 5832 unique NFTs for license-free AI music streams, revolutionizing venue soundscapes with exclusive NFT benefits.',
    address: getPlaceDjNftAddress(),
    symbol: 'PLACEDJ',
    chainId: ChainId.POLYGON,
    totalSupply: 5832,
    lastPrice: 100,
    isActive: true,
    status: 'liveprivate', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/partners/placedj/logo512s.png",
    banner: {
      large: "https://coincollect.org/assets/images/partners/placedj/placedjBannerMin.png",
      small: "https://coincollect.org/assets/images/partners/placedj/banner2.gif",
    },
    sampleNftImage: { 'tokenId': 43, 'image': 'https://i.seadn.io/s/raw/files/ac74e2307650b86343144f0e324d69c9.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/placedj' },
    showCase: [
      { 'tokenId': 40, 'image': 'https://i.seadn.io/s/raw/files/1ca0d4cdf100351c7df6a302b1ffd218.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/placedj' },
      { 'tokenId': 11, 'image': 'https://i.seadn.io/s/raw/files/9f032dc7201a737ba99f64f5c01e4197.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/placedj' },
      { 'tokenId': 18, 'image': 'https://i.seadn.io/s/raw/files/98030b144471dca11340187b68f93a8b.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/placedj' },
      { 'tokenId': 22, 'image': 'https://i.seadn.io/s/raw/files/815047510bb37b12b7d5c07556b98049.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/placedj' },
    ],
    faq: [
      {
        title: "What is PlaceDJ 2.0?",
        description: ["PlaceDJ 2.0 is a cutting-edge music streaming service, offering over 5000 unique NFTs for AI-powered, license-free music tailored to different venues. It provides exclusive benefits and customization options to enhance any environment."]
      },
      {
        title: "How do I get started with PlaceDJ 2.0?",
        description: ["Start your PlaceDJ 2.0 experience by acquiring an NFT from our collection. These NFTs grant access to our extensive library of AI-curated, license-free tracks, perfectly suited for your venue's unique atmosphere."]
      },
      {
        title: "What unique features does PlaceDJ 2.0 offer?",
        description: ["PlaceDJ 2.0 stands out with its AI-driven music curation, license-free streaming, and exclusive NFTs that unlock tailored playlists and soundscapes for various venues, ensuring a unique auditory experience."]
      },
      {
        title: "Where can I acquire PlaceDJ 2.0 NFTs?",
        description: ["PlaceDJ 2.0 NFTs can be purchased from our platform or traded on leading NFT marketplaces. Owning these NFTs not only enhances your venue's ambiance but also adds to your digital asset collection."]
      },
      {
        title: "How does PlaceDJ 2.0 benefit venue owners?",
        description: ["Venue owners benefit from PlaceDJ 2.0 by accessing a vast, AI-curated, license-free music library, eliminating the need for music licensing fees while providing an unmatched auditory experience to their customers."]
      },
      {
        title: "What's next for PlaceDJ 2.0?",
        description: ["The future of PlaceDJ 2.0 includes expanding our NFT collection, integrating more AI-powered features for music customization, and forming partnerships to further enhance the venue music streaming experience."]
      },
      {
        title: "Can I participate in the PlaceDJ 2.0 community?",
        description: ["Join the PlaceDJ 2.0 community on platforms like Telegram and Twitter to connect with other users, share experiences, and stay updated on the latest features and developments in venue music streaming."]
      }
    ],



    poolUnlimited: {
      saleAmount: '5832 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://placedj.com/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/placedj',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/placedjcom',
    twitterUrl: 'https://twitter.com/placedjcom',
  },
  //============================Zidanogo NFTS====================================
  {
    id: 'zidanogonfts',
    stake_pid: 36,
    name: 'Zidanogo GentleMals',
    description: 'Zidanogo introduces 4181 GentleMals NFTs, showcasing sophisticated animal characters. Each NFT is a unique collectible granting access to exclusive platform airdrops.',
    address: getZidanogoNftAddress(),
    symbol: 'GMAL',
    chainId: ChainId.POLYGON,
    totalSupply: 4181,
    lastPrice: 50,
    isActive: true,
    status: 'livepublic', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/partners/zidanogo/zLogoBlack512-min.png",
    banner: {
      large: "https://coincollect.org/assets/images/partners/zidanogo/zidanogoBannerLg-min.png",
      small: "https://coincollect.org/assets/images/partners/zidanogo/zidanogoBannerSm-min.png",
    },
    sampleNftImage: { 'tokenId': 143, 'image': 'https://i.seadn.io/s/raw/files/51d599e09a1e1ceecc4209ac0ad67005.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
    showCase: [
      { 'tokenId': 140, 'image': 'https://i.seadn.io/s/raw/files/a41f6da05262174042fec9a35cdf2793.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
      { 'tokenId': 131, 'image': 'https://i.seadn.io/s/raw/files/af938b31fb0031449c53c91f2ecdd1d6.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
      { 'tokenId': 418, 'image': 'https://i.seadn.io/s/raw/files/f5a9da7b2860e515dd7bc19299c7e75c.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
      { 'tokenId': 26, 'image': 'https://i.seadn.io/s/raw/files/72b21f1a6a37af0a0951259af8646484.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
    ],
    faq: [
      {
        title: "What is Zidanogo?",
        description: ["Zidanogo showcases 4181 GentleMals NFTs, each depicting a sophisticated, gentleman-like animal character. These unique digital collectibles unlock exclusive platform airdrops, enhancing the NFT ownership experience."]
      },
      {
        title: "How can I acquire a GentleMal NFT?",
        description: ["Acquire your own GentleMal NFT directly from the Zidanogo platform or through secondary NFT marketplaces. Each NFT serves as a unique digital asset and a key to unlock special platform rewards."]
      },
      {
        title: "What benefits do GentleMal NFT owners receive?",
        description: ["GentleMal NFT owners enjoy exclusive airdrops, access to special events, and potential future utilities within the Zidanogo ecosystem, adding value beyond mere collectibility."]
      },
      {
        title: "Can I trade or sell my GentleMal NFT?",
        description: ["Yes, GentleMal NFTs can be traded or sold on recognized NFT marketplaces, allowing owners to leverage the dynamic NFT market while still enjoying the benefits provided by the Zidanogo platform."]
      },
      {
        title: "What makes GentleMals unique?",
        description: ["GentleMals stand out with their elegant, gentleman-like designs and the dual utility of being both collectible art pieces and keys to platform-specific perks, fostering a vibrant community of collectors and enthusiasts."]
      },
      {
        title: "Are there any upcoming features for GentleMal NFT holders?",
        description: ["Zidanogo is constantly innovating, with plans to expand the GentleMal universe through additional content, interactive features, and community-driven events, enhancing the value and experience of NFT ownership."]
      },
      {
        title: "How can I join the Zidanogo community?",
        description: ["Engage with the Zidanogo community on social media platforms and our official Discord server to connect with fellow enthusiasts, share insights, and stay informed on the latest developments and opportunities."]
      }
    ],




    poolUnlimited: {
      saleAmount: '4181 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://zidanogo.com/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/zidanogo',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/mPKy3jdYU9',
    telegramUrl: 'https://t.me/zidanogo',
    twitterUrl: 'https://twitter.com/zidanogo',
  },
  //============================SapienX NFTS====================================
  {
    id: 'sapienxnfts',
    stake_pid: 41,
    name: 'SapienX AI',
    description: 'SapienX, developed and operated by AI, is governed by a DAO and has 6854 NFTs and the $X token, creating AI tools that elevate humans to superhuman levels.',
    address: getSapienXNftAddress(),
    symbol: 'AGENT',
    chainId: ChainId.POLYGON,
    totalSupply: 6854,
    lastPrice: 150,
    isActive: true,
    status: 'liveprivate', /// Options: livepublic, liveprivate
    avatar: "https://coincollect.org/assets/images/partners/sapienx/SapienXlogo.gif",
    banner: {
      large: "https://coincollect.org/assets/images/partners/cyberpunk/bannerLg-min.png",
      small: "https://coincollect.org/assets/images/partners/sapienx/sapienBannerSm-min.png",
    },
    sampleNftImage: { 'tokenId': 143, 'image': 'https://i.seadn.io/s/raw/files/028ad8eedc276e552b5f8b601ad6d7d0.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
    showCase: [
      { 'tokenId': 1240, 'image': 'https://i.seadn.io/s/raw/files/294297d4399aaa420c41ce846e0daac6.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
      { 'tokenId': 211, 'image': 'https://i.seadn.io/s/raw/files/1b265f996decbd80828eb91530733252.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
      { 'tokenId': 514, 'image': 'https://i.seadn.io/s/raw/files/8a56af988c84464c300a651f57d795b3.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
      { 'tokenId': 261, 'image': 'https://i.seadn.io/s/raw/files/c9867cbec32c80129a0b19f6869446db.png?auto=format&dpr=1&w=1000', 'link': 'https://opensea.io/collection/zidanogo' },
    ],
    faq: [
      {
        "title": "What is SapienX?",
        "description": ["SapienX is an AI-driven platform that blends AI with Web3 technology to transform humans into superhumans by providing advanced tools and processes. Governed by a DAO and utilizing NFTs and the $X token, it fosters a secure, efficient, and community-driven ecosystem."]
      },
      {
        "title": "How does SapienX enhance human capabilities?",
        "description": ["SapienX creates AI tools that augment human decision-making, creativity, and efficiency, offering users superhuman abilities. These tools are accessible within the SapienX ecosystem, leveraging the power of AI to push the boundaries of what individuals and businesses can achieve."]
      },
      {
        "title": "What role do NFTs play in the SapienX ecosystem?",
        "description": ["Within the SapienX ecosystem, NFTs are not just unique digital assets but also powerful tools within the DAO, instrumental in shaping the platform's future. They grant holders access to exclusive features and play a crucial role in unlocking superhuman capabilities, thereby offering significant value and utility."]
      },
      {
        "title": "How can I acquire $X tokens?",
        "description": ["The $X token is yet to be released. Its launch will utilize both Initial DEX Offering (IDO) and Initial Exchange Offering (IEO) methods. Additionally, $X tokens will be available through whitelisting and airdrops on various platforms. Stay tuned for updates on how to participate in these opportunities."]
      },
      {
        "title": "What benefits do $X token holders receive?",
        "description": ["$X token holders enjoy governance rights within the SapienX DAO, access to premium features, and the opportunity to participate in exclusive events and rewards, fostering a rich and engaging community experience."]
      },
      {
        "title": "Can I trade or sell my SapienX NFTs?",
        "description": ["Yes, SapienX NFTs can be traded or sold on recognized NFT marketplaces, enabling owners to capitalize on the vibrant NFT market while enjoying the unique benefits and utilities offered by the SapienX ecosystem."]
      },
      {
        "title": "What makes SapienX unique?",
        "description": ["SapienX stands out for its integration of AI and Web3 technologies to empower users with superhuman capabilities, governed by a DAO, and its unique approach to utilizing NFTs and the $X token to provide a secure, efficient, and user-centric platform."]
      },
      {
        "title": "How can I join the SapienX community?",
        "description": ["Join the SapienX community on social media platforms and our official channels to connect with like-minded individuals, share experiences, and stay updated on the latest innovations and opportunities within the ecosystem."]
      }
    ],




    poolUnlimited: {
      saleAmount: '6854 NFT',
      distributionRatio: 1,
    },
    currency: tokens.cake,
    token: tokens.collect,
    releaseBlockNumber: 15156634,
    articleUrl: 'https://sapienx.app/',
    version: 3.1,
    openSeaUrl: 'https://opensea.io/collection/sapienxapp',
    //cmcUrl: 'https://coinmarketcap.com/currencies/coincollect/',
    discordUrl: 'https://discord.gg/FW9dnRFZk9',
    telegramUrl: 'https://t.me/sapienapp',
    twitterUrl: 'https://twitter.com/sapienapp',
  },
]

export default ifos
