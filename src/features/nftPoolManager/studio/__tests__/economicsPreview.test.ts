import { BigNumber } from '@ethersproject/bignumber'
import { calculateDailyPrimaryEmission, calculateRewardSharePreview, percentToBps } from '../economicsPreview'

describe('NFT Pool Studio economics preview', () => {
  const rewardPerBlock = BigNumber.from(100)

  it('uses participantThreshold as a weighted-share floor, not a wallet count', () => {
    const belowThreshold = calculateRewardSharePreview({
      rewardPerBlock,
      participantWeight: BigNumber.from(1),
      totalShares: BigNumber.from(10),
      participantThreshold: BigNumber.from(20),
      secondsPerBlock: 2,
    })
    const atThreshold = calculateRewardSharePreview({
      rewardPerBlock,
      participantWeight: BigNumber.from(1),
      totalShares: BigNumber.from(20),
      participantThreshold: BigNumber.from(20),
      secondsPerBlock: 2,
    })
    const aboveThreshold = calculateRewardSharePreview({
      rewardPerBlock,
      participantWeight: BigNumber.from(1),
      totalShares: BigNumber.from(40),
      participantThreshold: BigNumber.from(20),
      secondsPerBlock: 2,
    })

    expect(belowThreshold.effectiveDenominator.toString()).toBe('20')
    expect(belowThreshold.dailyReward.toString()).toBe(atThreshold.dailyReward.toString())
    expect(aboveThreshold.effectiveDenominator.toString()).toBe('40')
    expect(aboveThreshold.dailyReward.toString()).toBe('108000')
  })

  it('scales a weighted NFT share without changing the daily emission', () => {
    const starter = calculateRewardSharePreview({
      rewardPerBlock,
      participantWeight: BigNumber.from(1),
      totalShares: BigNumber.from(20),
      participantThreshold: BigNumber.from(20),
      secondsPerBlock: 2,
    })
    const gold = calculateRewardSharePreview({
      rewardPerBlock,
      participantWeight: BigNumber.from(10),
      totalShares: BigNumber.from(20),
      participantThreshold: BigNumber.from(20),
      secondsPerBlock: 2,
    })
    expect(gold.dailyReward.toString()).toBe(String(Number(starter.dailyReward.toString()) * 10))
  })

  it('uses the measured Polygon block time for daily planning', () => {
    expect(calculateDailyPrimaryEmission(rewardPerBlock, 2).toString()).toBe('4320000')
  })

  it('converts human percentages to exact BPS', () => {
    expect(percentToBps('50')).toBe('5000')
    expect(percentToBps('30.25')).toBe('3025')
    expect(percentToBps('101')).toBeUndefined()
  })
})
