import { BigNumber } from '@ethersproject/bignumber'
import type { TransactionReceipt } from '@ethersproject/providers'
import { NftPoolDeploymentPlan } from '../types'

export type LaunchStage =
  | 'DRAFT'
  | 'PREFLIGHT_RUNNING'
  | 'PREFLIGHT_FAILED'
  | 'PREFLIGHT_READY'
  | 'AWAITING_DEPLOY_SIGNATURE'
  | 'DEPLOY_SUBMITTED'
  | 'DEPLOY_CONFIRMING'
  | 'DEPLOY_CONFIRMED'
  | 'DEPLOY_VERIFIED'
  | 'WEIGHTS_REQUIRED'
  | 'AWAITING_WEIGHTS_SIGNATURE'
  | 'WEIGHTS_SUBMITTED'
  | 'WEIGHTS_CONFIRMING'
  | 'WEIGHTS_VERIFIED'
  | 'FEE_CONFIG_REQUIRED'
  | 'AWAITING_FEE_SIGNATURE'
  | 'FEE_SUBMITTED'
  | 'FEE_CONFIRMING'
  | 'FEE_VERIFIED'
  | 'FUNDING_REQUIRED'
  | 'FUNDING_IN_PROGRESS'
  | 'FINAL_VERIFYING'
  | 'COMPLETE'
  | 'CORRUPTED'
  | 'FAILED'

export type LaunchCheckStatus = 'PASS' | 'WARN' | 'BLOCK'

export interface LaunchCheck {
  key: string
  label: string
  status: LaunchCheckStatus
  expected?: string
  actual?: string
  detail?: string
}

export interface NftLaunchSchedule {
  planningEstimateBlocks: number
  finalDurationBlocks: number
  setupBufferBlocks: number
  bufferSeconds: number
  measuredSecondsPerBlock: number
  currentBlockAtPreparation: number
  startBlock: number
  endBlock: number
  preparedAt: number
}

export interface LaunchGasEstimate {
  gasLimit: string
  gasPrice: string
  estimatedCost: string
  safetyCost: string
  currency: string
}

export interface LaunchTokenBalance {
  tokenAddress: string
  symbol?: string
  decimals?: number
  walletBalance: string
  requiredBalance: string
  sufficient: boolean
}

export interface NftPreflightResult {
  ok: boolean
  checkedAt: number
  chainId: number
  currentBlock: number
  currentBlockAtPreflight: number
  expiresAtBlock: number
  schedulePreparedAt: number
  account: string
  factoryOwner?: string
  ownerIsContract: boolean
  schedule: NftLaunchSchedule
  checks: LaunchCheck[]
  deploymentGas?: LaunchGasEstimate
  nativeBalance: string
  tokenBalances: LaunchTokenBalance[]
  error?: string
}

export interface VerificationResult {
  passed: boolean
  checkedAt: number
  checks: LaunchCheck[]
  fingerprint?: string
  error?: string
}

export interface NftLaunchPoolSnapshot {
  chainId: number
  currentBlock: number
  account?: string
  factoryAddress?: string
  factoryOwner?: string
  factoryCode?: string
  poolAddress?: string
  poolCode?: string
  owner?: string
  stakedToken?: string
  rewardToken?: string
  sideRewardTokens?: string[]
  sideRewardPercentages?: string[]
  sideRewardActive?: boolean
  rewardPerBlock?: string
  startBlock?: number
  endBlock?: number
  poolLimitPerUser?: string
  numberBlocksForUserLimit?: number
  poolCapacity?: string
  participantThreshold?: string
  fingerprint?: string
  readError?: string
}

export interface FundingProgress {
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'SKIPPED' | 'FAILED'
  tokenAddress: string
  requiredAmount: string
  beforePoolBalance?: string
  afterPoolBalance?: string
  walletBalance?: string
  txHash?: string
  error?: string
}

export interface NftPoolLaunchSession {
  schemaVersion: 1
  sessionId: string
  draftId: string
  plan: NftPoolDeploymentPlan
  planHash: string
  chainId: number
  factoryAddress: string
  intendedAdmin: string
  createdAt: number
  updatedAt: number
  currentStage: LaunchStage
  schedule?: NftLaunchSchedule
  pendingSchedule?: NftLaunchSchedule
  poolAddress?: string
  transactionHashes: {
    deploy?: string
    weights?: string
    fee?: string
    primaryFunding?: string
    sideFunding: Record<string, string>
    scheduleUpdate?: string
  }
  verification: {
    deployment?: VerificationResult
    weights?: VerificationResult
    fee?: VerificationResult
    funding?: VerificationResult
    final?: VerificationResult
  }
  funding: {
    primary?: FundingProgress
    side: Record<string, FundingProgress>
  }
  preflight?: NftPreflightResult
  error?: string
  retryable: boolean
  frozenAt?: number
  poolFingerprint?: string
}

export interface DeploymentResult {
  poolAddress: string
  transactionHash: string
  blockNumber: number
  receipt: TransactionReceipt
}

export interface FundingResult {
  status: 'VERIFIED' | 'SKIPPED'
  tokenAddress: string
  requiredAmount: BigNumber
  beforePoolBalance: BigNumber
  afterPoolBalance: BigNumber
  walletBalance: BigNumber
  transactionHash?: string
  receipt?: TransactionReceipt
}
