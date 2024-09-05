import { serializeTokens } from './tokens'
import { SerializedNftFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const nftFarms: SerializedNftFarmConfig[] = [
  {
    pid: 1,
    lpSymbol: 'CoinCollect Starter NFT',
    nftAddresses: {
      137: '0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD',
      80001: '0x11DdF94710AD390063357D532042Bd5f23A3fBd6'
    },
    banner: "https://coincollect.org/assets/images/clone/banner-lg.png",
    avatar: "https://coincollect.org/assets/images/clone/nft350.png",
    isFinished: true,
  },
  {
    pid: 2,
    lpSymbol: 'CoinCollect Bronze NFT',
    nftAddresses: {
      137: '0x0B8E7D22CE826f1228a82525b8779dBdD9E24B80',
      80001: '0x2c65d5355813D3E1f86d1c9b25DCFF367bBd913D' 
    },
    banner: "https://coincollect.org/assets/images/clone/banners/bannerBronzeSm.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileBronze.png",
    isFinished: true,
  },
  {
    pid: 3,
    lpSymbol: 'CoinCollect Silver NFT',
    nftAddresses: {
      137: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9',
      80001: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9' 
    },
    banner: "https://coincollect.org/assets/images/clone/banners/bannerSilverSm.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileSilver.png",
    isFinished: true,
  },
  {
    pid: 4,
    lpSymbol: 'CoinCollect Gold NFT',
    nftAddresses: {
      137: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e',
      80001: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e'
    },
    banner: "https://coincollect.org/assets/images/clone/banners/bannerGoldSm.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileGold.png",
    isFinished: true,
  },
  {
    pid: 5,
    lpSymbol: 'Lot NFT',
    nftAddresses: {
      137: '0x2E1cF0960Fc9Ece56f53bf58351d175cd1867b2c',
      80001: '0xDb37c24423F63F0245def80a4904204337F90651'
    },
    contractAddresses: {
      137: '0x2b0dcF4f55A6f19aF410D7BD51bbfAb499Bb5C84',
      80001: '0x02905b3528f0D737BB324A202B7F79eA0e9d808d',
    },
    tokenPerBlock: '0.000152',
    participantThreshold: 300,
    isFinished: false,
    earningToken: serializedTokens.lot,
    sideRewards: [
      {token: 'COLLECT', percentage: 6670},
      {token: 'SHIB', percentage: 33350},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://lotshare.app/',
    },
    banner: "https://coincollect.org/assets/images/clone/banners/bannerLotSm.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileLot.png",
  },
  {
    pid: 6,
    lpSymbol: 'Starter SHIB',
    nftAddresses: {
      137: '0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD',
      80001: '0x11DdF94710AD390063357D532042Bd5f23A3fBd6',
    },
    contractAddresses: {
      137: '0x923993b7Ee04C727E0404246Fa3D8A6254661C0f',
      80001: '0x0d579904aD91D6C642eE60cD4c6f94540e306537',
    },
    tokenPerBlock: '0.0077',
    participantThreshold: 100,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 500},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://coincollect.org/',
    },
    banner: "https://coincollect.org/assets/images/showcase/shibStarter.png",
    avatar: "https://coincollect.org/assets/images/clone/nft350.png",
  },
  {
    pid: 7,
    lpSymbol: 'Bronze SHIB',
    nftAddresses: {
      137: '0x0B8E7D22CE826f1228a82525b8779dBdD9E24B80',
      80001: '0x2c65d5355813D3E1f86d1c9b25DCFF367bBd913D' 
    },
    contractAddresses: {
      137: '0x341b6d0F22dac4F7ECABDA0f1fC7cE383BE62D19',
      80001: '0x1DD7cb6eb48FC04639d22fA237AD879C66eeE5E4',
    },
    tokenPerBlock: '0.023',
    participantThreshold: 60,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 300},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://coincollect.org/',
    },
    banner: "https://coincollect.org/assets/images/showcase/shibBronze.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileBronze.png",
  },
  {
    pid: 8,
    lpSymbol: 'Silver SHIB',
    nftAddresses: {
      137: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9',
      80001: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9' 
    },
    contractAddresses: {
      137: '0xe6218d87974474885Fb1Ad2E42969F09F94cD3b8',
      80001: '0x68D73e5F25d36EeACD4b665b25AC090b66195c76',
    },
    tokenPerBlock: '0.0224',
    participantThreshold: 25,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 214},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://coincollect.org/',
    },
    banner: "https://coincollect.org/assets/images/showcase/shibSilver.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileSilver.png",
  },
  {
    pid: 9,
    lpSymbol: 'Gold SHIB',
    nftAddresses: {
      137: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e',
      80001: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e'
    },
    contractAddresses: {
      137: '0xA01C4679Db07830c46661008cAFaEB9DaAA93953',
      80001: '0x16ABF1d9AF710E689d3C476D05420d55B1C399a9',
    },
    tokenPerBlock: '0.0306',
    participantThreshold: 15,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 188},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://coincollect.org/',
    },
    banner: "https://coincollect.org/assets/images/showcase/shibGold.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileGold.png",
  },
  {
    pid: 10,
    lpSymbol: 'Collectors Pool',
    nftAddresses: {
      137: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e',
      80001: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e'
    },
    contractAddresses: {
      137: '0x16502F33EEbA9F178B361793edD6A7c064667538',
      80001: '0xE9226Ca92900B4A0CC474B3514d51fE23347F98d',
    },
    tokenPerBlock: '0.000021',
    participantThreshold: 150,
    isFinished: false,
    earningToken: serializedTokens.usdt,
    sideRewards: [
      {token: 'COLLECT', percentage: 166667},
    ],
    supportedCollectionPids: [1,2,3],
    collectionPowers: [1,1,1,1],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://coincollect.org/',
    },
    banner: "https://coincollect.org/assets/images/showcase/tetherPool.png",
    avatar: "https://coincollect.org/assets/images/showcase/250logo.png",
  },
  {
    pid: 11,
    lpSymbol: 'Brawler NFT',
    nftAddresses: {
      137: '0x7121D40FDe5F2a82674262b8601DEcd9E066C936',
      80001: '0x3bc9134913CD9B3Bf0C72280CF14fe93D5EABE50'
    },
    contractAddresses: {
      137: '0x43C430fcA944675BA7FF9Fc150d9FEa901367f52',
      80001: '0xfB877EE2a65fb56b4FBb1822497f02d3De9737f7',
    },
    tokenPerBlock: '0.01',
    participantThreshold: 1950, // Weight x Target Nft Count(130)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'BLITZ', percentage: 34000},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://blitzbrawler.com/',
    },
  },
  {
    pid: 12,
    lpSymbol: 'AVATAR NFT',
    nftAddresses: {
      137: '0x7B1Ead5f2d144D6F8b0eDD3090cB7713A615C3C5',
      80001: '0xdf4a8a0f9a3Cf3a97f04DFfEE4ABAe71496Ae49f'
    },
    contractAddresses: {
      137: '0x06703Ce4494dDF7DD918BB9298B010B5ad6C4c4D',
      80001: '0x2bc8F0560C6a00032005711AdC316fa9D9823eA6',
    },
    tokenPerBlock: '0.0116',
    participantThreshold: 2250, // Weight(15) x Target Nft Count(150)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'AVATAR', percentage: 298000},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://avatarsai.net/',
    },
  },
  {
    pid: 13,
    lpSymbol: 'GALXE OATs',
    isCommunity: true,
    nftAddresses: {
      137: '0x5D666F215a85B87Cb042D59662A7ecd2C8Cc44e6',
      80001: '0xf2149E6B11638BAEf791e3E66ac7E6469328e840'
    },
    contractAddresses: {
      137: '0xA2f3fdb09F9f98070D71A55b2876537F8c3D9255',
      80001: '0xa00645C2498EFa1688A7d83F8371F10068545539',
    },
    tokenPerBlock: '0.0154',
    participantThreshold: 2400, // Weight(1) x Target Nft Count(1900) & Weight(5) x Target Nft Count(100)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'AVATAR', percentage: 40000},
      {token: 'BLITZ', percentage: 4100},
    ],
    //supportedCollectionPids: [],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://galxe.com/CoinCollect',
      getNftLink: "https://galxe.com/CoinCollect"
    },
    banner: "https://coincollect.org/assets/images/partners/galxe/galxeOATstake.png",
    avatar: "https://coincollect.org/assets/images/partners/galxe/oatLogo128.png",
    staticNftImage: "https://coincollect.org/assets/images/partners/galxe/GalxeClaim.png",
    useApi: true,
  },
  {
    pid: 14,
    lpSymbol: 'HUNTER NFT',
    nftAddresses: {
      137: '0x446f52447C1bf0613b782A0A9707100655EF6A28',
      80001: '0x446f52447C1bf0613b782A0A9707100655EF6A28'
    },
    contractAddresses: {
      137: '0xD3b2B1156F810886B1A0cCA3d87E14b7AC05B31c',
      80001: '0x3eef3b0a1c1999068552a622Ecf05FbB3fC8a02C',
    },
    tokenPerBlock: '0.0116',
    participantThreshold: 2250, // Weight(15) x Target Nft Count(150)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'HUNT', percentage: 165000},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://beasthunter.app/',
    },
  },
  {
    pid: 15,
    lpSymbol: 'KEY NFT',
    isCommunity: true,
    nftAddresses: {
      137: '0x6EA79A316d4DeDf58Bca7abf8e13cC6f16358247',
      80001: '0xf2149E6B11638BAEf791e3E66ac7E6469328e840'
    },
    contractAddresses: {
      137: '0xB113E0F75393532a39A8A02089B89171CF2A2f64',
      80001: '0xDA35D873fD89D6e110573c8b469ca4EdECf4dD77',
    },
    tokenPerBlock: '0.11',
    participantThreshold: 4000, // Weight(1) x Target Nft Count(4000)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'AVATAR', percentage: 46500},
      {token: 'HUNT', percentage: 4700},
    ],
    //supportedCollectionPids: [],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://opensea.io/collection/key2web3/drop',
      getNftLink: "https://opensea.io/collection/key2web3/drop"
      
    },
    banner: "https://coincollect.org/assets/images/partners/key/keyBanner.gif",
    avatar: "https://coincollect.org/assets/images/partners/key/key128.jpg",
    staticNftImage: "https://coincollect.org/assets/images/partners/key/key128.jpg",
    useApi: true,
  },
  {
    pid: 16,
    lpSymbol: 'CAR NFT',
    nftAddresses: {
      137: '0xB2e4ab09684a4850d3271C53D39D68C9afA4785E',
      80001: '0xB2e4ab09684a4850d3271C53D39D68C9afA4785E'
    },
    contractAddresses: {
      137: '0xCce9e3b6C3b9bc91b72982B08F8E7950897127d1',
      80001: '0xaf1bF01c64550eb6b3475608fBD5E096085cc84b',
    },
    tokenPerBlock: '0.0116',
    participantThreshold: 2250, // Weight(15) x Target Nft Count(150)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'NITRO', percentage: 66000},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://nitroclash.net/',
    },
  },
  {
    pid: 17,
    lpSymbol: 'PLACEDJ NFT',
    nftAddresses: {
      137: '0x79C55f7f25b16D33A9C3352a332cbe6F375f7076',
      80001: '0x82de52A7031C5EFdd51847527179bEBEa6C68e5C'
    },
    contractAddresses: {
      137: '0xe9Af052E2C61566F6E07ffcd786Fa2764580Ba8F',
      80001: '0xe7f5dad6b256ad27ebb334f2728ec5869d74de03',
    },
    tokenPerBlock: '0.0116',
    participantThreshold: 2250, // Weight(15) x Target Nft Count(150)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'DJ', percentage: 66},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://placedj.com/',
    },
  },
  {
    pid: 18,
    lpSymbol: 'Tasker NFT',
    isCommunity: true,
    nftAddresses: {
      137: '0x6Bb55cAF18897dF614bfa6261ECcd21E78085a6C',
      80001: '0xf2149E6B11638BAEf791e3E66ac7E6469328e840'
    },
    contractAddresses: {
      137: '0x014a8b5242D10e6cEf608FCfa00B5980B14461AE',
      80001: '0xDA35D873fD89D6e110573c8b469ca4EdECf4dD77',
    },
    tokenPerBlock: '0.01273',
    participantThreshold: 2000, // Weight(1) x Target Nft Count(2000)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'HUNT', percentage: 40000},
      {token: 'NITRO', percentage: 4000},
    ],
    //supportedCollectionPids: [],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://taskon.xyz/space/553258',
      getNftLink: "https://taskon.xyz/space/553258"
    },
    banner: "https://coincollect.org/assets/images/partners/taskon/taskON.gif",
    avatar: "https://coincollect.org/assets/images/partners/taskon/taskon256.png",
    staticNftImage: "https://coincollect.org/assets/images/partners/taskon/taskon256.png",
    useApi: true,
  },
  {
    pid: 19,
    lpSymbol: 'GENTLEMALS NFT',
    nftAddresses: {
      137: '0x334a3EBA14Bf369132B7A77CA0B09cfd0761D9d2',
      80001: '0x334a3EBA14Bf369132B7A77CA0B09cfd0761D9d2'
    },
    contractAddresses: {
      137: '0x44F4d8aC7cD0C9552daDc1682d3D0852Ae8330b2',
      80001: '0x7dE962D788Cc2dF5A898Ca13d2ce4AD206E7dE14',
    },
    tokenPerBlock: '0.0115',
    participantThreshold: 2250, // Weight(15) x Target Nft Count(150)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'Z', percentage: 3400},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://zidanogo.com/',
    },
  },
  {
    pid: 20,
    lpSymbol: 'AGENT NFT',
    nftAddresses: {
      137: '0x589C351d8836177BfD0F6d8A5f7Bd3aA9DfBB70C',
      80001: '0x2945b9F3DFf5f489AB2ec70812A9C6Ceeb2BB82e'
    },
    contractAddresses: {
      137: '0x275d38d6F040F097dFed5E19A9de06D85805Aa34',
      80001: '0x9D6C3C811a25a73454E0Ab9b9AD77ca253A8aCfD',
    },
    tokenPerBlock: '0.000040',
    participantThreshold: 2250, // Weight(15) x Target Nft Count(150)
    isFinished: false,
    earningToken: serializedTokens.matic,
    sideRewards: [
      {token: 'AVATAR', percentage: 29000000},
      {token: 'COLLECT', percentage: 48000},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://sapienx.app/',
    },
  },

  {
    pid: 21,
    lpSymbol: "Lens Handles",
    isCommunity: true,
    nftAddresses: {
        137: "0xe7E7EaD361f3AaCD73A61A9bD6C10cA17F38E945",
        80001: "0xe7E7EaD361f3AaCD73A61A9bD6C10cA17F38E945"
    },
    contractAddresses: {
        137: "0x4c8B3A2f23C377bC90288a38068EEB23050Ae709",
        80001: "0x4c8B3A2f23C377bC90288a38068EEB23050Ae709"
    },
    tokenPerBlock: "0.00000300",
    participantThreshold: 300,
    isFinished: false,
    earningToken: serializedTokens.usdt,
    sideRewards: [
        { token: "COLLECT", percentage: 50000 },
        { token: "AVATAR", percentage: 194915254 }
    ],
    supportedCollectionPids: [1,2,3,4,15],
    collectionPowers: [30,3,5,10,15,1],
    mainCollectionWeight: 30,
    performanceFee: "0",
    projectLink: {
        mainLink: "https://www.lens.xyz/",
        getNftLink: "https://www.lens.xyz/mint"
    },
    banner: "https://coincollect.org/assets/images/collections/banners/lens.jpg",
    avatar: "https://coincollect.org/assets/images/collections/logos/lens.jpg",
    useApi: true
},

