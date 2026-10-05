import { NftPoolDeploymentPlan } from '../types'
import { BigNumber } from '@ethersproject/bignumber'
import type { NftLaunchSchedule, NftPoolLaunchSession } from './types'

export const DEFAULT_SETUP_BUFFER_SECONDS = 15 * 60
export const MINIMUM_SETUP_BUFFER_BLOCKS = 60
export const MIN_REMAINING_SETUP_SECONDS = 5 * 60
export const MIN_PREFLIGHT_VALIDITY_BLOCKS = 30

export function minimumRemainingSetupBlocks(secondsPerBlock: number): number {
  const measured = Number.isFinite(secondsPerBlock) && secondsPerBlock > 0 ? secondsPerBlock : 2.2
  return Math.max(MINIMUM_SETUP_BUFFER_BLOCKS, Math.ceil(MIN_REMAINING_SETUP_SECONDS / measured))
}

export function isSetupWindowSafe(currentBlock: number, startBlock: number, secondsPerBlock: number): boolean {
  return startBlock - currentBlock >= minimumRemainingSetupBlocks(secondsPerBlock)
}

export function isLaunchScheduleValid(schedule: NftLaunchSchedule, currentBlock: number): boolean {
  return (
    Number.isInteger(schedule.startBlock) &&
    Number.isInteger(schedule.endBlock) &&
    schedule.startBlock > currentBlock &&
    schedule.endBlock > schedule.startBlock &&
    schedule.finalDurationBlocks === schedule.endBlock - schedule.startBlock
  )
}

function positiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function hasPositiveAmount(value?: string): boolean {
  try {
    return BigNumber.from(value || '0').gt(0)
  } catch {
    return false
  }
}

function minimumBufferBlocks(bufferSeconds: number, secondsPerBlock: number): number {
  return Math.max(MINIMUM_SETUP_BUFFER_BLOCKS, Math.ceil(bufferSeconds / secondsPerBlock))
}

/**
 * Count the writes planned after preflight. Each confirmed write consumes at
 * least one block, so the start buffer must preserve the safety window after
 * deployment, configuration and funding have all been mined.
 */
export function plannedNftLaunchWriteCount(plan: NftPoolDeploymentPlan): number {
  let writes = 1 // pool deployment
  if (plan.collectionConfiguration?.collectionWeightConfigurationRequired) writes += 1
  if (plan.postDeploy?.performanceFee || plan.postDeploy?.feeTo) writes += 1
  if (hasPositiveAmount(plan.fundingRequirements?.primary?.maximumScheduledFunding)) writes += 1
  writes += (plan.fundingRequirements?.side || []).filter((side) =>
    hasPositiveAmount(side.maximumImpliedSideFunding),
  ).length
  return writes
}

/** Count only setup writes that have not yet been verified on a launch session. */
export function remainingNftLaunchSetupWriteCount(session: NftPoolLaunchSession): number {
  const { plan, verification, funding } = session
  let writes = 0

  if (plan.collectionConfiguration.collectionWeightConfigurationRequired && !verification.weights?.passed) writes += 1
  if ((plan.postDeploy.performanceFee || plan.postDeploy.feeTo) && !verification.fee?.passed) writes += 1

  const fundingIsComplete = (status?: string) => status === 'VERIFIED' || status === 'SKIPPED'
  if (
    hasPositiveAmount(plan.fundingRequirements.primary.maximumScheduledFunding) &&
    !fundingIsComplete(funding.primary?.status)
  ) {
    writes += 1
  }

  for (const side of plan.fundingRequirements.side) {
    const progress = funding.side[side.tokenAddress.toLowerCase()]
    if (hasPositiveAmount(side.maximumImpliedSideFunding) && !fundingIsComplete(progress?.status)) writes += 1
  }
  return writes
}

export function durationBlocksForPlan(plan: NftPoolDeploymentPlan, _secondsPerBlock: number): number {
  // Funding and rewardPerBlock are frozen against this exact block count.
  // Fresh block timing affects setup buffer and wall-clock estimates only.
  const blocks = plan.scheduleIntent.estimatedDurationBlocks
  if (!Number.isSafeInteger(blocks) || blocks <= 0) throw new Error('Frozen duration blocks are invalid.')
  return blocks
}

export function prepareNftLaunchSchedule(
  plan: NftPoolDeploymentPlan,
  currentBlock: number,
  secondsPerBlock: number,
  bufferSeconds = DEFAULT_SETUP_BUFFER_SECONDS,
): NftLaunchSchedule {
  if (!Number.isInteger(currentBlock) || currentBlock < 0) throw new Error('Current Polygon block is invalid.')
  const measured = positiveNumber(secondsPerBlock, plan.scheduleIntent.measuredSecondsPerBlock)
  const finalDurationBlocks = durationBlocksForPlan(plan, measured)
  const setupBufferBlocks = minimumBufferBlocks(bufferSeconds, measured) + plannedNftLaunchWriteCount(plan)
  const startBlock = currentBlock + setupBufferBlocks
  const endBlock = startBlock + finalDurationBlocks
  if (!(currentBlock < startBlock && startBlock < endBlock))
    throw new Error('Prepared schedule is not strictly ordered.')
  return {
    planningEstimateBlocks: plan.scheduleIntent.estimatedDurationBlocks,
    finalDurationBlocks,
    setupBufferBlocks,
    bufferSeconds,
    measuredSecondsPerBlock: measured,
    currentBlockAtPreparation: currentBlock,
    startBlock,
    endBlock,
    preparedAt: Date.now(),
  }
}

export function moveNftLaunchScheduleLater(
  schedule: NftLaunchSchedule,
  currentBlock: number,
  secondsPerBlock = schedule.measuredSecondsPerBlock,
  bufferSeconds = schedule.bufferSeconds,
  additionalWriteHeadroom = 1,
): NftLaunchSchedule {
  const measured = positiveNumber(secondsPerBlock, schedule.measuredSecondsPerBlock)
  const writeHeadroom = Number.isFinite(additionalWriteHeadroom) ? Math.max(0, Math.ceil(additionalWriteHeadroom)) : 0
  const setupBufferBlocks = minimumBufferBlocks(bufferSeconds, measured) + writeHeadroom
  const startBlock = currentBlock + setupBufferBlocks
  return {
    ...schedule,
    setupBufferBlocks,
    bufferSeconds,
    measuredSecondsPerBlock: measured,
    currentBlockAtPreparation: currentBlock,
    startBlock,
    endBlock: startBlock + schedule.finalDurationBlocks,
    preparedAt: Date.now(),
  }
}
