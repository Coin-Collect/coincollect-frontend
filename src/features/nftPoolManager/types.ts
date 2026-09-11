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
export type NftQuoteState = 'FRESH' | 'STALE' | 'EXPIRED' | 'INVALID'
export type NftQuoteSource = 'router' | 'identity'
export type NftRewardAmountSource = 'quote' | 'identity' | 'manual' | 'missing'
export type NftSideRewardRepresentability = 'EXACT' | 'WITHIN_TOLERANCE' | 'OUTSIDE_TOLERANCE'
export type NftUserLimitSource = 'deployment-provenance' | 'on-chain-configuration' | 'unavailable'

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
  originalConfiguredUserLimit?: boolean
  userLimitSource?: NftUserLimitSource
  originalPerformanceFee?: BigNumber
  originalFeeTo?: string
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
  hasUserLimitRuntime?: boolean
  performanceFee?: BigNumber
  feeTo?: string
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
  source: NftQuoteSource
  sourceLabel: string
  path: string[]
  allocationBps: string
  totalBudget: string
  quotedAt: number
  freshnessSeconds: number
  expirySeconds: number
  quoteState?: NftQuoteState
  error?: string
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
  quoteErrors: Record<string, string>
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
  draftId: string
  sourcePoolId?: string
  chainId: number
  factoryAddress: string
  scheduleIntent: {
    durationDays: number
    estimatedDurationBlocks: number
    measuredSecondsPerBlock: number
    desiredStartMode: 'immediately-before-deployment'
  }
  factoryParameters: {
    stakedTokenAddress: string
    rewardTokenAddress: string
    sideRewardTokens: string[]
    sideRewardPercentages: string[]
    rewardPerBlock: string
    poolLimitPerUser: string
    numberBlocksForUserLimit: string
    poolCapacity: string
    participantThreshold: string
    intendedAdmin: string
  }
  collectionConfiguration: {
    primaryCollection: string
    communityCollections: string[]
    collectionWeights: string[]
    setCollectionWeightsArguments: {
      communityNftAddresses: string[]
      weights: string[]
      stakedTokenWeight: string
    }
    collectionWeightConfigurationRequired: boolean
  }
  fundingRequirements: {
    primary: {
      tokenAddress: string
      desiredAmount: string
      maximumScheduledFunding: string
      residual: string
      source: NftRewardAmountSource
    }
    side: Array<{
      tokenAddress: string
      desiredAmount: string
      encodedPercentage: string
      maximumImpliedSideFunding: string
      deviationFromDesired: string
      deviationBps: string
      representability: NftSideRewardRepresentability
      source: NftRewardAmountSource
    }>
    budget: {
      tokenAddress: string
      amount: string
      allocations: Array<{ tokenAddress: string; allocationBps: string; allocatedBudget: string }>
      roundingRemainder: string
    }
  }
  quotes: {
    budgetTokenAddress: string
    totalBudget: string
    rewards: Array<{
      tokenAddress: string
      inputAmount: string
      outputAmount: string
      source: NftRewardAmountSource
      state?: NftQuoteState
      quotedAt?: number
      freshnessSeconds?: number
    }>
  }
  postDeploy: {
    performanceFee?: string
    feeTo?: string
  }
  readiness: {
    status: NftPoolReadiness
    blockers: string[]
    warnings: string[]
    information: string[]
  }
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
  intendedAdmin?: string
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
