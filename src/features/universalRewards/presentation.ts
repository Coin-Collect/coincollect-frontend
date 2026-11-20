import { formatUnits } from 'viem'
import type { RewardSnapshot, V3PoolSnapshot } from './reader'
import { UNIT } from './units'

const ZERO = BigInt(0)
const DAY = BigInt(86400)

export function shortAmount(amount: bigint, decimals: number | null) {
  if (decimals === null) return `${amount.toString()} base units`
  const [whole, fraction = ''] = formatUnits(amount, decimals).split('.')
  const visible = fraction.substring(0, 6).replace(/0+$/, '')
  if (!visible && whole === '0' && amount > ZERO) return '<0.000001'
  return visible ? `${whole}.${visible}` : whole
}

export function poolTiming(pool: V3PoolSnapshot) {
  if (pool.timestamp < pool.config.start) return 'Upcoming'
  if (pool.timestamp >= pool.config.end) return 'Finished'
  return 'Live'
}

export function dailyTarget(pool: V3PoolSnapshot, reward: RewardSnapshot) {
  return (reward.cap * DAY) / (pool.config.end - pool.config.start)
}

export function availableReward(reward: RewardSnapshot) {
  return (reward.inventory * UNIT - reward.committed) / UNIT
}

export function positionDailyEstimate(
  pool: V3PoolSnapshot,
  reward: RewardSnapshot,
  selectedPower: number,
  alreadyInPool: boolean,
) {
  if (!selectedPower || poolTiming(pool) === 'Finished') return ZERO
  const power = BigInt(selectedPower)
  const total = pool.totalWeight + power
  const wallets = pool.activeWallets + (alreadyInPool ? 0 : 1)
  const ratioDenominator = BigInt(Math.max(1, pool.config.threshold))
  const ratioNumerator = BigInt(Math.min(Number(ratioDenominator), wallets))
  const elapsed = pool.timestamp < pool.config.start ? pool.config.start : pool.timestamp
  const remaining = pool.config.end - elapsed
  const horizon = remaining < DAY ? remaining : DAY
  const emission = (reward.cap * horizon * ratioNumerator) / ((pool.config.end - pool.config.start) * ratioDenominator)
  const inventory = availableReward(reward)
  return ((emission < inventory ? emission : inventory) * power) / total
}

export function sourceName(chainId: bigint) {
  switch (Number(chainId)) {
    case 137:
      return 'Polygon'
    case 8453:
      return 'Base'
    case 42161:
      return 'Arbitrum One'
    default:
      return `Chain ${chainId}`
  }
}
