import { BigNumber } from '@ethersproject/bignumber'
import { formatUnits } from '@ethersproject/units'
import { NftPoolDraft, NftPoolDraftQuote, NftPoolDraftReward, NftQuoteState, NftRewardAmountSource } from './types'
import { getNftQuoteState, quoteMatchesInputs } from './quotes'

export const BPS_BASE = BigNumber.from(10_000)
export const PERCENT_BASE = BigNumber.from(100)

export interface BudgetAllocationCalculation {
  tokenAddress: string
  allocationBps: BigNumber
  allocatedBudget: BigNumber
}

export interface RewardAllocationCalculation {
  tokenAddress: string
  allocationBps: BigNumber
  allocatedBudget: BigNumber
  desiredAmount: BigNumber
  decimals?: number
  source: NftRewardAmountSource
  quoteState?: NftQuoteState
  quote?: NftPoolDraftQuote
  valuationVerified: boolean
}

export interface PrimaryEmissionCalculation extends RewardAllocationCalculation {
  rewardPerBlock?: BigNumber
  maximumScheduledFunding: BigNumber
  residual: BigNumber
}

export interface SideRewardCalculation {
  tokenAddress: string
  desiredSideAmount: BigNumber
  encodedPercentage: BigNumber
  maximumImpliedSideFunding: BigNumber
  deviationFromDesired: BigNumber
  deviationBps: BigNumber
  toleranceBps: number
  representability: 'EXACT' | 'WITHIN_TOLERANCE' | 'OUTSIDE_TOLERANCE'
  blocking: boolean
  source: NftRewardAmountSource
  quoteState?: NftQuoteState
}

export interface PoolEconomicsCalculation {
  durationDays?: number
  estimatedDurationBlocks: number
  measuredSecondsPerBlock: number
  blocks: number
  totalBudgetBaseUnits?: BigNumber
  budgetAllocations: BudgetAllocationCalculation[]
  budgetRoundingRemainder: BigNumber
  primary: PrimaryEmissionCalculation
  side: SideRewardCalculation[]
  /** Reward amounts are desired targets; side rewards are not independent emissions. */
  allocations: RewardAllocationCalculation[]
  warnings: string[]
  information: string[]
  blockingIssues: string[]
}

