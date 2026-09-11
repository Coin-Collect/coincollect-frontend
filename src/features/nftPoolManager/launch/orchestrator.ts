import { isAddress } from '@ethersproject/address'
import { NftPoolDeploymentPlan } from '../types'
import { getNftLaunchSessionIntegrityError, saveNftPoolLaunchSession } from './storage'
import {
  isLaunchScheduleValid,
  isSetupWindowSafe,
  minimumRemainingSetupBlocks,
  MIN_PREFLIGHT_VALIDITY_BLOCKS,
} from './schedule'
import { LaunchStage, NftLaunchPoolSnapshot, NftPoolLaunchSession } from './types'

export interface LaunchEligibility {
  allowed: boolean
  reasons: string[]
}

const POST_DEPLOY_STAGES: LaunchStage[] = [
  'DEPLOY_VERIFIED',
  'WEIGHTS_REQUIRED',
  'AWAITING_WEIGHTS_SIGNATURE',
  'WEIGHTS_SUBMITTED',
  'WEIGHTS_CONFIRMING',
  'WEIGHTS_VERIFIED',
  'FEE_CONFIG_REQUIRED',
  'AWAITING_FEE_SIGNATURE',
  'FEE_SUBMITTED',
  'FEE_CONFIRMING',
  'FEE_VERIFIED',
  'FUNDING_REQUIRED',
  'FUNDING_IN_PROGRESS',
  'FINAL_VERIFYING',
  'COMPLETE',
]

const WEIGHTS_COMPLETE_STAGES: LaunchStage[] = [
  'WEIGHTS_VERIFIED',
  'FEE_CONFIG_REQUIRED',
  'AWAITING_FEE_SIGNATURE',
  'FEE_SUBMITTED',
  'FEE_CONFIRMING',
  'FEE_VERIFIED',
  'FUNDING_REQUIRED',
  'FUNDING_IN_PROGRESS',
  'FINAL_VERIFYING',
  'COMPLETE',
]

const FEE_COMPLETE_STAGES: LaunchStage[] = [
  'FEE_VERIFIED',
  'FUNDING_REQUIRED',
  'FUNDING_IN_PROGRESS',
  'FINAL_VERIFYING',
  'COMPLETE',
]

const fundingStages: LaunchStage[] = ['FUNDING_REQUIRED', 'FUNDING_IN_PROGRESS', 'FINAL_VERIFYING', 'COMPLETE']

function sameAddress(left?: string, right?: string): boolean {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase())
}

function addReason(reasons: string[], condition: boolean, reason: string): void {
  if (condition) reasons.push(reason)
}

function eligibility(reasons: string[]): LaunchEligibility {
  return { allowed: reasons.length === 0, reasons }
}

function planIntegrityReasons(session: NftPoolLaunchSession): string[] {
  const integrityError = getNftLaunchSessionIntegrityError(session)
  return integrityError ? [integrityError] : []
}

export function validateLaunchSessionInvariant(session: NftPoolLaunchSession): string[] {
  const reasons = planIntegrityReasons(session)
  if (session.currentStage === 'CORRUPTED') reasons.push(session.error || 'Launch session is corrupted.')
  if (session.currentStage === 'COMPLETE') {
    addReason(reasons, !session.verification.deployment?.passed, 'Deployment verification is not confirmed.')
    addReason(
      reasons,
      Boolean(session.plan.collectionConfiguration.collectionWeightConfigurationRequired) &&
        !session.verification.weights?.passed,
      'Required NFT power verification is not confirmed.',
    )
    addReason(
      reasons,
      Boolean(session.plan.postDeploy.performanceFee || session.plan.postDeploy.feeTo) &&
        !session.verification.fee?.passed,
      'Required fee verification is not confirmed.',
    )
    addReason(reasons, !session.verification.funding?.passed, 'Reward funding verification is not confirmed.')
    addReason(reasons, !session.verification.final?.passed, 'Final verification is not confirmed.')
    return Array.from(new Set(reasons))
  }

  if (POST_DEPLOY_STAGES.includes(session.currentStage))
    addReason(reasons, !session.verification.deployment?.passed, 'Deployment verification must pass before setup.')

  const weightsRequired = Boolean(session.plan.collectionConfiguration.collectionWeightConfigurationRequired)
  if (weightsRequired && WEIGHTS_COMPLETE_STAGES.includes(session.currentStage))
    addReason(reasons, !session.verification.weights?.passed, 'Required NFT power verification must pass first.')

  const feeRequired = Boolean(session.plan.postDeploy.performanceFee || session.plan.postDeploy.feeTo)
  if (feeRequired && FEE_COMPLETE_STAGES.includes(session.currentStage))
    addReason(reasons, !session.verification.fee?.passed, 'Required fee verification must pass first.')

  if (fundingStages.includes(session.currentStage))
    addReason(reasons, !session.poolAddress, 'A confirmed pool address is required for funding.')
  return Array.from(new Set(reasons))
}

