import { Token, ChainId } from '@coincollect/sdk'
import tokens from './tokens'
import farms from './farms'
import { Ifo } from './types'

//export const cakeBnbLpToken = new Token(ChainId.MAINNET, farms[1].lpAddresses[ChainId.MAINNET], 18, farms[1].lpSymbol)

const ifos: Ifo[] = [
  {
    id: 'era',
    address: '0x527201a43f8da24ce9b7c21744a0706942f41fa3',
    isActive: true,
    name: 'ERA (Game of Truth)',
    poolBasic: {
      saleAmount: '4,000,000 ERA',
      raiseAmount: '$360,000',
      cakeToBurn: '$0',
      distributionRatio: 0.2,
    },
    poolUnlimited: {
      saleAmount: '16,000,000 ERA',
      raiseAmount: '$1,440,000',
      cakeToBurn: '$0',
      distributionRatio: 0.8,
    },
    currency: tokens.cake,
    token: tokens.era,
    releaseBlockNumber: 15156634,
    campaignId: '511180000',
    articleUrl: 'https://pancakeswap.finance/voting/proposal/QmTfN1SKnFidF6XCDcpga7zAf69mFfhb26Zy9b85dYskxW',
    tokenOfferingPrice: 0.09,
    version: 3.1,
    telegramUrl: 'https://t.me/Era7_Official',
    twitterUrl: 'https://twitter.com/Era7_official',
    description:
      'Drawing from their experience in traditional games such as Awakening of Dragon, Era7: Game of Truth combines elements of DeFi, NFTs, and Trading Cards into a play-to-earn game steeped in mythology and magic.',
  },
  {
    id: 'froyo',
    address: '0xE0d6c91860a332068bdB59275b0AAC8769e26Ac4',
    isActive: false,
    name: 'Froyo Games (FROYO)',
    poolBasic: {
      saleAmount: '20,000,000 FROYO',
      raiseAmount: '$1,200,000',
      cakeToBurn: '$0',
      distributionRatio: 0.3,
    },
    poolUnlimited: {
      saleAmount: '46,666,668 FROYO',
      raiseAmount: '$2,800,000',
      cakeToBurn: '$0',
      distributionRatio: 0.7,
    },
    currency: tokens.cake,
    token: tokens.froyo,
    releaseBlockNumber: 14297000,
    campaignId: '511170000',
    articleUrl: 'https://pancakeswap.finance/voting/proposal/QmRhc4oC73jk4zxU4YkP1kudKHeq6qamgYA1sWoh6XJnks',
    tokenOfferingPrice: 0.06,
    version: 3,
    telegramUrl: 'https://t.me/froyogames',
    twitterUrl: 'https://twitter.com/realfroyogames',
    description: `Froyo Games is a game publisher and decentralized GameFi platform, with a NFT Marketplace that integrates NFTs with their games.\n \n FROYO tokens can be used to buy NFTs and participate in Froyo games`,
  },
  /*
  {
    id: 'soteria',
    address: '0x9C21123D94b93361a29B2C2EFB3d5CD8B17e0A9e',
    isActive: false,
    name: 'Soteria (wSOTE)',
    poolUnlimited: {
      saleAmount: '1,500,000 wSOTE',
      raiseAmount: '$525,000',
      cakeToBurn: '$262,500',
      distributionRatio: 1,
    },
    currency: cakeBnbLpToken,
    token: tokens.wsote,
    releaseBlockNumber: 4086064,
    campaignId: '511050000',
    articleUrl: 'https://pancakeswap.medium.com/soteria-sota-ifo-to-be-hosted-on-pancakeswap-64b727c272ae',
    tokenOfferingPrice: null,
    version: 1,
  },
  */
]

export default ifos