{
  pid: 22,
  lpSymbol: "Unstoppable Domain",
  isCommunity: true,
  nftAddresses: {
      137: "0xa9a6a3626993d487d2dbda3173cf58ca1a9d9e9f",
      80001: "0xa9a6a3626993d487d2dbda3173cf58ca1a9d9e9f"
  },
  contractAddresses: {
      137: "0x5719716f0f6d9a546ea94902a1edb808ee543fdc",
      80001: "0x5719716f0f6d9a546ea94902a1edb808ee543fdc"
  },
  tokenPerBlock: "0.00000306",
  participantThreshold: 300,
  isFinished: false,
  earningToken: serializedTokens.usdc,
  sideRewards: [
      { token: "COLLECT", percentage: 50833 },
      { token: "AVATAR", percentage: 175000000 }
  ],
  supportedCollectionPids: [1,2,3,4,15],
  collectionPowers: [30,3,5,10,15,1],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
      mainLink: "https://unstoppabledomains.com/",
      getNftLink: "https://unstoppabledomains.com/explore"
  },
  banner: "https://coincollect.org/assets/images/collections/banners/udomains.jpg",
  avatar: "https://coincollect.org/assets/images/collections/logos/udomains.jpg",
  useApi: true
},

{
  pid: 23,
  lpSymbol: "UniSwap V3 NFT",
  isCommunity: true,
  nftAddresses: {
      137: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      80001: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88"
  },
  contractAddresses: {
      137: "0xb570cc5749273c6079b7de34331a5396a98e6a26",
      80001: "0xb570cc5749273c6079b7de34331a5396a98e6a26"
  },
  tokenPerBlock: "0.00000033",
  participantThreshold: 300,
  isFinished: false,
  earningToken: serializedTokens.uni,
  sideRewards: [
      { token: "COLLECT", percentage: 769230 }
  ],
  supportedCollectionPids: [1,2,3,4,15],
  collectionPowers: [30,3,5,10,15,1],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
      mainLink: "https://uniswap.org/",
      getNftLink: "https://app.uniswap.org/pool?chain=polygon"
  },
  banner: "https://coincollect.org/assets/images/collections/banners/uniswap.jpg",
  avatar: "https://coincollect.org/assets/images/collections/logos/uniswap.jpg",
  useApi: true
},