function hasFreshPreflight(session: NftPoolLaunchSession, currentBlock: number): boolean {
  const preflight = session.preflight
  const schedule = session.schedule
  if (!preflight || !schedule || !preflight.ok) return false
  if (preflight.chainId !== 137 || preflight.currentBlockAtPreflight !== preflight.currentBlock) return false
  if (preflight.expiresAtBlock <= 0 || currentBlock > preflight.expiresAtBlock) return false
  if (schedule.preparedAt !== preflight.schedulePreparedAt) return false
  if (
    schedule.startBlock !== preflight.schedule.startBlock ||
    schedule.endBlock !== preflight.schedule.endBlock ||
    schedule.finalDurationBlocks !== preflight.schedule.finalDurationBlocks
  )
    return false
  if (currentBlock - preflight.currentBlockAtPreflight > MIN_PREFLIGHT_VALIDITY_BLOCKS) return false
  return (
    isLaunchScheduleValid(schedule, currentBlock) &&
    isSetupWindowSafe(currentBlock, schedule.startBlock, schedule.measuredSecondsPerBlock)
  )
}

function commonChainReasons(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): string[] {
  const reasons = planIntegrityReasons(session)
  reasons.push(...validateLaunchSessionInvariant(session).filter((reason) => !reasons.includes(reason)))
  addReason(reasons, snapshot.readError !== undefined, snapshot.readError || 'Required chain reads are unavailable.')
  addReason(reasons, snapshot.chainId !== 137, 'Connected chain is not Polygon (chain 137).')
  addReason(reasons, !snapshot.account, 'Connected wallet address could not be revalidated.')
  addReason(
    reasons,
    !sameAddress(snapshot.account, session.intendedAdmin),
    'Connected wallet is not the frozen operator.',
  )
  return reasons
}

function poolReasons(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): string[] {
  const reasons = commonChainReasons(session, snapshot)
  const expectedFingerprint = session.poolFingerprint || session.verification.deployment?.fingerprint
  addReason(
    reasons,
    Boolean(session.pendingSchedule),
    'A schedule update is awaiting confirmation and exact on-chain read-back.',
  )
  addReason(reasons, !session.poolAddress, 'A confirmed pool address is required.')
  addReason(
    reasons,
    !sameAddress(snapshot.poolAddress, session.poolAddress),
    'On-chain pool address does not match the session.',
  )
  addReason(reasons, !snapshot.poolCode || snapshot.poolCode === '0x', 'Target pool has no contract code.')
  addReason(
    reasons,
    !sameAddress(snapshot.factoryAddress, session.factoryAddress),
    'Pool factory does not match the frozen factory.',
  )
  addReason(reasons, !sameAddress(snapshot.owner, session.intendedAdmin), 'Pool owner is not the frozen operator.')
  addReason(
    reasons,
    !sameAddress(snapshot.stakedToken, session.plan.factoryParameters.stakedTokenAddress),
    'Pool staked token does not match the frozen plan.',
  )
  addReason(
    reasons,
    !sameAddress(snapshot.rewardToken, session.plan.factoryParameters.rewardTokenAddress),
    'Pool reward token does not match the frozen plan.',
  )
  addReason(
    reasons,
    !snapshot.fingerprint || !expectedFingerprint || snapshot.fingerprint !== expectedFingerprint,
    'Pool fingerprint is not verified against the frozen launch.',
  )
  return reasons
}

