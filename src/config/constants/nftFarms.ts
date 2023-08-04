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
    isFinished: false,
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
    isFinished: false,
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
    projectLink: 'https://lotshare.app/',
  },
  {
    pid: 6,
    lpSymbol: 'CoinCollect Starter NFT',
    nftAddresses: {
      137: '0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD',
      80001: '0x11DdF94710AD390063357D532042Bd5f23A3fBd6',
    },
    contractAddresses: {
      137: '0x2b0dcF4f55A6f19aF410D7BD51bbfAb499Bb5C84',
      80001: '0x02905b3528f0D737BB324A202B7F79eA0e9d808a',
    },
    tokenPerBlock: '0.0077',
    participantThreshold: 100,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 340},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: 'https://coincollect.org/',
    banner: "https://coincollect.org/assets/images/clone/banner-lg.png",
    avatar: "https://coincollect.org/assets/images/clone/nft350.png",
  },
  {
    pid: 7,
    lpSymbol: 'CoinCollect Bronze NFT',
    nftAddresses: {
      137: '0x0B8E7D22CE826f1228a82525b8779dBdD9E24B80',
      80001: '0x2c65d5355813D3E1f86d1c9b25DCFF367bBd913D' 
    },
    contractAddresses: {
      137: '0x2b0dcF4f55A6f19aF410D7BD51bbfAb499Bb5C84',
      80001: '0x02905b3528f0D737BB324A202B7F79eA0e9d808a',
    },
    tokenPerBlock: '0.023',
    participantThreshold: 60,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 200},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: 'https://coincollect.org/',
    banner: "https://coincollect.org/assets/images/clone/banners/bannerBronzeSm.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileBronze.png",
  },
  {
    pid: 8,
    lpSymbol: 'CoinCollect Silver NFT',
    nftAddresses: {
      137: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9',
      80001: '0x0a846Dd40152d6fE8CB4DE4107E0b063B6D6b3F9' 
    },
    contractAddresses: {
      137: '0x2b0dcF4f55A6f19aF410D7BD51bbfAb499Bb5C84',
      80001: '0x02905b3528f0D737BB324A202B7F79eA0e9d808a',
    },
    tokenPerBlock: '0.0224',
    participantThreshold: 25,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 143},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: 'https://coincollect.org/',
    banner: "https://coincollect.org/assets/images/clone/banners/bannerSilverSm.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileSilver.png",
  },
  {
    pid: 9,
    lpSymbol: 'CoinCollect Gold NFT',
    nftAddresses: {
      137: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e',
      80001: '0x117D6870e6dE9faBcB40C34CceDD5228C63e3a1e'
    },
    contractAddresses: {
      137: '0x2b0dcF4f55A6f19aF410D7BD51bbfAb499Bb5C84',
      80001: '0x02905b3528f0D737BB324A202B7F79eA0e9d808a',
    },
    tokenPerBlock: '0.0306',
    participantThreshold: 15,
    isFinished: false,
    earningToken: serializedTokens.collect,
    sideRewards: [
      {token: 'SHIB', percentage: 125},
    ],
    //supportedCollectionPids: [1,2],
    mainCollectionWeight: '1',
    performanceFee: '0',
    projectLink: 'https://coincollect.org/',
    banner: "https://coincollect.org/assets/images/clone/banners/bannerGoldSm.png",
    avatar: "https://coincollect.org/assets/images/clone/banners/profileGold.png",
  },
].filter((f) => !!f.nftAddresses[ChainId.POLYGON])

export default nftFarms
