import { BigNumber } from '@ethersproject/bignumber'

export interface RewardSharePreview {
  effectiveDenominator: BigNumber
  dailyPrimaryEmission: BigNumber
  dailyReward: BigNumber
  participantWeight: BigNumber
  totalShares: BigNumber
  participantThreshold: BigNumber
}

/**
 * SmartChefInitializable uses the larger of totalShares and participantThreshold
 * while shares are non-zero. Keeping this calculation outside React makes the
 * card preview auditable and keeps it aligned with pendingReward().
 */
export function calculateRewardSharePreview(args: {
  rewardPerBlock?: BigNumber
  participantWeight: BigNumber
  totalShares: BigNumber
  participantThreshold: BigNumber
  secondsPerBlock: number
}): RewardSharePreview {
  const { rewardPerBlock, participantWeight, totalShares, participantThreshold } = args
  const blocksPerDay =
    Number.isFinite(args.secondsPerBlock) && args.secondsPerBlock > 0
      ? Math.max(1, Math.floor(86400 / args.secondsPerBlock))
      : 0
  const dailyPrimaryEmission = rewardPerBlock && blocksPerDay > 0 ? rewardPerBlock.mul(blocksPerDay) : BigNumber.from(0)
  const effectiveDenominator =
    totalShares.gt(0) && totalShares.lt(participantThreshold) ? participantThreshold : totalShares
  const dailyReward = effectiveDenominator.gt(0)
    ? dailyPrimaryEmission.mul(participantWeight).div(effectiveDenominator)
    : BigNumber.from(0)

  return {
    effectiveDenominator,
    dailyPrimaryEmission,
    dailyReward,
    participantWeight,
    totalShares,
    participantThreshold,
  }
}

export function calculateDailyPrimaryEmission(rewardPerBlock?: BigNumber, secondsPerBlock = 2.2): BigNumber {
  return calculateRewardSharePreview({
    rewardPerBlock,
    participantWeight: BigNumber.from(1),
    totalShares: BigNumber.from(1),
    participantThreshold: BigNumber.from(1),
    secondsPerBlock,
  }).dailyPrimaryEmission
}

export function formatAllocationPercent(allocationBps?: string): string {
  if (!allocationBps || !/^\d+$/.test(allocationBps)) return '0'
  const value = Number(allocationBps) / 100
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function percentToBps(value: string): string | undefined {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return undefined
  const numeric = Number(normalized)
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return undefined
  return String(Math.round(numeric * 100))
}
