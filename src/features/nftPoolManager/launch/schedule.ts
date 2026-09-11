import { NftPoolDeploymentPlan } from '../types'
import { NftLaunchSchedule } from './types'

export const DEFAULT_SETUP_BUFFER_SECONDS = 15 * 60
export const MINIMUM_SETUP_BUFFER_BLOCKS = 60

function positiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function durationBlocksForPlan(plan: NftPoolDeploymentPlan, secondsPerBlock: number): number {
  const seconds = positiveNumber(plan.scheduleIntent.durationDays, 1) * 86400
  return Math.max(1, Math.ceil(seconds / positiveNumber(secondsPerBlock, 2.2)))
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
