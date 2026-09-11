import { BigNumber } from '@ethersproject/bignumber'
import { applySoliditySideReward, calculateSideReward, estimateBlocksForDuration, parseUnitsExact } from '../economics'

describe('NFT pool exact economics', () => {
  it('parses decimal input without floating point rounding', () => {
    expect(parseUnitsExact('1.234567', 6)?.toString()).toBe('1234567')
    expect(parseUnitsExact('1.2345671', 6)).toBeUndefined()
  })

  it('uses measured block time for duration estimates', () => {
    expect(estimateBlocksForDuration('1 month', undefined, 2)).toBe(1_296_000)
  })

  it('mirrors Solidity side reward scaling and percentage encoding', () => {
    const primaryPerBlock = BigNumber.from(100)
    expect(applySoliditySideReward(primaryPerBlock, BigNumber.from(50), 18, 18).toString()).toBe('50')
    expect(applySoliditySideReward(primaryPerBlock, BigNumber.from(50), 18, 6).toString()).toBe('0')
    expect(
      calculateSideReward('0xside', BigNumber.from(500), primaryPerBlock, 10, 18, 18).encodedPercentage.toString(),
    ).toBe('50')
    expect(calculateSideReward('0xside', BigNumber.from(500), primaryPerBlock, 10, 18, 18).residual.toString()).toBe(
      '0',
    )
  })
})
