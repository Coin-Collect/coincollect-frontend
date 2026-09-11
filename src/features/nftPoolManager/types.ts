import { BigNumber } from '@ethersproject/bignumber'

export type NftPoolStatus = 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'UNKNOWN'
export type NftPoolProtocolVersion = 'NftStakeV2' | 'LegacyNFTStake' | 'StaticCollectionDefinition' | 'Unknown'
export type NftPoolSource = 'nft-farms-config' | 'nft-factory' | 'legacy-masterchef'
export type NftPoolKind = 'POOL' | 'COLLECTION_DEFINITION'
export type NftWeightSource = 'on-chain' | 'frontend-config' | 'default'
export type NftCloneSupport = 'FULL' | 'PARTIAL' | 'UNAVAILABLE'
export type NftDecodeStatus = 'decoded' | 'unavailable' | 'malformed' | 'not-applicable'
export type NftPoolReadiness = 'INCOMPLETE' | 'NEEDS_REVIEW' | 'READY_FOR_DRY_RUN' | 'READY_FOR_DEPLOYMENT'
export type NftPoolDurationPreset = '1 month' | '3 months' | '6 months' | '1 year' | 'custom'

export interface NftTokenMetadata {
  address: string
  chainId: number
  decimals?: number
  symbol: string
  name: string
  isReadable: boolean
  totalSupply?: BigNumber
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
  poolBalance?: BigNumber
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

export interface NftDeploymentDecodedInputs {
  stakedTokenAddress: string
  rewardTokenAddress: string
  sideRewardTokens: string[]
  sideRewardPercentages: BigNumber[]
  rewardPerBlock: BigNumber
  startBlock: number
  endBlock: number
  poolLimitPerUser: BigNumber
  numberBlocksForUserLimit: number
  initialPoolCapacity: BigNumber
  participantThreshold: BigNumber
  admin: string
}

export interface NftPoolDeploymentProvenance {
  factoryAddress?: string
  transactionHash?: string
  blockNumber?: number
  decodedInputs?: NftDeploymentDecodedInputs
  decodeStatus: NftDecodeStatus
  error?: string
}

export interface NftPoolSourceEconomics {
  originalRewardPerBlock?: BigNumber
  originalStartBlock?: number
  originalEndBlock?: number
  originalDurationBlocks?: number
  originalSideRewardPercentages: Array<{ tokenAddress: string; percentage: BigNumber }>
  originalParticipantThreshold?: BigNumber
  originalInitialPoolCapacity?: BigNumber
  currentRemainingCapacity?: BigNumber
  originalPoolLimitPerUser?: BigNumber
  originalNumberBlocksForUserLimit?: number
  originalAdmin?: string
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
  /** Compatibility alias for current remaining capacity. */
  poolCapacity?: BigNumber
  configuredInitialPoolCapacity?: BigNumber
  currentRemainingPoolCapacity?: BigNumber
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
  sourceEconomics: NftPoolSourceEconomics
  deployment: NftPoolDeploymentProvenance
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

export interface NftPoolDraftQuote {
  budgetTokenAddress: string
  rewardTokenAddress: string
  inputAmount: string
  outputAmount: string
  source: string
  quotedAt: number
  freshnessSeconds: number
}

export interface NftPoolDraftEconomics {
  /** The denomination is deliberately independent from reward assets. */
  budgetTokenAddress?: string
  budgetDenomination?: string
  budgetDecimals?: number
  totalBudget?: string
  allocationBps: Record<string, string>
  manualAmounts: Record<string, string>
  quotes: Record<string, NftPoolDraftQuote>
  durationPreset: NftPoolDurationPreset
  customDurationDays?: string
  estimatedBlocks?: number
  secondsPerBlock?: number
}

export interface NftPoolDraftConstraints {
  participantThreshold: string
  poolCapacity: string
  poolLimitPerUser: string
  numberBlocksForUserLimit: string
  userLimitEnabled: boolean
  performanceFee: string
}

export interface NftPoolDeploymentPlan {
  chainId: number
  factoryAddress?: string
  stakedTokenAddress: string
  rewardTokenAddress: string
  sideRewardTokens: string[]
  sideRewardPercentages: string[]
  collectionAddresses: string[]
  collectionWeights: string[]
  budgetTokenAddress?: string
  budgetAmount?: string
  rewardAllocations: Array<{ tokenAddress: string; amount: string; allocationBps: string }>
  rewardPerBlock?: string
  numberBlocks?: number
  /** Populated only by the future Phase 3 transaction-preparation step. */
  startBlock?: never
  endBlock?: never
  transactions?: never
}

export interface NftPoolDraft {
  schemaVersion: 2
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
    primary: NftPoolDraftReward | null
    side: NftPoolDraftReward[]
  }
  sourceEconomics?: NftPoolSourceEconomics
  economics: NftPoolDraftEconomics
  constraints: NftPoolDraftConstraints
  readiness?: NftPoolReadiness
  /** Kept as an empty migration compatibility field; unsafe source identifiers are never persisted. */
  unsafe?: Record<string, never>
  updatedAt: number
}
