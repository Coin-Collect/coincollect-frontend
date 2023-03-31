import { serializeTokens } from './tokens'
import { SerializedFarmConfig } from './types'
import { CHAIN_ID } from './networks'
import { ChainId } from '@coincollect/sdk'

const serializedTokens = serializeTokens()

const nftFarms: SerializedFarmConfig[] = [
  {
    pid: 1,
    lpSymbol: 'COLLECT-USDT LP',
    lpAddresses: {
      97: '0x3ed8936cAFDF85cfDBa29Fbe5940A5b0524824F4',
      56: '0x0eD7e52944161450477ee417DE9Cd3a859b14fD0',
      137: '0x0cCc84b6506003487AEC687085e82C2f912E607B',
      80001: '0x9472B107edb58f05d14299898B69A41729710959' // CHANGE_ADDRESS:Pair
    },
    token: serializedTokens.collect,
    quoteToken: serializedTokens.usdt,
  },
].filter((f) => !!f.lpAddresses[ChainId.MAINNET])

export default nftFarms
