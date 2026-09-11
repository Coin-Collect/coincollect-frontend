import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits, parseUnits } from '@ethersproject/units'
import { POLYGON_FALLBACK_SECONDS_PER_BLOCK } from './constants'
import { PoolManagerStatus, RewardPlan } from './types'

export const ZERO = BigNumber.from(0)

export function parseTokenAmount(value: string, decimals: number): BigNumber {
  if (!value || value.trim() === '') return ZERO
  return parseUnits(value.trim(), decimals)
}

export function formatTokenAmount(value: BigNumber, decimals: number): string {
  return formatUnits(value, decimals)
}

export function calculateRewardPlan(budgetBaseUnits: BigNumber, rewardBlocks: BigNumber): RewardPlan {
  if (budgetBaseUnits.lt(0)) throw new Error('Reward budget cannot be negative')
  if (rewardBlocks.lte(0)) throw new Error('Reward block count must be greater than zero')

  const rewardPerBlock = budgetBaseUnits.div(rewardBlocks)
  const plannedMaximumEmission = rewardPerBlock.mul(rewardBlocks)
  const residual = budgetBaseUnits.sub(plannedMaximumEmission)

  return { budgetBaseUnits, rewardBlocks, rewardPerBlock, plannedMaximumEmission, residual }
}

export function estimateBlocksForDuration(durationDays: number, secondsPerBlock: number): number {
  if (!Number.isFinite(durationDays) || durationDays <= 0) throw new Error('Duration must be greater than zero')
  const interval =
    Number.isFinite(secondsPerBlock) && secondsPerBlock > 0 ? secondsPerBlock : POLYGON_FALLBACK_SECONDS_PER_BLOCK
  return Math.max(1, Math.ceil((durationDays * 24 * 60 * 60) / interval))
}

export function median(values: number[]): number {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return POLYGON_FALLBACK_SECONDS_PER_BLOCK
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function getPoolStatus(currentBlock: number, startBlock: number, bonusEndBlock: number): PoolManagerStatus {
  if (!Number.isFinite(currentBlock) || !Number.isFinite(startBlock) || !Number.isFinite(bonusEndBlock))
    return 'UNKNOWN'
  if (currentBlock < startBlock) return 'UPCOMING'
  if (currentBlock < bonusEndBlock) return 'ACTIVE'
  return 'FINISHED'
}

export function estimateBlockTimestamp(
  currentBlock: number,
  targetBlock: number,
  currentTimestamp: number | undefined,
  secondsPerBlock: number,
): number | undefined {
  if (currentTimestamp === undefined || !Number.isFinite(currentTimestamp)) return undefined
  return currentTimestamp + (targetBlock - currentBlock) * secondsPerBlock
}

export function makeLogicalPeriodId(stakingSymbol: string, rewardSymbol: string, startBlock: number): string {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${clean(stakingSymbol)}-${clean(rewardSymbol)}-${startBlock}`
}

export function canonicalPoolId(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`
}

export function formatDate(timestamp?: number): string {
  if (!timestamp) return 'Unavailable'
  return new Date(timestamp * 1000).toLocaleString()
}