{
  pid: 24,
  lpSymbol: "FREE ETHEREUM",
  isCommunity: true,
  nftAddresses: {
      137: "0x6EA79A316d4DeDf58Bca7abf8e13cC6f16358247",
      80001: "0x6EA79A316d4DeDf58Bca7abf8e13cC6f16358247"
  },
  contractAddresses: {
      137: "0xd561b4d1ed1349d784adc3848abec70faa802789",
      80001: "0xd561b4d1ed1349d784adc3848abec70faa802789"
  },
  tokenPerBlock: "0.0000000010",
  participantThreshold: 300,
  isFinished: false,
  earningToken: serializedTokens.weth,
  sideRewards: [
      { token: "COLLECT", percentage: 250000000 }
  ],
  supportedCollectionPids: [1,2,3,4,5,11,12,14,16,17,19,20],
  collectionPowers: [30,5,10,15,20,10,10,10,10,10,10,10,10],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
    mainLink: 'https://opensea.io/collection/key2web3/drop',
    getNftLink: "https://opensea.io/collection/key2web3/overview"
  },
  banner: "https://coincollect.org/assets/images/collections/banners/ethereum.jpg",
  avatar: "https://coincollect.org/assets/images/partners/key/key128.jpg",
  useApi: true
},

{
  pid: 25,
  lpSymbol: "MEME COINS",
  isCommunity: true,
  nftAddresses: {
      137: "0x6EA79A316d4DeDf58Bca7abf8e13cC6f16358247",
      80001: "0x6EA79A316d4DeDf58Bca7abf8e13cC6f16358247"
  },
  contractAddresses: {
      137: "0xa4fcc1dac636d8f8e300275d200ac21c2d362d67",
      80001: "0xa4fcc1dac636d8f8e300275d200ac21c2d362d67"
  },
  tokenPerBlock: "0.0012731481",
  participantThreshold: 300,
  isFinished: false,
  earningToken: serializedTokens.collect,
  sideRewards: [
      { token: "SHIB", percentage: 5400 },
      { token: "BONK", percentage: 5000 },
      { token: "ELON", percentage: 300000 }
  ],
  supportedCollectionPids: [1,2,3,4,5,11,12,14,16,17,19,20],
  collectionPowers: [30,5,10,15,20,10,10,10,10,10,10,10,10],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
    mainLink: 'https://opensea.io/collection/key2web3/drop',
    getNftLink: "https://opensea.io/collection/key2web3/overview"
  },
  banner: "https://coincollect.org/assets/images/collections/banners/meme.jpg",
  avatar: "https://coincollect.org/assets/images/partners/key/key128.jpg",
  useApi: true
},