function setupWindowReasons(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): string[] {
  const reasons: string[] = []
  const startBlock = snapshot.startBlock
  addReason(reasons, startBlock === undefined, 'Pool start block could not be read.')
  if (startBlock !== undefined) {
    addReason(reasons, snapshot.currentBlock >= startBlock, 'Pool has already started while setup is incomplete.')
    addReason(
      reasons,
      !isSetupWindowSafe(snapshot.currentBlock, startBlock, session.schedule?.measuredSecondsPerBlock || 2.2),
      `Remaining setup window is too short; keep at least ${minimumRemainingSetupBlocks(
        session.schedule?.measuredSecondsPerBlock || 2.2,
      )} blocks before start.`,
    )
  }
  return reasons
}

export function canDeploy(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): LaunchEligibility {
  const reasons = commonChainReasons(session, snapshot)
  addReason(reasons, session.currentStage !== 'PREFLIGHT_READY', 'Pool setup checks must pass before creation.')
  addReason(reasons, Boolean(session.transactionHashes.deploy), 'A deployment transaction already exists.')
  addReason(reasons, Boolean(session.poolAddress), 'A pool address already exists for this session.')
  addReason(reasons, !session.preflight?.ok, 'A passing preflight is required.')
  addReason(reasons, !hasFreshPreflight(session, snapshot.currentBlock), 'Preflight expired — run again.')
  addReason(
    reasons,
    !sameAddress(snapshot.factoryAddress, session.factoryAddress),
    'Factory address could not be revalidated.',
  )
  addReason(
    reasons,
    !snapshot.factoryCode || snapshot.factoryCode === '0x',
    'Factory contract code could not be verified.',
  )
  addReason(
    reasons,
    !sameAddress(snapshot.factoryOwner, session.intendedAdmin),
    'Factory owner changed since preflight.',
  )
  addReason(reasons, snapshot.poolAddress !== undefined, 'A target pool already exists on the chain snapshot.')
  return eligibility(Array.from(new Set(reasons)))
}

function canPostDeploy(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): string[] {
  const reasons = poolReasons(session, snapshot)
  addReason(reasons, !session.verification.deployment?.passed, 'Deployment verification must pass before this write.')
  addReason(reasons, !sameAddress(snapshot.account, snapshot.owner), 'Connected wallet is not the current pool owner.')
  reasons.push(...setupWindowReasons(session, snapshot))
  return reasons
}

export function canConfigureWeights(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): LaunchEligibility {
  const reasons = canPostDeploy(session, snapshot)
  addReason(reasons, session.currentStage !== 'WEIGHTS_REQUIRED', 'NFT staking setup is not ready to be confirmed yet.')
  addReason(
    reasons,
    Boolean(session.transactionHashes.weights && !session.verification.weights?.passed),
    'An NFT power transaction is awaiting receipt and read-back before another write can be sent.',
  )
  return eligibility(Array.from(new Set(reasons)))
}

export function canConfigureFee(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): LaunchEligibility {
  const reasons = canPostDeploy(session, snapshot)
  addReason(reasons, session.currentStage !== 'FEE_CONFIG_REQUIRED', 'Fee setup is not ready to be confirmed yet.')
  addReason(
    reasons,
    Boolean(session.transactionHashes.fee && !session.verification.fee?.passed),
    'A fee transaction is awaiting receipt and read-back before another write can be sent.',
  )
  addReason(reasons, !isAddress(session.plan.postDeploy.feeTo || ''), 'Frozen fee recipient is invalid.')
  addReason(reasons, !/^\d+$/.test(session.plan.postDeploy.performanceFee || ''), 'Frozen performance fee is invalid.')
  return eligibility(Array.from(new Set(reasons)))
}

export function canFund(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): LaunchEligibility {
  const reasons = canPostDeploy(session, snapshot)
  addReason(
    reasons,
    session.currentStage !== 'FUNDING_REQUIRED' && session.currentStage !== 'FUNDING_IN_PROGRESS',
    'Reward funding is not ready yet.',
  )
  addReason(
    reasons,
    !sameAddress(snapshot.account, session.intendedAdmin),
    'Funding operator does not match the frozen operator.',
  )
  addReason(
    reasons,
    !sameAddress(snapshot.rewardToken, session.plan.fundingRequirements.primary.tokenAddress),
    'Primary funding token does not match pool.rewardToken().',
  )
  const plannedSideTokens = session.plan.factoryParameters.sideRewardTokens.map((token) => token.toLowerCase())
  const actualSideTokens = (snapshot.sideRewardTokens || []).map((token) => token.toLowerCase())
  addReason(
    reasons,
    plannedSideTokens.length !== actualSideTokens.length ||
      plannedSideTokens.some((token, index) => token !== actualSideTokens[index]),
    'Side reward token mapping does not match the frozen plan.',
  )
  session.plan.factoryParameters.sideRewardTokens.forEach((token, index) => {
    const expectedPercentage = session.plan.factoryParameters.sideRewardPercentages[index]
    addReason(
      reasons,
      (snapshot.sideRewardPercentages || [])[index] !== expectedPercentage,
      `Side reward percentage for ${token} does not match the frozen plan.`,
    )
  })
  return eligibility(Array.from(new Set(reasons)))
}

