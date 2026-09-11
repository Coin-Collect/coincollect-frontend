import { BigNumber } from '@ethersproject/bignumber'
import {
  applySoliditySideReward,
  calculatePoolEconomics,
  calculateSideReward,
  estimateBlocksForDuration,
  parseUnitsExact,
} from '../economics'
import { createEmptyNftPoolDraft } from '../registry'

const primaryAddress = '0x1111111111111111111111111111111111111111'
const sideAddress = '0x2222222222222222222222222222222222222222'

describe('NFT pool exact economics', () => {
  it('parses decimal input without floating point rounding', () => {
    expect(parseUnitsExact('1.234567', 6)?.toString()).toBe('1234567')
    expect(parseUnitsExact('1.2345671', 6)).toBeUndefined()
  })

  it('uses measured block time for duration estimates', () => {
    expect(estimateBlocksForDuration('1 month', undefined, 2)).toBe(1_296_000)
  })

  it('mirrors Solidity side reward scaling for equal and different decimals', () => {
    expect(applySoliditySideReward(BigNumber.from(100), BigNumber.from(50), 18, 18).toString()).toBe('50')
    expect(applySoliditySideReward(BigNumber.from('1000000000000000'), BigNumber.from(50), 18, 6).toString()).toBe(
      '500',
    )
    expect(applySoliditySideReward(BigNumber.from(100), BigNumber.from(50), 6, 18).toString()).toBe('50000000000000')
  })

  it('derives explicit side representability and safe maximum funding', () => {
    const exact = calculateSideReward('0xside', BigNumber.from(500), BigNumber.from(1000), 18, 18, 'quote', 'FRESH')
    expect(exact.encodedPercentage.toString()).toBe('50')
    expect(exact.maximumImpliedSideFunding.toString()).toBe('500')
    expect(exact.deviationFromDesired.toString()).toBe('0')
    expect(exact.representability).toBe('EXACT')

    const within = calculateSideReward(
      '0xside',
      BigNumber.from(501),
      BigNumber.from(1000),
      18,
      18,
      'quote',
      'FRESH',
      20,
    )
    expect(within.representability).toBe('WITHIN_TOLERANCE')
    const outside = calculateSideReward(
      '0xside',
      BigNumber.from(501),
      BigNumber.from(1000),
      18,
      18,
      'quote',
      'FRESH',
      10,
    )
    expect(outside.representability).toBe('OUTSIDE_TOLERANCE')
    expect(outside.blocking).toBe(true)
  })

  it('shows that fragmented Solidity payouts can be lower than one aggregate application', () => {
    const aggregate = applySoliditySideReward(BigNumber.from(100), BigNumber.from(50), 18, 18)
    const fragmented = applySoliditySideReward(BigNumber.from(1), BigNumber.from(50), 18, 18).add(
      applySoliditySideReward(BigNumber.from(99), BigNumber.from(50), 18, 18),
    )
    expect(fragmented.lte(aggregate)).toBe(true)
    expect(fragmented.toString()).toBe('49')
  })

  it('quotes allocated budget units and keeps primary residual separate', () => {
    const draft = createEmptyNftPoolDraft()
    draft.name = 'USDT identity pool'
    draft.collections = [
      { chainId: 137, address: primaryAddress, collectionId: 'primary', name: 'NFT', weight: '1', primary: true },
    ]
    draft.rewards.primary = { address: primaryAddress, symbol: 'USDT', name: 'USDT', decimals: 6 }
    draft.economics.budgetTokenAddress = primaryAddress
    draft.economics.budgetDecimals = 6
    draft.economics.totalBudget = '10'
    draft.economics.allocationBps = { [primaryAddress.toLowerCase()]: '10000' }
    draft.economics.quotes = {
      [primaryAddress.toLowerCase()]: {
        budgetTokenAddress: primaryAddress,
        rewardTokenAddress: primaryAddress,
        inputAmount: '10',
        outputAmount: '10',
        source: 'identity',
        sourceLabel: 'Identity quote',
        path: [],
        allocationBps: '10000',
        totalBudget: '10',
        quotedAt: Date.now(),
        freshnessSeconds: 30,
        expirySeconds: 120,
      },
    }
    draft.economics.quoteErrors = {}
    draft.constraints.participantThreshold = '0'
    draft.constraints.poolCapacity = '100'
    const result = calculatePoolEconomics(draft, 2)
    expect(result.budgetAllocations[0].allocatedBudget.toString()).toBe('10000000')
    expect(result.primary.desiredAmount.toString()).toBe('10000000')
    expect(result.primary.rewardPerBlock?.gt(0)).toBe(true)
    expect(result.primary.maximumScheduledFunding.add(result.primary.residual).toString()).toBe('10000000')
  })

  it('blocks an amount whose integer rewardPerBlock would be zero', () => {
    const draft = createEmptyNftPoolDraft()
    draft.name = 'Too small'
    draft.collections = [
      { chainId: 137, address: primaryAddress, collectionId: 'primary', name: 'NFT', weight: '1', primary: true },
    ]
    draft.rewards.primary = { address: primaryAddress, symbol: 'USDT', name: 'USDT', decimals: 6 }
    draft.economics.budgetTokenAddress = primaryAddress
    draft.economics.budgetDecimals = 6
    draft.economics.totalBudget = '0.000001'
    draft.economics.allocationBps = { [primaryAddress.toLowerCase()]: '10000' }
    draft.economics.quotes = {
      [primaryAddress.toLowerCase()]: {
        budgetTokenAddress: primaryAddress,
        rewardTokenAddress: primaryAddress,
        inputAmount: '0.000001',
        outputAmount: '0.000001',
        source: 'identity',
        sourceLabel: 'Identity quote',
        path: [],
        allocationBps: '10000',
        totalBudget: '0.000001',
        quotedAt: Date.now(),
        freshnessSeconds: 30,
        expirySeconds: 120,
      },
    }
    draft.economics.quoteErrors = {}
    draft.constraints.participantThreshold = '0'
    draft.constraints.poolCapacity = '100'
    expect(calculatePoolEconomics(draft, 2).blockingIssues).toContain(
      'The selected reward amount is too small for this duration.',
    )
  })
})
