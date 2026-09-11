import { NftPoolLaunchSession, LaunchStage } from './types'
import { saveNftPoolLaunchSession } from './storage'

export function updateNftLaunchSession(
  session: NftPoolLaunchSession,
  patch: Partial<NftPoolLaunchSession>,
): NftPoolLaunchSession {
  const next = { ...session, ...patch, updatedAt: Date.now() }
  if (session.frozenAt && patch.plan && JSON.stringify(patch.plan) !== JSON.stringify(session.plan))
    throw new Error('The launch plan is frozen after the first transaction and cannot be edited.')
  const hasTransactionHash =
    Object.values(next.transactionHashes).some((value) => typeof value === 'string' && value) ||
    Object.keys(next.transactionHashes.sideFunding).length > 0
  if (hasTransactionHash && !next.frozenAt) next.frozenAt = Date.now()
  saveNftPoolLaunchSession(next)
  return next
}

export function isLaunchWriteInFlight(stage: LaunchStage): boolean {
  return [
    'AWAITING_DEPLOY_SIGNATURE',
    'DEPLOY_SUBMITTED',
    'DEPLOY_CONFIRMING',
    'AWAITING_WEIGHTS_SIGNATURE',
    'WEIGHTS_SUBMITTED',
    'WEIGHTS_CONFIRMING',
    'AWAITING_FEE_SIGNATURE',
    'FEE_SUBMITTED',
    'FEE_CONFIRMING',
    'FUNDING_IN_PROGRESS',
    'FINAL_VERIFYING',
  ].includes(stage)
}

export function nextNftLaunchStageAfterDeploy(session: NftPoolLaunchSession): LaunchStage {
  if (session.plan.collectionConfiguration.collectionWeightConfigurationRequired) return 'WEIGHTS_REQUIRED'
  if (session.plan.postDeploy.performanceFee || session.plan.postDeploy.feeTo) return 'FEE_CONFIG_REQUIRED'
  return 'FUNDING_REQUIRED'
}

export function nextNftLaunchStageAfterWeights(session: NftPoolLaunchSession): LaunchStage {
  return session.plan.postDeploy.performanceFee || session.plan.postDeploy.feeTo
    ? 'FEE_CONFIG_REQUIRED'
    : 'FUNDING_REQUIRED'
}

export function hasConfirmedDeployment(session: NftPoolLaunchSession): boolean {
  return Boolean(session.poolAddress && session.transactionHashes.deploy)
}

export function canRetryLaunch(session: NftPoolLaunchSession): boolean {
  return session.retryable && !isLaunchWriteInFlight(session.currentStage) && session.currentStage !== 'COMPLETE'
}
