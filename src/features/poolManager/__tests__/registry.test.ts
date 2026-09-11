import { BigNumber } from '@ethersproject/bignumber'
import { countPoolStatuses, mergePoolEntries } from '../registry'
import { NormalizedPool } from '../types'

const pool = (id: string, status: NormalizedPool['status'], legacySousId?: number): NormalizedPool => ({
  chainId: 137,
  address: `0x${id.padStart(40, '0')}`,
  canonicalId: `137:0x${id.padStart(40, '0')}`,
  logicalPeriodId: id,
  source: legacySousId ? 'legacy' : 'factory',
  legacySousId,
  stakingToken: {
    address: '0x0000000000000000000000000000000000000001',
    chainId: 137,
    decimals: 18,
    symbol: 'STAKE',
    name: 'Stake',
    isConfigured: true,
  },
  rewardToken: {
    address: '0x0000000000000000000000000000000000000002',
    chainId: 137,
    decimals: 18,
    symbol: 'REWARD',
    name: 'Reward',
    isConfigured: true,
  },
  rewardPerBlock: BigNumber.from(1),
  startBlock: 1,
  bonusEndBlock: 2,
  poolLimitPerUser: BigNumber.from(0),
  numberBlocksForUserLimit: 0,
  participantThreshold: BigNumber.from(0),
  userLimit: false,
  hasUserLimit: false,
  totalStaked: BigNumber.from(0),
  rewardBalance: BigNumber.from(0),
  status,
})

describe('Pool Manager registry identity', () => {
  it('deduplicates by chain and address while retaining legacy identity', () => {
    const merged = mergePoolEntries([pool('1', 'UNKNOWN'), pool('1', 'ACTIVE', 1)])
    expect(merged).toHaveLength(1)
    expect(merged[0].legacySousId).toBe(1)
    expect(merged[0].status).toBe('ACTIVE')
  })

  it('counts every state', () => {
    expect(
      countPoolStatuses([pool('1', 'ACTIVE'), pool('2', 'FINISHED'), pool('3', 'UPCOMING'), pool('4', 'UNKNOWN')]),
    ).toEqual({ ACTIVE: 1, FINISHED: 1, UPCOMING: 1, UNKNOWN: 1 })
  })
})