{
  pid: 26,
  lpSymbol: "CyberPunk Citizenship",
  isCommunity: true,
  nftAddresses: {
      137: "0x0B647808326686c568703521326D672D2B891341",
      80001: "0x0B647808326686c568703521326D672D2B891341"
  },
  contractAddresses: {
      137: "0x95001802a960bcfebaa6c16fd65f7a6f1bdb0d32",
      80001: "0x95001802a960bcfebaa6c16fd65f7a6f1bdb0d32"
  },
  tokenPerBlock: "0.0127314815",
  participantThreshold: 15000,
  isFinished: false,
  earningToken: serializedTokens.collect,
  sideRewards: [
      { token: "BLITZ", percentage: 5400 },
      { token: "Z", percentage: 165 }
  ],
  supportedCollectionPids: [1,2,3,4],
  collectionPowers: [30,3,5,10,15],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
      mainLink: "https://cyberpunk3.com/",
      getNftLink: "https://opensea.io/collection/cyberpunk-citizenship/overview"
  },
  banner: "https://coincollect.org/assets/images/collections/banners/cyberpunk.jpg",
  avatar: "https://coincollect.org/assets/images/collections/logos/cyberpunk.jpg",
  useApi: true
},

{
  pid: 27,
  lpSymbol: "SmartCats Rewards",
  isCommunity: true,
  nftAddresses: {
      137: "0xD5cA946AC1c1F24Eb26dae9e1A53ba6a02bd97Fe",
      80001: "0xD5cA946AC1c1F24Eb26dae9e1A53ba6a02bd97Fe"
  },
  contractAddresses: {
      137: "0xd190d8AC310eE6D710aCA931F6Bd85E5d1424985",
      80001: "0xd190d8AC310eE6D710aCA931F6Bd85E5d1424985"
  },
  tokenPerBlock: "0.0017440386",
  participantThreshold: 3000,
  isFinished: false,
  earningToken: serializedTokens.collect,
  sideRewards: [
      { token: "AVATAR", percentage: 40000 }
  ],
  supportedCollectionPids: [1,2,3,4,15],
  collectionPowers: [30,3,5,10,15,1],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
    mainLink: "https://www.smartlayer.network/smartcat",
    getNftLink: "https://opensea.io/collection/smart-cat-reward",
  },
  banner: "https://coincollect.org/assets/images/collections/banners/smartcats.jpg",
  avatar: "https://coincollect.org/assets/images/collections/logos/smartcat.jpg",
  useApi: true
},


