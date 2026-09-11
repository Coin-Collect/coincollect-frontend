import { nextRenewalItem, pendingRenewalItems } from '../queue'
import { RenewalPlan } from '../types'

const plan: RenewalPlan = {
  id: 'p',
  name: 'test',
  chainId: 137,
  factoryAddress: '0x0000000000000000000000000000000000000001',
  createdAt: 1,
  updatedAt: 1,
  items: [
    {
      id: 'a',
      sourcePoolAddress: '0x000000000000000000000000000000000000000a',
      stakingToken: '',
      rewardToken: '',
      durationDays: '30',
      rewardBudget: '1',
      participantThreshold: '0',
      poolLimitPerUser: '0',
      numberBlocksForUserLimit: '0',
      poolAdmin: '',
      stakingSymbol: 'A',
      rewardSymbol: 'B',
      stakingDecimals: 18,
      rewardDecimals: 18,
      status: 'FUNDED',
      updatedAt: 1,
    },
    {
      id: 'b',
      sourcePoolAddress: '0x000000000000000000000000000000000000000b',
      stakingToken: '',
      rewardToken: '',
      durationDays: '30',
      rewardBudget: '1',
      participantThreshold: '0',
      poolLimitPerUser: '0',
      numberBlocksForUserLimit: '0',
      poolAdmin: '',
      stakingSymbol: 'C',
      rewardSymbol: 'D',
      stakingDecimals: 18,
      rewardDecimals: 18,
      status: 'FUNDING_REQUIRED',
      updatedAt: 1,
    },
  ],
}

describe('Pool Manager renewal queue', () => {
  it('resumes at the first item that is not funded', () => {
    expect(pendingRenewalItems(plan)).toHaveLength(1)
    expect(nextRenewalItem(plan)?.id).toBe('b')
  })
})
