import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import { NftPoolDraft, NftPoolDraftReward, NftPoolDurationPreset } from './types'

export const BPS_BASE = BigNumber.from(10_000)
export const PERCENT_BASE = BigNumber.from(100)

export interface SideRewardCalculation {
  tokenAddress: string
  requested: BigNumber
  achievable: BigNumber
  encodedPercentage: BigNumber
  residual: BigNumber
  deviation: BigNumber
  tolerance: BigNumber
  blocking: boolean
}

export interface RewardEmissionCalculation {
  tokenAddress: string
  requested: BigNumber
  achievable: BigNumber
  rewardPerBlock?: BigNumber
  residual: BigNumber
  decimals?: number
  source: 'manual' | 'quote' | 'missing'
}

export interface PoolEconomicsCalculation {
  blocks: number
  totalBudgetBaseUnits?: BigNumber
  primary: RewardEmissionCalculation
  side: SideRewardCalculation[]
  allocations: RewardEmissionCalculation[]
  warnings: string[]
  blockingIssues: string[]
}

export function parseUnitsExact(value: string | undefined, decimals: number | undefined): BigNumber | undefined {
  if (!value || decimals === undefined || decimals < 0 || decimals > 77) return undefined
  const normalized = value.trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return undefined
  const [whole, fraction = ''] = normalized.split('.')
  if (fraction.length > decimals && /[1-9]/.test(fraction.slice(decimals))) return undefined
  const padded = fraction.slice(0, decimals).padEnd(decimals, '0')
  try {
    return BigNumber.from(whole)
      .mul(BigNumber.from(10).pow(decimals))
      .add(padded ? BigNumber.from(padded) : 0)
  } catch {
    return undefined
  }
}

export function formatBaseUnits(value: BigNumber | undefined, decimals: number | undefined, precision = 6): string {
  if (!value || decimals === undefined) return 'Unavailable'
  try {
    const formatted = formatUnits(value, decimals)
    if (!formatted.includes('.')) return formatted
    const [whole, fraction] = formatted.split('.')
    return `${whole}.${fraction.slice(0, precision).replace(/0+$/, '') || '0'}`
  } catch {
    return 'Unavailable'
  }
}

