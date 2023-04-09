import { serializeTokens } from './tokens'
import { SerializedNftFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const nftFarms: SerializedNftFarmConfig[] = [
  {
    pid: 1,
    lpSymbol: 'Starter NFT',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0xde4FB00ba4f31213017362865db8251fECAc6AB8' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    nftAddresses: {
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x11DdF94710AD390063357D532042Bd5f23A3fBd6' // CHANGE_ADDRESS:ERC20PegForNFT
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.usdt,
  },
  {
    pid: 2,
    lpSymbol: 'Bronze NFT',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0xFb09801B10298dB9663D2790F5D5Bc6aFa354497',
      80001: '0x109830F230A078Af2Ac526eac44D91cfB5e57C23' // CHANGE_ADDRESS:Pair
    },
    nftAddresses: {
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x2c65d5355813D3E1f86d1c9b25DCFF367bBd913D' // CHANGE_ADDRESS:ERC20PegForNFT
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
