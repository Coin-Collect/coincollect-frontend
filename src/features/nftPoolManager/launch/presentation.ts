import { LaunchStage } from './types'

export function launchStageLabel(stage: LaunchStage): string {
  switch (stage) {
    case 'DRAFT':
      return 'Launch not started'
    case 'PREFLIGHT_RUNNING':
      return 'Checking setup'
    case 'PREFLIGHT_FAILED':
      return 'Setup blocked'
    case 'PREFLIGHT_READY':
      return 'Ready to deploy'
    case 'AWAITING_DEPLOY_SIGNATURE':
    case 'AWAITING_WEIGHTS_SIGNATURE':
    case 'AWAITING_FEE_SIGNATURE':
      return 'Wallet approval needed'
    case 'DEPLOY_SUBMITTED':
    case 'DEPLOY_CONFIRMING':
      return 'Deployment pending'
    case 'DEPLOY_CONFIRMED':
      return 'Deployment verification needed'
    case 'DEPLOY_VERIFIED':
      return 'Pool setup continues'
    case 'WEIGHTS_REQUIRED':
      return 'NFT settings required'
    case 'WEIGHTS_SUBMITTED':
    case 'WEIGHTS_CONFIRMING':
      return 'Confirming NFT settings'
    case 'WEIGHTS_VERIFIED':
      return 'NFT settings verified'
    case 'FEE_CONFIG_REQUIRED':
      return 'Fee setup required'
    case 'FEE_SUBMITTED':
    case 'FEE_CONFIRMING':
      return 'Confirming fee setup'
    case 'FEE_VERIFIED':
      return 'Fee setup verified'
    case 'FUNDING_REQUIRED':
      return 'Funding required'
    case 'FUNDING_IN_PROGRESS':
      return 'Funding in progress'
    case 'FINAL_VERIFYING':
      return 'Final verification pending'
    case 'COMPLETE':
      return 'Complete'
    case 'CORRUPTED':
      return 'Session integrity check failed'
    case 'FAILED':
      return 'Launch failed'
    default: {
      const exhaustive: never = stage
      return exhaustive
    }
  }
}

export function launchStageAttentionPriority(stage: LaunchStage): number | null {
  if (stage === 'COMPLETE') return null
  if (stage === 'CORRUPTED' || stage === 'FAILED' || stage === 'PREFLIGHT_FAILED') return 0
  if (
    stage === 'PREFLIGHT_READY' ||
    stage === 'AWAITING_DEPLOY_SIGNATURE' ||
    stage === 'AWAITING_WEIGHTS_SIGNATURE' ||
    stage === 'AWAITING_FEE_SIGNATURE'
  ) {
    return 1
  }
  if (
    stage === 'DRAFT' ||
    stage === 'DEPLOY_VERIFIED' ||
    stage === 'WEIGHTS_REQUIRED' ||
    stage === 'FEE_CONFIG_REQUIRED' ||
    stage === 'FUNDING_REQUIRED'
  ) {
    return 2
  }
  return 3
}