{
  pid: 28,
  lpSymbol: "LotShare NFT",
  isCommunity: false,
  nftAddresses: {
      137: "0x2E1cF0960Fc9Ece56f53bf58351d175cd1867b2c",
      80001: "0x2E1cF0960Fc9Ece56f53bf58351d175cd1867b2c"
  },
  contractAddresses: {
      137: "0x843ae8cAcaDC5C672004b2C9d1dBD07e85895D39",
      80001: "0x843ae8cAcaDC5C672004b2C9d1dBD07e85895D39"
  },
  tokenPerBlock: "0.0034880771",
  participantThreshold: 750,
  isFinished: false,
  earningToken: serializedTokens.collect,
  sideRewards: [
      { token: "LOT", percentage: 1 }
  ],
  supportedCollectionPids: [1,2,3,4],
  collectionPowers: [15,1,3,6,12],
  mainCollectionWeight: 15,
  performanceFee: "0",
  projectLink: {
      mainLink: "https://lotshare.app/",
  },
  banner: "https://coincollect.org/assets/images/clone/banners/bannerLotSm.png",
  avatar: "https://coincollect.org/assets/images/clone/banners/profileLot.png",
  useApi: true
},

{
  pid: 29,
  lpSymbol: "Solana Rewards",
  isCommunity: false,
  nftAddresses: {
      137: "0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e",
      80001: "0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e"
  },
  contractAddresses: {
      137: "0xa32336763fC39b7bAA5777e6cf5DdeD8Be3f3691",
      80001: "0xa32336763fC39b7bAA5777e6cf5DdeD8Be3f3691"
  },
  tokenPerBlock: "0.0000000698",
  participantThreshold: 750,
  isFinished: false,
  earningToken: serializedTokens.sol,
  sideRewards: [
      { token: "COLLECT", percentage: 30000000 },
      { token: "WMATIC", percentage: 20000 }
  ],
  supportedCollectionPids: [1,2,3,15],
  collectionPowers: [15,3,5,10,1],
  mainCollectionWeight: 15,
  performanceFee: "0",
  projectLink: {
    mainLink: 'https://solana.com/',
    getNftLink: "https://app.coincollect.org/nfts/collections",
  },
  banner: "https://coincollect.org/assets/images/collections/banners/solana.jpg",
  avatar: "https://coincollect.org/assets/images/collections/logos/solana.jpg",
  useApi: true
},


