import { serializeTokens } from './tokens'
import { SerializedNftFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const nftFarms: SerializedNftFarmConfig[] = [
  {
    pid: 1,
    lpSymbol: 'Goal NFT',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x82c11f89E495750F19056BD76E1234b94203cEE0' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    nftAddresses: {
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x26bf3f1673671bE388D2472E77224B8DF1BC9B53' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.usdt,
  },
  {
    pid: 2,
    lpSymbol: 'COLLECT-MATIC LP',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0xFb09801B10298dB9663D2790F5D5Bc6aFa354497',
      80001: '0xD1D0A3E50422eb78F0dF124cac424e9528DA70C4' // CHANGE_ADDRESS:Pair
    },
    nftAddresses: {
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x82c11f89E495750F19056BD76E1234b94203cEE0' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.wmatic,
  },
  {
    pid: 3,
    lpSymbol: 'xCOLLECT-xMATIC LP',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0xFb09801B10298dB9663D2790F5D5Bc6aFa354497',
      80001: '0xD1D0A3E50422eb78F0dF124cac424e9528DA70C4' // CHANGE_ADDRESS:Pair
    },
    nftAddresses: {
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x82c11f89E495750F19056BD76E1234b94203cEE0' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.wmatic,
  },
].filter((f) => !!f.lpAddresses[ChainId.MAINNET])

export default nftFarms
