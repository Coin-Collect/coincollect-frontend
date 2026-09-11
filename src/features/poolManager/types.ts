import { BigNumber } from '@ethersproject/bignumber'

export type PoolManagerStatus = 'UPCOMING' | 'ACTIVE' | 'FINISHED' | 'UNKNOWN'
export type PoolSource = 'legacy' | 'factory'

export interface PoolTokenMetadata {
  address: string
  chainId: number
  decimals: number
  symbol: string
  name: string
  projectLink?: string
  isConfigured: boolean
}

export interface NormalizedPool {
  chainId: number
  address: string
  canonicalId: string
  logicalPeriodId: string
  source: PoolSource
  legacySousId?: number
  smartChefFactory?: string
  owner?: string
  readError?: string
  stakingToken: PoolTokenMetadata
  rewardToken: PoolTokenMetadata
  rewardPerBlock: BigNumber
  startBlock: number
  bonusEndBlock: number
  poolLimitPerUser: BigNumber
  numberBlocksForUserLimit: number
  participantThreshold: BigNumber
  userLimit: boolean
  hasUserLimit: boolean
  totalStaked: BigNumber
  rewardBalance: BigNumber
  status: PoolManagerStatus
  discoveredAtBlock?: number
  deploymentTransactionHash?: string
}

export interface PoolRegistryResult {
  pools: NormalizedPool[]
  currentBlock: number
  currentTimestamp?: number
  secondsPerBlock: number
  blockTimeSource: 'measured' | 'fallback'
  factoryAddress: string
  factoryOwner?: string
  discoveryWarning?: string
}

export type PoolManagerAuthorityState =
  | 'AUTHORIZED'
  | 'CONTRACT_OWNER'
  | 'WRONG_ACCOUNT'
  | 'WALLET_REQUIRED'
  | 'UNAVAILABLE'

export interface PoolManagerAuthority {
  factoryAddress: string | null
  ownerAddress?: string
  account?: string | null
  ownerIsContract: boolean
  authorized: boolean
  state: PoolManagerAuthorityState
  error?: string
}

export interface PoolDeploymentParameters {
  stakedToken: string
  rewardToken: string
  rewardPerBlock: BigNumber
  startBlock: number
  bonusEndBlock: number
  poolLimitPerUser: BigNumber
  numberBlocksForUserLimit: number
  participantThreshold: BigNumber
  admin: string
}

export interface RewardPlan {
  budgetBaseUnits: BigNumber
  rewardBlocks: BigNumber
  rewardPerBlock: BigNumber
  plannedMaximumEmission: BigNumber
  residual: BigNumber
}

export interface PoolManagerDraft {
  id: string
  sourcePoolAddress?: string
  stakingToken: string
  rewardToken: string
  durationDays: string
  rewardBudget: string
  participantThreshold: string
  poolLimitPerUser: string
  numberBlocksForUserLimit: string
  poolAdmin: string
  status: 'DRAFT' | 'READY' | 'FUNDING_REQUIRED' | 'FUNDED' | 'FAILED'
  deployedPoolAddress?: string
  deploymentTxHash?: string
  fundingTxHash?: string
  error?: string
  updatedAt: number
}

export interface RenewalPlanItem extends PoolManagerDraft {
  sourcePoolAddress: string
  stakingSymbol: string
  rewardSymbol: string
  stakingDecimals: number
  rewardDecimals: number
  preserveEmission?: boolean
}

export interface RenewalPlan {
  id: string
  name: string
  chainId: number
  factoryAddress: string
  items: RenewalPlanItem[]
  createdAt: number
  updatedAt: number
}

export interface DeploymentVerification {
  deployed: boolean
  address: string
  transactionHash?: string
  blockNumber?: number
  checks: Array<{ label: string; expected: string; actual: string; ok: boolean }>
  passed: boolean
}

export interface FundingVerification {
  poolAddress: string
  rewardToken: string
  amount: BigNumber
  beforeBalance: BigNumber
  afterBalance: BigNumber
  transactionHash: string
  passed: boolean
}
