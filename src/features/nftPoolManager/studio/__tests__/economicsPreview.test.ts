import { BigNumber } from '@ethersproject/bignumber'
import {
  calculateDailyPrimaryEmission,
  calculateRewardSharePreview,
  calculateSoloStakeRewardSharePreview,
  percentToBps,
} from '../economicsPreview'

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

  it.each([0, 1])("includes a solo NFT's own weight when the threshold is %s", (threshold) => {
    const emission = calculateDailyPrimaryEmission(rewardPerBlock, 2)
    const keyNft = calculateSoloStakeRewardSharePreview({
      rewardPerBlock,
      participantWeight: BigNumber.from(30),
      participantThreshold: BigNumber.from(threshold),
      secondsPerBlock: 2,
    })

    expect(keyNft.totalShares.toString()).toBe('30')
    expect(keyNft.effectiveDenominator.toString()).toBe('30')
    expect(keyNft.dailyReward.toString()).toBe(emission.toString())
  })

  it('keeps the minimum power floor for a solo NFT lighter than the floor', () => {
    const starter = calculateSoloStakeRewardSharePreview({
      rewardPerBlock,
      participantWeight: BigNumber.from(1),
      participantThreshold: BigNumber.from(30),
      secondsPerBlock: 2,
    })

    expect(starter.totalShares.toString()).toBe('30')
    expect(starter.effectiveDenominator.toString()).toBe('30')
    expect(starter.dailyReward.toString()).toBe('144000')
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
