import { formatUnits } from 'viem'
import type { readV3CardPosition, RewardSnapshot, V3PoolSnapshot } from './reader'
import type { V3Deployment } from './runtime'
import { UNIT } from './units'

export interface V3PoolCardProps {
  pool: V3PoolSnapshot
  deployment: V3Deployment
  detail?: boolean
  onPositionChange?: () => void
}

const ZERO = BigInt(0)
const DAY = BigInt(86400)

export function shortAmount(amount: bigint, decimals: number | null) {
  if (decimals === null) return `${amount.toString()} base units`
  const [whole, fraction = ''] = formatUnits(amount, decimals).split('.')
  const visible = fraction.substring(0, 6).replace(/0+$/, '')
  if (!visible && whole === '0' && amount > ZERO) return '<0.000001'
  return visible ? `${whole}.${visible}` : whole
}

export function poolTiming(pool: Pick<V3PoolSnapshot, 'timestamp' | 'config'>) {
  if (pool.timestamp < pool.config.start) return 'Upcoming'
  if (pool.timestamp >= pool.config.end) return 'Finished'
  return 'Live'
}

type ClaimTiming = Pick<V3PoolSnapshot, 'timestamp' | 'config' | 'claimDeadline'>

export function isV3ClaimExpired(pool: ClaimTiming, timestamp = pool.timestamp) {
  return pool.claimDeadline !== undefined && timestamp >= pool.claimDeadline
}

export function claimPeriodMessage(pool: ClaimTiming, timestamp = pool.timestamp) {
  if (pool.claimDeadline === undefined || timestamp < pool.config.end) return undefined
  if (isV3ClaimExpired(pool, timestamp)) return 'Claim period ended'
  const seconds = pool.claimDeadline - timestamp
  const hour = BigInt(3600)
  const minute = BigInt(60)
  if (seconds < minute) return 'Less than 1 minute left to claim'
  const [unit, size] = seconds >= DAY ? ['day', DAY] : seconds >= hour ? ['hour', hour] : ['minute', minute]
  const duration = new Intl.NumberFormat('en', { style: 'unit', unit, unitDisplay: 'long' }).format(
    Number(seconds / size),
  )
  return `${duration} left to claim`
}

export function dailyTarget(pool: V3PoolSnapshot, reward: RewardSnapshot) {
  return (reward.cap * DAY) / (pool.config.end - pool.config.start)
}

export function availableReward(reward: RewardSnapshot) {
  return (reward.inventory * UNIT - reward.committed) / UNIT
}

export function interpolateV3Rewards(
  pool: Pick<V3PoolSnapshot, 'config'>,
  snapshot: Pick<Awaited<ReturnType<typeof readV3CardPosition>>, 'projection' | 'timestamp' | 'amounts'>,
  elapsedSeconds: number,
) {
  const { projection, timestamp, amounts } = snapshot
  if (
    !projection ||
    projection.totalWeight === ZERO ||
    elapsedSeconds <= 0 ||
    timestamp < pool.config.start ||
    timestamp >= pool.config.end
  )
    return amounts
  const seconds = BigInt(Math.min(30, Math.floor(elapsedSeconds)))
  const remaining = pool.config.end - timestamp
  const elapsed = seconds < remaining ? seconds : remaining
  const duration = pool.config.end - pool.config.start
  const sinceStart = timestamp - pool.config.start
  const { wallets, totalWeight, pageWeight, rewards } = projection
  return rewards.map(({ cap, inventory, liability }, index) => {
    const scaledCap = cap * UNIT
    let emission = (scaledCap * (sinceStart + elapsed)) / duration - (scaledCap * sinceStart) / duration
    if (wallets < pool.config.threshold) emission = (emission * BigInt(wallets)) / BigInt(pool.config.threshold)
    const available = inventory * UNIT > liability ? inventory * UNIT - liability : ZERO
    if (emission > available) emission = available
    return amounts[index] + ((emission / totalWeight) * pageWeight) / UNIT
  })
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
