import { NftPoolDeploymentPlan } from '../types'
import { NftLaunchSchedule } from './types'

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
  const setupBufferBlocks = Math.max(MINIMUM_SETUP_BUFFER_BLOCKS, Math.ceil(bufferSeconds / measured))
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
): NftLaunchSchedule {
  const measured = positiveNumber(secondsPerBlock, schedule.measuredSecondsPerBlock)
  const setupBufferBlocks = Math.max(MINIMUM_SETUP_BUFFER_BLOCKS, Math.ceil(bufferSeconds / measured))
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
