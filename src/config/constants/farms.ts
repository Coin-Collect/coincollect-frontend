import { serializeTokens } from './tokens'
import { SerializedFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const farms: SerializedFarmConfig[] = [
  /**
   * These 3 farms (PID 0, 1, 2) should always be at the top of the file.
   */
  // CAUTION: We dont'need pool zero for farm
  /*
  {
    pid: 0,
    lpSymbol: 'COLLECT',
    lpAddresses: {
      97: '0x9C21123D94b93361a29B2C2EFB3d5CD8B17e0A9e',
      56: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      80001: '0xE564106bacd4D3b74a79e0fbDabF0c43828a1DBB' // CHANGE_ADDRESS:CollectToken (test)
    },
    token: serializedTokens.syrup,
    quoteToken: serializedTokens.wbnb,
  },
  */
  {
    pid: 1,
    lpSymbol: 'COLLECT-USDT LP',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x4e19486d301a37d237813F4A13612C0c350d1f9A' // CHANGE_ADDRESS:Pair
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
    token: serializedTokens.collect,
    quoteToken: serializedTokens.wmatic,
  },
  {
    pid: 3,
    lpSymbol: 'COLLECT-LOT LP',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0x27307257eA70280da5692A2Cd3C863D021127Ac1',
      80001: '0x9de718b12FAa1631D96fC0e32BAA8E06980C3C51' // CHANGE_ADDRESS:Pair
    },
    token: serializedTokens.lot,
    quoteToken: serializedTokens.collect,
  },
  
].filter((f) => !!f.lpAddresses[ChainId.MAINNET])

export default farms
