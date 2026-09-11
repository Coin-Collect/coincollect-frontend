import { BigNumber } from '@ethersproject/bignumber'
import { calculateRewardPlan, estimateBlocksForDuration, getPoolStatus, median } from '../calculations'

describe('Pool Manager reward calculations', () => {
  it('uses integer division and exposes the residual', () => {
    const plan = calculateRewardPlan(BigNumber.from(10), BigNumber.from(3))
    expect(plan.rewardPerBlock.toString()).toBe('3')
    expect(plan.plannedMaximumEmission.toString()).toBe('9')
    expect(plan.residual.toString()).toBe('1')
  })

  it('estimates blocks from the measured interval', () => {
    expect(estimateBlocksForDuration(1, 2)).toBe(43200)
    expect(estimateBlocksForDuration(1, 0)).toBe(39273)
  })

  it('returns a robust median for block samples', () => {
    expect(median([2, 2.2, 2.4, 20])).toBe(2.3)
  })
})

describe('Pool Manager status boundaries', () => {
  it('keeps the end block exclusive', () => {
    expect(getPoolStatus(99, 100, 200)).toBe('UPCOMING')
    expect(getPoolStatus(100, 100, 200)).toBe('ACTIVE')
    expect(getPoolStatus(199, 100, 200)).toBe('ACTIVE')
    expect(getPoolStatus(200, 100, 200)).toBe('FINISHED')
  })
})
