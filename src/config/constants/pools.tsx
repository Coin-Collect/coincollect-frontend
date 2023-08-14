import { ChainId } from '@coincollect/sdk'
import Trans from 'components/Trans'
import { VaultKey } from 'state/types'
import { CHAIN_ID } from './networks'
import tokens, { serializeTokens } from './tokens'
import { SerializedPoolConfig, PoolCategory } from './types'

const serializedTokens = serializeTokens()

export const vaultPoolConfig = {
  [VaultKey.CakeVault]: {
    name: <Trans>Auto COLLECT</Trans>,
    description: <Trans>Automatic restaking</Trans>,
    autoCompoundFrequency: 5000,
    gasLimit: 380000,
    tokenImage: {
      primarySrc: `/images/tokens/${tokens.collect.address}.svg`,
      secondarySrc: '/images/tokens/autorenew.svg',
    },
  },
  [VaultKey.IfoPool]: {
    name: 'IFO CAKE',
    description: <Trans>Stake CAKE to participate in IFOs</Trans>,
    autoCompoundFrequency: 1,
    gasLimit: 500000,
    tokenImage: {
      primarySrc: `/images/tokens/${tokens.cake.address}.svg`,
      secondarySrc: `/images/tokens/ifo-pool-icon.svg`,
    },
  },
} as const

/// It chooses network id which determined in environment
const pools: SerializedPoolConfig[] = [
  {
    sousId: 0,
    stakingToken: serializedTokens.collect,
    earningToken: serializedTokens.collect,
    contractAddress: {
      97: '0x1d32c2945C8FDCBc7156c553B7cEa4325a17f4f9',
      56: '0x73feaa1eE314F8c655E354234017bE2193C9E24E',
      137: '0x46A928F2386b8c38cdde028a32c5b7aa19F40445', // CHANGE_ADDRESS:CoinCollectPool 
      80001: '0xE26C5d768D97db78Effee63d79028B27d51d67cD' // CHANGE_ADDRESS:CoinCollectPool (test)
    },
    poolCategory: PoolCategory.CORE,
    harvest: true,
    tokenPerBlock: '0.8', // UPDATE:tokenPerBlock
    sortOrder: 1,
    isFinished: false,
  },
  {
    sousId: 1,
    stakingToken: serializedTokens.collect,
    earningToken: serializedTokens.lot,
    contractAddress: {
      137: '0xF18AeD154cB019cE4680CEA97fF3241fd5a6a02D',
      80001: '0xBd07Cb8F1Ed06299a0941EA69d6fB4dDaC3F673E',
    },
    poolCategory: PoolCategory.CORE,
    harvest: true,
    sortOrder: 2,
    tokenPerBlock: '0.000086',
    deployedBlockNumber: 45634311,
    version: 3,
    participantThreshold: 1000000,
  },
  {
    sousId: 2,
    stakingToken: serializedTokens.lot,
    earningToken: serializedTokens.collect,
    contractAddress: {
      137: '0xd043e7BB67B817a41aFa5127945583b78e509348',
      80001: '0x2fF12C692590539d69DbE1bdD0e4155e2697bF6D',
    },
    poolCategory: PoolCategory.CORE,
    harvest: true,
    sortOrder: 3,
    tokenPerBlock: '0.0036',
    deployedBlockNumber: 45634502,
    version: 3,
    participantThreshold: 1000,
  },
  {
    sousId: 3,
    stakingToken: serializedTokens.collect,
    earningToken: serializedTokens.blitz,
    contractAddress: {
      137: '0xC5284c89d58DE92B4Ef1741CFf6c77B942Dc2d5e',
      80001: '0x0A3d9101c07382045CBC5441284c94C80c9AB0Af',
    },
    poolCategory: PoolCategory.CORE,
    harvest: true,
    sortOrder: 4,
    tokenPerBlock: '1.28',
    deployedBlockNumber: 45634502,
    version: 3,
    participantThreshold: 500000,
  },
  {
    sousId: 4,
    stakingToken: serializedTokens.blitz,
    earningToken: serializedTokens.collect,
    contractAddress: {
      137: '0xBf6523808f55A2139eE03804017DdDB20B90cA91',
      80001: '0xC92c9561d8AeFE055fE9D9f210B33C6a27Dbb057',
    },
    poolCategory: PoolCategory.CORE,
    harvest: true,
    sortOrder: 5,
    tokenPerBlock: '0.0068',
    deployedBlockNumber: 45634502,
    version: 3,
    participantThreshold: 50000000,
  },
].filter((p) => !!p.contractAddress[ChainId.POLYGON])



export default pools
