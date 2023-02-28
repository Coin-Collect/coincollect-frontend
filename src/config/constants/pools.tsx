import { ChainId } from '@pancakeswap/sdk'
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
      80001: '0x9F138199e9AdB7a0a7f6Db8C9CD7f982a8564f17'
    },
    poolCategory: PoolCategory.CORE,
    harvest: true,
    tokenPerBlock: '10',
    sortOrder: 1,
    isFinished: false,
  },
  /*
  {
    sousId: 267,
    stakingToken: serializedTokens.cake,
    earningToken: serializedTokens.high,
    contractAddress: {
      97: '',
      56: '0x60c4998C058BaC8042712B54E7e43b892Ab0B0c4',
    },
    poolCategory: PoolCategory.CORE,
    harvest: true,
    sortOrder: 999,
    tokenPerBlock: '0.09756',
    deployedBlockNumber: 15556925,
    version: 3,
  },
  */
].filter((p) => !!p.contractAddress[ChainId.MAINNET])



export default pools
