import type { Address } from 'viem'
import type { V3PoolType } from './metadata'
import { poolTiming, v3PoolType } from './presentation'
import type { V3PoolSnapshot } from './reader'

export const poolShowroomArtwork = '/images/collectHeroes/14.jpg'

export interface V3PoolTeaser {
  id: string
  name: string
  artwork: string
  status: ReturnType<typeof poolTiming>
}

export interface V3PoolShowroomData extends V3PoolTeaser {
  description: string
  type: V3PoolType
  schedule: number
  totalCollections: number
  rewards: { token: Address; symbol: string }[]
}

export function poolShowroomData(pool: V3PoolSnapshot): V3PoolShowroomData {
  const status = poolTiming(pool)
  return {
    id: pool.poolId.toString(),
    name: pool.presentation.name,
    artwork: pool.presentation.artwork ?? poolShowroomArtwork,
    description: pool.presentation.description,
    type: v3PoolType(pool),
    status,
    schedule: Number(status === 'Upcoming' ? pool.config.start : pool.config.end),
    totalCollections: pool.collections.length,
    rewards: pool.rewards.map(({ token, symbol }) => ({ token, symbol })),
  }
}