export function parseUnitsExact(value: string | undefined, decimals: number | undefined): BigNumber | undefined {
  if (value === undefined || decimals === undefined || decimals < 0 || decimals > 77) return undefined
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

export function formatBaseUnitsExact(value: BigNumber | undefined, decimals: number | undefined): string {
  if (!value || decimals === undefined) return 'Unavailable'
  try {
    return formatUnits(value, decimals)
  } catch {
    return 'Unavailable'
  }
}

export function formatBaseUnits(value: BigNumber | undefined, decimals: number | undefined, precision = 6): string {
  const formatted = formatBaseUnitsExact(value, decimals)
  if (formatted === 'Unavailable' || !formatted.includes('.')) return formatted
  const [whole, fraction] = formatted.split('.')
  return `${whole}.${fraction.slice(0, precision).replace(/0+$/, '') || '0'}`
}

export function durationPresetDays(
  preset: NftPoolDraft['economics']['durationPreset'],
  customDays?: string,
): number | undefined {
  if (preset === '1 month') return 30
  if (preset === '3 months') return 90
  if (preset === '6 months') return 180
  if (preset === '1 year') return 365
  const parsed = Number(customDays)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function estimateBlocksForDuration(
  preset: NftPoolDraft['economics']['durationPreset'],
  customDays: string | undefined,
  secondsPerBlock: number,
): number | undefined {
  const days = durationPresetDays(preset, customDays)
  if (!days || !Number.isFinite(secondsPerBlock) || secondsPerBlock <= 0) return undefined
  return Math.max(1, Math.floor((days * 86400) / secondsPerBlock))
}

/** Mirrors SmartChefInitializable.distributeSideRewards exactly for one payout. */
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

function absolute(value: BigNumber): BigNumber {
  return value.isNegative() ? value.mul(-1) : value
}

/** Encodes the largest integer percentage that does not exceed the desired ratio. */
export function encodeSideRewardPercentage(
  primaryAmount: BigNumber,
  desiredSideAmount: BigNumber,
  primaryDecimals: number,
  sideDecimals: number,
): BigNumber {
  if (primaryAmount.isZero() || desiredSideAmount.isZero()) return BigNumber.from(0)
  const scale = BigNumber.from(10).pow(Math.abs(sideDecimals - primaryDecimals))
  const numerator =
    sideDecimals >= primaryDecimals
      ? desiredSideAmount.mul(PERCENT_BASE)
      : desiredSideAmount.mul(PERCENT_BASE).mul(scale)
  const denominator = sideDecimals >= primaryDecimals ? primaryAmount.mul(scale) : primaryAmount
  return numerator.div(denominator)
}

export function calculateSideReward(
  tokenAddress: string,
  desiredSideAmount: BigNumber,
  maxPrimaryEmission: BigNumber,
  primaryDecimals: number,
  sideDecimals: number,
  source: NftRewardAmountSource = 'missing',
  quoteState?: NftQuoteState,
  toleranceBps = 10,
): SideRewardCalculation {
  const encodedPercentage = encodeSideRewardPercentage(
    maxPrimaryEmission,
    desiredSideAmount,
    primaryDecimals,
    sideDecimals,
  )
  const maximumImpliedSideFunding = applySoliditySideReward(
    maxPrimaryEmission,
    encodedPercentage,
    primaryDecimals,
    sideDecimals,
  )
  const deviationFromDesired = absolute(desiredSideAmount.sub(maximumImpliedSideFunding))
  const withinTolerance = desiredSideAmount.isZero()
    ? deviationFromDesired.isZero()
    : deviationFromDesired.mul(BPS_BASE).lte(desiredSideAmount.mul(toleranceBps))
  const representability = deviationFromDesired.isZero()
    ? 'EXACT'
    : withinTolerance
    ? 'WITHIN_TOLERANCE'
    : 'OUTSIDE_TOLERANCE'
  const deviationBps = desiredSideAmount.isZero()
    ? BigNumber.from(0)
    : deviationFromDesired.mul(BPS_BASE).div(desiredSideAmount)
  return {
    tokenAddress,
    desiredSideAmount,
    encodedPercentage,
    maximumImpliedSideFunding,
    deviationFromDesired,
    deviationBps,
    toleranceBps,
    representability,
    blocking: representability === 'OUTSIDE_TOLERANCE',
    source,
    quoteState,
  }
}

function parseBps(value: string | undefined): BigNumber | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined
  try {
    const parsed = BigNumber.from(value)
    return parsed.lte(BPS_BASE) ? parsed : undefined
  } catch {
    return undefined
  }
}

function amountForReward(
  reward: NftPoolDraftReward,
  draft: NftPoolDraft,
  allocatedBudget: BigNumber,
  budgetDecimals: number | undefined,
  allocationBps: BigNumber,
  now = Date.now(),
): {
  amount: BigNumber
  source: NftRewardAmountSource
  quoteState?: NftQuoteState
  quote?: NftPoolDraftQuote
  valuationVerified: boolean
} {
  const key = reward.address.toLowerCase()
  const manualInput = draft.economics.manualAmounts?.[key]
  if (manualInput?.trim()) {
    const manual = parseUnitsExact(manualInput, reward.decimals)
    if (manual !== undefined) return { amount: manual, source: 'manual', valuationVerified: false }
    return { amount: BigNumber.from(0), source: 'missing', valuationVerified: false }
  }
  const quote = draft.economics.quotes?.[key]
  const state = quote ? getNftQuoteState(quote, now) : undefined
  if (
    !quote ||
    budgetDecimals === undefined ||
    reward.decimals === undefined ||
    !quoteMatchesInputs(quote, {
      budgetTokenAddress: draft.economics.budgetTokenAddress || '',
      rewardTokenAddress: reward.address,
      totalBudget: draft.economics.totalBudget || '',
      allocationBps: allocationBps.toString(),
      allocatedBudget,
      budgetDecimals,
    })
  ) {
    return {
      amount: BigNumber.from(0),
      source: 'missing',
      quoteState: quote ? 'INVALID' : undefined,
      quote,
      valuationVerified: false,
    }
  }
  const output = parseUnitsExact(quote.outputAmount, reward.decimals)
  if (!output || output.isZero())
    return { amount: BigNumber.from(0), source: 'missing', quoteState: state, quote, valuationVerified: false }
  const source: NftRewardAmountSource = quote.source === 'identity' ? 'identity' : 'quote'
  return { amount: output, source, quoteState: state, quote, valuationVerified: state === 'FRESH' }
}

export function calculatePoolEconomics(
  draft: NftPoolDraft,
  secondsPerBlock: number,
  budgetDecimals = draft.economics.budgetDecimals,
  now = Date.now(),
): PoolEconomicsCalculation {
  const durationDays = durationPresetDays(draft.economics.durationPreset, draft.economics.customDurationDays)
  const estimatedDurationBlocks =
    estimateBlocksForDuration(draft.economics.durationPreset, draft.economics.customDurationDays, secondsPerBlock) || 0
  const blocks = estimatedDurationBlocks
  const totalBudgetBaseUnits = parseUnitsExact(draft.economics.totalBudget, budgetDecimals)
  const warnings: string[] = []
  const information: string[] = []
  const blockingIssues: string[] = []
  const rewards = [draft.rewards.primary, ...draft.rewards.side].filter(Boolean) as NftPoolDraftReward[]

  if (!blocks) blockingIssues.push('Duration must resolve to a positive number of blocks.')
  if (!totalBudgetBaseUnits) blockingIssues.push('Budget is not available in exact base units yet.')
  if (draft.constraints.participantThreshold && draft.constraints.participantThreshold !== '0')
    information.push(
      'Participant threshold can reduce actual distributed primary rewards; funding uses the maximum scheduled emission.',
    )

  const budgetAllocations = rewards.map((reward) => {
    const allocationBps = parseBps(draft.economics.allocationBps?.[reward.address.toLowerCase()]) || BigNumber.from(0)
    return {
      tokenAddress: reward.address,
      allocationBps,
      allocatedBudget: totalBudgetBaseUnits ? totalBudgetBaseUnits.mul(allocationBps).div(BPS_BASE) : BigNumber.from(0),
    }
  })
  const allocatedBudgetTotal = budgetAllocations.reduce((sum, item) => sum.add(item.allocatedBudget), BigNumber.from(0))
  const budgetRoundingRemainder = totalBudgetBaseUnits
    ? totalBudgetBaseUnits.sub(allocatedBudgetTotal)
    : BigNumber.from(0)
  if (!budgetRoundingRemainder.isZero())
    information.push('Budget rounding remainder is left unallocated in the smallest budget-token units.')

  const allocations = rewards.map((reward, index) => {
    const budgetAllocation = budgetAllocations[index]
    const resolved = amountForReward(
      reward,
      draft,
      budgetAllocation.allocatedBudget,
      budgetDecimals,
      budgetAllocation.allocationBps,
      now,
    )
    if (resolved.source === 'missing') {
      const error = draft.economics.quoteErrors?.[reward.address.toLowerCase()]
      blockingIssues.push(error || `Add a fresh quote or exact manual amount for ${reward.symbol}.`)
    }
    if (resolved.quoteState === 'INVALID')
      blockingIssues.push(`Refresh the ${reward.symbol} quote after changing its inputs.`)
    if (resolved.quoteState === 'STALE')
      warnings.push(`${reward.symbol} quote is stale; refresh it before deployment preparation.`)
    if (resolved.quoteState === 'EXPIRED')
      warnings.push(`${reward.symbol} quote is expired; refresh it before deployment preparation.`)
    if (resolved.source === 'manual')
      warnings.push(`${reward.symbol} amount was entered manually and is not validated against the budget.`)
    return {
      tokenAddress: reward.address,
      allocationBps: budgetAllocation.allocationBps,
      allocatedBudget: budgetAllocation.allocatedBudget,
      desiredAmount: resolved.amount,
      decimals: reward.decimals,
      source: resolved.source,
      quoteState: resolved.quoteState,
      quote: resolved.quote,
      valuationVerified: resolved.valuationVerified,
    }
  })

  const primaryAllocation = allocations[0] || {
    tokenAddress: '',
    allocationBps: BigNumber.from(0),
    allocatedBudget: BigNumber.from(0),
    desiredAmount: BigNumber.from(0),
    decimals: undefined,
    source: 'missing' as const,
    valuationVerified: false,
  }
  const rewardPerBlock = blocks > 0 ? primaryAllocation.desiredAmount.div(blocks) : undefined
  const maximumScheduledFunding = rewardPerBlock ? rewardPerBlock.mul(blocks) : BigNumber.from(0)
  const primaryResidual = primaryAllocation.desiredAmount.sub(maximumScheduledFunding)
  if (!rewardPerBlock || rewardPerBlock.isZero())
    blockingIssues.push('The selected reward amount is too small for this duration.')

  const primary: PrimaryEmissionCalculation = {
    ...primaryAllocation,
    rewardPerBlock,
    maximumScheduledFunding,
    residual: primaryResidual,
  }
  if (primaryResidual.gt(0))
    information.push('Primary reward residual remains because rewardPerBlock uses integer division.')

  const side = draft.rewards.side.map((reward) => {
    const allocation = allocations.find((item) => item.tokenAddress.toLowerCase() === reward.address.toLowerCase())
    const result = calculateSideReward(
      reward.address,
      allocation?.desiredAmount || BigNumber.from(0),
      maximumScheduledFunding,
      primary.decimals || 0,
      reward.decimals || 0,
      allocation?.source || 'missing',
      allocation?.quoteState,
    )
    if (result.blocking)
      blockingIssues.push(`${reward.symbol} side reward cannot be represented within the 10 bps tolerance.`)
    if (!result.deviationFromDesired.isZero() && !result.blocking)
      warnings.push(`${reward.symbol} side reward has a representability deviation within the accepted tolerance.`)
    return result
  })
  if (side.length)
    information.push(
      'Side rewards are calculated from paid primary pending rewards, not from an independent side-reward emission schedule.',
    )
  if (side.length)
    information.push(
      'Maximum implied side funding applies the encoded ratio once to the maximum primary schedule; fragmented payouts can be lower because Solidity truncates each payout.',
    )

  return {
    durationDays,
    estimatedDurationBlocks,
    measuredSecondsPerBlock: secondsPerBlock,
    blocks,
    totalBudgetBaseUnits,
    budgetAllocations,
    budgetRoundingRemainder,
    primary,
    side,
    allocations,
    warnings: Array.from(new Set(warnings)),
    information: Array.from(new Set(information)),
    blockingIssues: Array.from(new Set(blockingIssues)),
  }
}
