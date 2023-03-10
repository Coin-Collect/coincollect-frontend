import { serializeTokens } from './tokens'
import { SerializedFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const farms: SerializedFarmConfig[] = [
  /**
   * These 3 farms (PID 0, 251, 252) should always be at the top of the file.
   */
  {
    pid: 0,
    lpSymbol: 'COLLECT',
    lpAddresses: {
      97: '0x9C21123D94b93361a29B2C2EFB3d5CD8B17e0A9e',
      56: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      80001: '0xA8Cc006BE50a72c6f96D2319DaB2266F9676bfDc' // CHANGE_ADDRESS:CollectToken (test)
    },
    token: serializedTokens.syrup,
    quoteToken: serializedTokens.wbnb,
  },
  {
    pid: 251,
    lpSymbol: 'COLLECT-USDC LP',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      80001: '0xD92c28dA574d1910b3821e41ce031d0ff5108335'
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.usdc,
  },
  
].filter((f) => !!f.lpAddresses[ChainId.MAINNET])

export default farms