{
  pid: 30,
  lpSymbol: "SandBox Lands",
  isCommunity: true,
  nftAddresses: {
      137: "0x9d305a42A3975Ee4c1C57555BeD5919889DCE63F",
      80001: "0x9d305a42A3975Ee4c1C57555BeD5919889DCE63F"
  },
  contractAddresses: {
      137: "0x474e3b8026a2596a6e763E188f961Fc94B3a15eB",
      80001: "0x474e3b8026a2596a6e763E188f961Fc94B3a15eB"
  },
  tokenPerBlock: "0.0000069762",
  participantThreshold: 750,
  isFinished: false,
  earningToken: serializedTokens.sand,
  sideRewards: [
      { token: "COLLECT", percentage: 25000 }
  ],
  supportedCollectionPids: [1,2,3,4,15],
  collectionPowers: [30,3,5,10,15,1],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
      mainLink: "https://www.sandbox.game/",
      getNftLink: "https://opensea.io/collection/sandbox",
  },
  banner: "https://coincollect.org/assets/images/collections/banners/sandbox.jpg",
  avatar: "https://coincollect.org/assets/images/collections/logos/sandbox.jpg",
  useApi: true
},


{
  pid: 31,
  lpSymbol: "AAVEGOTCHI",
  isCommunity: true,
  nftAddresses: {
      137: "0x86935F11C86623deC8a25696E1C19a8659CbF95d",
      80001: "0x86935F11C86623deC8a25696E1C19a8659CbF95d"
  },
  contractAddresses: {
      137: "0x00e6aD6bfb671887c05d7CEb4950F88e207CB5e8",
      80001: "0x00e6aD6bfb671887c05d7CEb4950F88e207CB5e8"
  },
  tokenPerBlock: "0.0000000349",
  participantThreshold: 300,
  isFinished: false,
  earningToken: serializedTokens.aave,
  sideRewards: [
      { token: "GHST", percentage: 3000 },
      { token: "COLLECT", percentage: 2500000 }
  ],
  supportedCollectionPids: [1,2,3,4,15],
  collectionPowers: [30,3,5,10,15,1],
  mainCollectionWeight: 30,
  performanceFee: "0",
  projectLink: {
    mainLink: "https://www.aavegotchi.com/",
    getNftLink: "https://opensea.io/collection/aavegotchi-official-polygon",
  },
  banner: "https://coincollect.org/assets/images/collections/banners/gotchi.jpg",
  avatar: "https://coincollect.org/assets/images/collections/logos/gotchi.jpg",
  useApi: true
}


