import { adjustRewardShare, equalRewardShares } from './rewardShares'

describe('V3 Studio reward allocation', () => {
  it('splits basis points deterministically and accounts for every unit', () => {
    expect(equalRewardShares(0)).toEqual([])
    expect(equalRewardShares(1)).toEqual([10000])
    expect(equalRewardShares(3)).toEqual([3334, 3333, 3333])
    expect(equalRewardShares(4)).toEqual([2500, 2500, 2500, 2500])
  })

  it('keeps the adjusted lane and redistributes the remainder', () => {
    expect(adjustRewardShare([5000, 5000], 0, 7000)).toEqual([7000, 3000])
    expect(adjustRewardShare([10000], 0, 7000)).toEqual([10000])
    expect(adjustRewardShare([3334, 3333, 3333], 1, 10000)).toEqual([1, 9998, 1])
    const shares = adjustRewardShare([1800, 4700, 2500, 1000], 2, 1234)
    expect(shares[2]).toBe(1234)
    expect(shares.reduce((total, share) => total + share, 0)).toBe(10000)
    expect(shares.every((share) => share > 0)).toBe(true)
  })
})