export function durationPresetDays(preset: NftPoolDurationPreset, customDays?: string): number | undefined {
  if (preset === '1 month') return 30
  if (preset === '3 months') return 90
  if (preset === '6 months') return 180
  if (preset === '1 year') return 365
  const parsed = Number(customDays)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function estimateBlocksForDuration(
  preset: NftPoolDurationPreset,
  customDays: string | undefined,
  secondsPerBlock: number,
): number | undefined {
  const days = durationPresetDays(preset, customDays)
  if (!days || !Number.isFinite(secondsPerBlock) || secondsPerBlock <= 0) return undefined
  return Math.max(1, Math.floor((days * 86400) / secondsPerBlock))
}

/** Mirrors SmartChefInitializable.distributeSideRewards exactly. */
export function applySoliditySideReward(
  pendingPrimaryBaseUnits: BigNumber,
  percentage: BigNumber,
  primaryDecimals: number,
  sideDecimals: number,
): BigNumber {
  let result = pendingPrimaryBaseUnits.mul(percentage).div(PERCENT_BASE)
  const difference = sideDecimals - primaryDecimals
  if (difference > 0) result = result.mul(BigNumber.from(10).pow(difference))
  if (difference < 0) result = result.div(BigNumber.from(10).pow(-difference))
  return result
}

function abs(value: BigNumber): BigNumber {
  return value.isNegative() ? value.mul(-1) : value
}

function max(left: BigNumber, right: BigNumber): BigNumber {
  return left.gte(right) ? left : right
}

export function encodeSideRewardPercentage(
  primaryPerBlock: BigNumber,
  requestedSidePerBlock: BigNumber,
  primaryDecimals: number,
  sideDecimals: number,
): BigNumber {
  if (primaryPerBlock.isZero() || requestedSidePerBlock.isZero()) return BigNumber.from(0)
  const scale = BigNumber.from(10).pow(Math.abs(sideDecimals - primaryDecimals))
  const numerator =
    sideDecimals >= primaryDecimals
      ? requestedSidePerBlock.mul(PERCENT_BASE)
      : requestedSidePerBlock.mul(PERCENT_BASE).mul(scale)
  const denominator = sideDecimals >= primaryDecimals ? primaryPerBlock.mul(scale) : primaryPerBlock
  return numerator.div(denominator)
}

export function calculateSideReward(
  tokenAddress: string,
  requestedTotal: BigNumber,
  primaryPerBlock: BigNumber,
  blocks: number,
  primaryDecimals: number,
  sideDecimals: number,
  toleranceBps = 10,
): SideRewardCalculation {
  const requestedPerBlock = blocks > 0 ? requestedTotal.div(blocks) : BigNumber.from(0)
  const encodedPercentage = encodeSideRewardPercentage(
    primaryPerBlock,
    requestedPerBlock,
    primaryDecimals,
    sideDecimals,
  )
  const achievablePerBlock = applySoliditySideReward(primaryPerBlock, encodedPercentage, primaryDecimals, sideDecimals)
  const achievable = achievablePerBlock.mul(blocks)
  const residual = requestedTotal.gte(achievable) ? requestedTotal.sub(achievable) : BigNumber.from(0)
  const deviation = abs(requestedTotal.sub(achievable))
  const tolerance = max(BigNumber.from(1), requestedTotal.mul(toleranceBps).div(10_000))
  return {
    tokenAddress,
    requested: requestedTotal,
    achievable,
    encodedPercentage,
    residual,
    deviation,
    tolerance,
    blocking: deviation.gt(tolerance),
  }
}

function amountForReward(
  reward: NftPoolDraftReward,
  draft: NftPoolDraft,
  totalBudgetBaseUnits: BigNumber | undefined,
  budgetDecimals: number | undefined,
): { amount?: BigNumber; source: 'manual' | 'quote' | 'missing' } {
  const key = reward.address.toLowerCase()
  const manual = parseUnitsExact(draft.economics.manualAmounts[key], reward.decimals)
  if (manual !== undefined) return { amount: manual, source: 'manual' }
  const quote = draft.economics.quotes[key]
  if (!quote || !totalBudgetBaseUnits || !budgetDecimals) return { source: 'missing' }
  const quoteInput = parseUnitsExact(quote.inputAmount, budgetDecimals)
  const quoteOutput = parseUnitsExact(quote.outputAmount, reward.decimals)
  const bps = BigNumber.from(draft.economics.allocationBps[key] || 0)
  if (!quoteInput || !quoteOutput || quoteInput.isZero()) return { source: 'missing' }
  return { amount: totalBudgetBaseUnits.mul(bps).div(BPS_BASE).mul(quoteOutput).div(quoteInput), source: 'quote' }
}

export function calculatePoolEconomics(
  draft: NftPoolDraft,
  secondsPerBlock: number,
  budgetDecimals = draft.economics.budgetDecimals,
): PoolEconomicsCalculation {
  const blocks =
    draft.economics.estimatedBlocks ||
    estimateBlocksForDuration(draft.economics.durationPreset, draft.economics.customDurationDays, secondsPerBlock) ||
    0
  const totalBudgetBaseUnits = parseUnitsExact(draft.economics.totalBudget, budgetDecimals)
  const rewards = [draft.rewards.primary, ...draft.rewards.side].filter(Boolean) as NftPoolDraftReward[]
  const warnings: string[] = []
  const blockingIssues: string[] = []
  if (!blocks) blockingIssues.push('Duration must resolve to a positive number of blocks.')
  if (!totalBudgetBaseUnits) warnings.push('Budget is not available in base units yet.')

  const allocations = rewards.map((reward) => {
    const resolved = amountForReward(reward, draft, totalBudgetBaseUnits, budgetDecimals)
    const requested = resolved.amount || BigNumber.from(0)
    const rewardPerBlock = blocks > 0 ? requested.div(blocks) : undefined
    const residual = rewardPerBlock && blocks > 0 ? requested.sub(rewardPerBlock.mul(blocks)) : requested
    if (resolved.source === 'missing') blockingIssues.push(`Add a quote or exact manual amount for ${reward.symbol}.`)
    return {
      tokenAddress: reward.address,
      requested,
      achievable: rewardPerBlock && blocks > 0 ? rewardPerBlock.mul(blocks) : BigNumber.from(0),
      rewardPerBlock,
      residual,
      decimals: reward.decimals,
      source: resolved.source,
    }
  })
  const primaryAllocation = allocations[0] || {
    tokenAddress: '',
    requested: BigNumber.from(0),
    achievable: BigNumber.from(0),
    residual: BigNumber.from(0),
    decimals: undefined,
    source: 'missing' as const,
  }
  const primary = {
    ...primaryAllocation,
    rewardPerBlock: primaryAllocation.rewardPerBlock,
  }
  if (primaryAllocation.rewardPerBlock === undefined) blockingIssues.push('Choose a primary reward token and amount.')
  const side = draft.rewards.side.map((reward) => {
    const allocation = allocations.find((item) => item.tokenAddress.toLowerCase() === reward.address.toLowerCase())
    const requested = allocation?.requested || BigNumber.from(0)
    const result = calculateSideReward(
      reward.address,
      requested,
      primary.rewardPerBlock || BigNumber.from(0),
      blocks,
      primary.decimals || 0,
      reward.decimals || 0,
    )
    if (result.blocking) blockingIssues.push(`${reward.symbol} side reward cannot be encoded within tolerance.`)
    return result
  })
  if (side.some((item) => item.residual.gt(0)))
    warnings.push('Integer Solidity percentages leave a residual that must be reviewed.')
  return { blocks, totalBudgetBaseUnits, primary, side, allocations, warnings, blockingIssues }
}