/*

{
  pid: 24,
  lpSymbol: "FREE BITCOIN",
  isCommunity: true,
  nftAddresses: {
      137: "0x6EA79A316d4DeDf58Bca7abf8e13cC6f16358247",
      80001: "0x6EA79A316d4DeDf58Bca7abf8e13cC6f16358247"
  },
  contractAddresses: {
      137: "Enter after deployment",
      80001: "Enter after deployment"
  },
  tokenPerBlock: "0.0000001",
  participantThreshold: 300,
  isFinished: false,
  earningToken: serializedTokens.wbtc,
  sideRewards: [
      { token: "COLLECT", percentage: 4761904761 }
  ],
  supportedCollectionPids: [1,2,3,4,5,11,12,14,16,17,19,20],
  collectionPowers: [10,5,5,5,5,5,5,5,5,5,5,5,5],
  mainCollectionWeight: 10,
  performanceFee: "0",
  projectLink: {
      mainLink: "https://www.lens.xyz/",
      getNftLink: "https://www.lens.xyz/mint"
  },
  banner: "https://coincollect.org/assets/images/collections/banners/bitcoin.jpg",
  avatar: "https://coincollect.org/assets/images/partners/key/key128.jpg",
  useApi: true
},


  {
    pid: 14,
    lpSymbol: 'GALXE Pass',
    nftAddresses: {
      137: '0x72Fdf59AeB9980F5a11F86599a513dE450159Ff6',
      80001: '0x28BC2B247aeE27d7d592FA51D5BfEFFf479C4A63'
    },
    contractAddresses: {
      137: '0x46E7bD1a244C858760F01AaD55d24eEeB0ce2C0C',
      80001: '0xa1b97Dd70b64A654C31e0D8941077F95149EE17b',
    },
    tokenPerBlock: '0.026',
    participantThreshold: 15000, // Weight(15) x Target Nft Count(1000)
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'AVATAR', percentage: 49000},
      {token: 'BLITZ', percentage: 4900},
    ],
    supportedCollectionPids: [1,2,3,4],
    mainCollectionWeight: '15',
    performanceFee: '0',
    projectLink: {
      mainLink: 'https://avatarsai.net/',
    },
    banner: "https://coincollect.org/assets/images/partners/galxe/galxePASSstake.png",
    avatar: "https://coincollect.org/assets/images/partners/galxe/galxeLogo.png",
    staticNftImage: "https://coincollect.org/assets/images/partners/galxe/GalxeClaim.png",
    useApi: true,
  },
*/
].filter((f) => !!f.nftAddresses[ChainId.POLYGON])

export default nftFarms
