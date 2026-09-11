import { BigNumber } from '@ethersproject/bignumber'

export type NftPoolStatus = 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'UNKNOWN'
export type NftPoolProtocolVersion = 'NftStakeV2' | 'LegacyNFTStake' | 'StaticCollectionDefinition' | 'Unknown'
export type NftPoolSource = 'nft-farms-config' | 'nft-factory' | 'legacy-masterchef'
export type NftPoolKind = 'POOL' | 'COLLECTION_DEFINITION'
export type NftWeightSource = 'on-chain' | 'frontend-config' | 'default'
export type NftCloneSupport = 'FULL' | 'PARTIAL' | 'UNAVAILABLE'

export interface NftTokenMetadata {
  address: string
  chainId: number
  decimals?: number
  symbol: string
  name: string
  isReadable: boolean
}

export interface NftCollection {
  id: string
  chainId: number
  address: string
  name: string
  symbol: string
  displayName: string
  image?: string
  knownPid?: number
  source: 'nft-farms-config' | 'on-chain'
  verification: 'VERIFIED' | 'CONFIG_ONLY' | 'UNREADABLE'
}

export interface NftPoolCollection {
  collection: NftCollection
  primary: boolean
  weight: BigNumber
  weightSource: NftWeightSource
}

export interface NftRewardAsset {
  token: NftTokenMetadata
  configuredSymbol?: string
  configuredPercentage?: string
  onChainPercentage?: BigNumber
}

export interface NftPoolFrontendMetadata {
  name: string
  banner?: string
  avatar?: string
  projectUrl?: string
  getNftUrl?: string
  isCommunity?: boolean
  configuredFinished?: boolean
}

export interface NftPoolOnChainTruth {
  codeFound: boolean
  abiCompatible: boolean
  factoryAddress?: string
  owner?: string
  stakingTokenAddress?: string
  rewardTokenAddress?: string
  sideRewardActive?: boolean
  startBlock?: number
  endBlock?: number
  rewardPerBlock?: BigNumber
  participantThreshold?: BigNumber
  poolCapacity?: BigNumber
  totalShares?: BigNumber
  stakedBalance?: BigNumber
  poolLimitPerUser?: BigNumber
  numberBlocksForUserLimit?: number
  userLimit?: boolean
  rewardBalance?: BigNumber
  currentBlock?: number
  status?: NftPoolStatus
}

export interface NftPoolHealth {
  codeFound: boolean
  abiCompatible: boolean
  ownerReadable: boolean
  rewardTokenReadable: boolean
  collectionReadable: boolean
  configurationMismatch: boolean
  warnings: string[]
}

export interface NftPool {
  id: string
  canonicalId: string
  pid: number
  chainId: number
  kind: NftPoolKind
  address: string
  protocolVersion: NftPoolProtocolVersion
  source: NftPoolSource
  metadata: NftPoolFrontendMetadata
  onChain: NftPoolOnChainTruth
  collections: NftPoolCollection[]
  rewards: {
    primary: NftRewardAsset
    side: NftRewardAsset[]
  }
  status: NftPoolStatus
  statusSource: 'on-chain' | 'frontend-fallback'
  health: NftPoolHealth
  warnings: string[]
  cloneSupport: NftCloneSupport
}

export interface NftPoolRegistryResult {
  pools: NftPool[]
  collections: NftCollection[]
  chainId: number
  currentBlock: number
  currentTimestamp?: number
  secondsPerBlock: number
  factoryAddress?: string
  factoryOwner?: string
  warning?: string
}

export interface NftPoolDraftCollection {
  chainId: number
  address: string
  collectionId: string
  name: string
  weight: string
  primary: boolean
}

export interface NftPoolDraftReward {
  address: string
  symbol: string
  name: string
  decimals?: number
}

export interface NftPoolDraft {
  id: string
  sourcePoolId: string
  chainId: number
  source: 'manual' | 'cloned'
  name: string
  banner?: string
  avatar?: string
  projectUrl?: string
  getNftUrl?: string
  collections: NftPoolDraftCollection[]
  rewards: {
    primary: NftPoolDraftReward
    side: NftPoolDraftReward[]
  }
  economics: {
    budgetDenomination?: string
    totalBudget?: string
    durationPreset?: '1 month' | '3 months' | '6 months' | '1 year' | 'custom'
    customDurationDays?: string
    primaryRewardAllocation?: string
    additionalRewardAllocations?: Record<string, string>
  }
  constraints: {
    participantThreshold: string
    poolCapacity: string
    poolLimitPerUser: string
    numberBlocksForUserLimit: string
    performanceFee: string
  }
  unsafe: {
    deployedContractAddress?: string
    startBlock?: number
    endBlock?: number
    deploymentTransactionHash?: string
    oldOwner?: string
  }
  updatedAt: number
}