export function canMoveSchedule(session: NftPoolLaunchSession, snapshot: NftLaunchPoolSnapshot): LaunchEligibility {
  const reasons = poolReasons(session, snapshot)
  addReason(
    reasons,
    !session.verification.deployment?.passed,
    'Deployment verification must pass before moving the schedule.',
  )
  addReason(reasons, !sameAddress(snapshot.account, snapshot.owner), 'Connected wallet is not the current pool owner.')
  addReason(reasons, snapshot.startBlock === undefined, 'Pool start block could not be read.')
  addReason(
    reasons,
    snapshot.startBlock !== undefined && snapshot.currentBlock >= snapshot.startBlock,
    'The pool start block has already passed.',
  )
  addReason(reasons, isLaunchWriteInFlight(session.currentStage), 'Another launch transaction is still in flight.')
  addReason(reasons, session.currentStage === 'COMPLETE', 'Re-verify a completed session before moving its schedule.')
  return eligibility(Array.from(new Set(reasons)))
}

export function canFinalVerify(session: NftPoolLaunchSession, snapshot?: NftLaunchPoolSnapshot): LaunchEligibility {
  const reasons = planIntegrityReasons(session)
  addReason(reasons, !session.poolAddress || !session.schedule, 'A confirmed pool and schedule are required.')
  addReason(
    reasons,
    !session.verification.deployment?.passed,
    'Deployment verification must pass before final verification.',
  )
  if (snapshot) {
    reasons.push(...poolReasons(session, snapshot))
    if (session.currentStage === 'COMPLETE')
      addReason(
        reasons,
        snapshot.currentBlock >= (snapshot.startBlock || Number.MAX_SAFE_INTEGER),
        'Completed session no longer matches the expected pre-start state.',
      )
  }
  return eligibility(Array.from(new Set(reasons)))
}

export function getNftCanaryRecommendation(plan: NftPoolDeploymentPlan): { status: 'PASS' | 'WARN'; message: string } {
  const simple =
    plan.collectionConfiguration.communityCollections.length === 0 &&
    plan.fundingRequirements.side.length === 0 &&
    !plan.postDeploy.performanceFee &&
    !plan.postDeploy.feeTo &&
    plan.collectionConfiguration.primaryCollection !== ''
  return simple
    ? { status: 'PASS', message: 'Canary simplicity: one collection, primary reward only, no fee.' }
    : { status: 'WARN', message: 'Canary simplicity: consider one collection, no side reward and no fee.' }
}

export function updateNftLaunchSession(
  session: NftPoolLaunchSession,
  patch: Partial<NftPoolLaunchSession>,
): NftPoolLaunchSession {
  const integrityError = getNftLaunchSessionIntegrityError(session)
  if (integrityError || session.currentStage === 'CORRUPTED')
    throw new Error(integrityError || session.error || 'Corrupted launch session cannot be changed.')
  if (patch.plan && JSON.stringify(patch.plan) !== JSON.stringify(session.plan))
    throw new Error('The frozen launch plan cannot be edited.')
  const next = { ...session, ...patch, updatedAt: Date.now() }
  const hasTransactionHash = Object.entries(next.transactionHashes).some(([key, value]) =>
    key === 'sideFunding'
      ? Object.keys(value as Record<string, string>).length > 0
      : typeof value === 'string' && Boolean(value),
  )
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
  if (!session.verification.deployment?.passed) return 'DEPLOY_VERIFIED'
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
  return (
    session.retryable &&
    !isLaunchWriteInFlight(session.currentStage) &&
    session.currentStage !== 'COMPLETE' &&
    session.currentStage !== 'CORRUPTED'
  )
}
