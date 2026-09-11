import type { Provider, TransactionReceipt } from '@ethersproject/providers'
import { LaunchStage, NftPoolLaunchSession } from './types'

export type ReconciledTransactionState = 'PENDING' | 'CONFIRMED' | 'FAILED'

export interface ReconciledTransaction {
  state: ReconciledTransactionState
  hash: string
  receipt?: TransactionReceipt
}

/**
 * A receipt is the only safe source of truth for a submitted write after the
 * browser has been reopened. Keeping this helper small makes it reusable for
 * deploy, configuration and funding without ever constructing a new tx.
 */
export async function reconcileTransaction(provider: Provider, hash: string): Promise<ReconciledTransaction> {
  const receipt = await provider.getTransactionReceipt(hash)
  if (!receipt) return { state: 'PENDING', hash }
  return { state: receipt.status === 1 ? 'CONFIRMED' : 'FAILED', hash: receipt.transactionHash || hash, receipt }
}

export type PendingLaunchOperation = 'schedule' | 'weights' | 'fee' | 'funding' | 'deploy' | null

function hasPendingFunding(session: NftPoolLaunchSession): boolean {
  const primary = session.funding.primary
  if (session.transactionHashes.primaryFunding && primary?.status !== 'VERIFIED' && primary?.status !== 'SKIPPED')
    return true
  return Object.keys(session.transactionHashes.sideFunding).some((tokenAddress) => {
    const progress = session.funding.side[tokenAddress]
    return progress?.status !== 'VERIFIED' && progress?.status !== 'SKIPPED'
  })
}

/**
 * Dispatch order is deliberate: the most recent unresolved operation wins,
 * while an old deployment hash is considered only when no later write is
 * awaiting reconciliation. This prevents a historical deploy receipt from
 * hijacking a session that already reached weights, fee or funding.
 */
export function nextPendingLaunchOperation(session: NftPoolLaunchSession): PendingLaunchOperation {
  if (session.transactionHashes.scheduleUpdate && session.pendingSchedule && session.poolAddress) return 'schedule'
  if (session.transactionHashes.weights && session.poolAddress && !session.verification.weights?.passed)
    return 'weights'
  if (session.transactionHashes.fee && session.poolAddress && !session.verification.fee?.passed) return 'fee'
  if (session.poolAddress && hasPendingFunding(session)) return 'funding'
  if (session.transactionHashes.deploy && !session.poolAddress) return 'deploy'
  return null
}

const stageRanks: Record<LaunchStage, number> = {
  DRAFT: 0,
  PREFLIGHT_RUNNING: 0,
  PREFLIGHT_FAILED: 0,
  PREFLIGHT_READY: 1,
  AWAITING_DEPLOY_SIGNATURE: 2,
  DEPLOY_SUBMITTED: 3,
  DEPLOY_CONFIRMING: 4,
  DEPLOY_CONFIRMED: 5,
  DEPLOY_VERIFIED: 6,
  WEIGHTS_REQUIRED: 7,
  AWAITING_WEIGHTS_SIGNATURE: 8,
  WEIGHTS_SUBMITTED: 9,
  WEIGHTS_CONFIRMING: 10,
  WEIGHTS_VERIFIED: 11,
  FEE_CONFIG_REQUIRED: 12,
  AWAITING_FEE_SIGNATURE: 13,
  FEE_SUBMITTED: 14,
  FEE_CONFIRMING: 15,
  FEE_VERIFIED: 16,
  FUNDING_REQUIRED: 17,
  FUNDING_IN_PROGRESS: 18,
  FINAL_VERIFYING: 19,
  COMPLETE: 20,
  CORRUPTED: Number.MAX_SAFE_INTEGER,
  FAILED: Number.MAX_SAFE_INTEGER,
}

/** Never let a late deploy reconciliation move a session backwards. */
export function advanceLaunchStage(session: NftPoolLaunchSession, candidate: LaunchStage): LaunchStage {
  if (session.currentStage === 'CORRUPTED' || session.currentStage === 'FAILED') return session.currentStage
  return stageRanks[candidate] >= stageRanks[session.currentStage] ? candidate : session.currentStage
}
