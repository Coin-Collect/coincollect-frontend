import { BigNumber } from '@ethersproject/bignumber'
import { createNftRewardQuoteProvider, getNftQuoteState, quoteMatchesInputs } from '../quotes'

const mockGetAmountsOut = jest.fn()
jest.mock('@ethersproject/contracts', () => ({
  Contract: jest.fn(() => ({ getAmountsOut: mockGetAmountsOut })),
}))

const budget = '0x1111111111111111111111111111111111111111'
const reward = '0x2222222222222222222222222222222222222222'

function quote(overrides: Partial<any> = {}): any {
  return {
    budgetTokenAddress: budget,
    rewardTokenAddress: reward,
    inputAmount: '8',
    outputAmount: '123.45',
    source: 'router',
    sourceLabel: 'Configured Polygon V2 router',
    path: [budget, reward],
    allocationBps: '8000',
    totalBudget: '10',
    quotedAt: 1_000_000,
    freshnessSeconds: 30,
    expirySeconds: 120,
    ...overrides,
  }
}

describe('NFT reward quotes', () => {
  beforeEach(() => mockGetAmountsOut.mockReset())

  it('returns an exact identity quote without touching the router', async () => {
    const provider = createNftRewardQuoteProvider({} as any)
    const result = await provider.quote({
      budgetTokenAddress: budget,
      rewardTokenAddress: budget,
      amountBaseUnits: BigNumber.from(10_000_000),
    })
    expect(result.outputAmountBaseUnits.toString()).toBe('10000000')
    expect(result.source).toBe('identity')
    expect(result.sourceLabel).toBe('Identity quote')
    expect(result.path).toEqual([])
    expect(mockGetAmountsOut).not.toHaveBeenCalled()
  })

  it('passes the exact allocated budget to the router', async () => {
    mockGetAmountsOut.mockResolvedValue([BigNumber.from(8_000_000), BigNumber.from(42)])
    const provider = createNftRewardQuoteProvider({} as any)
    await provider.quote({
      budgetTokenAddress: budget,
      rewardTokenAddress: reward,
      amountBaseUnits: BigNumber.from(8_000_000),
    })
    expect(mockGetAmountsOut).toHaveBeenCalledWith(BigNumber.from(8_000_000), expect.any(Array))
  })

  it('rejects zero-output routes', async () => {
    mockGetAmountsOut.mockResolvedValue([BigNumber.from(8_000_000), BigNumber.from(0)])
    const provider = createNftRewardQuoteProvider({} as any)
    await expect(
      provider.quote({ budgetTokenAddress: budget, rewardTokenAddress: reward, amountBaseUnits: BigNumber.from(8) }),
    ).rejects.toThrow('zero output')
  })

  it('distinguishes fresh, stale and expired quotes', () => {
    expect(getNftQuoteState(quote(), 1_000_000 + 29_000)).toBe('FRESH')
    expect(getNftQuoteState(quote(), 1_000_000 + 31_000)).toBe('STALE')
    expect(getNftQuoteState(quote(), 1_000_000 + 121_000)).toBe('EXPIRED')
  })

  it('invalidates quotes when budget, allocation or reward changes', () => {
    const input = {
      budgetTokenAddress: budget,
      rewardTokenAddress: reward,
      totalBudget: '10',
      allocationBps: '8000',
      allocatedBudget: BigNumber.from(8_000_000),
      budgetDecimals: 6,
    }
    expect(quoteMatchesInputs(quote(), input)).toBe(true)
    expect(quoteMatchesInputs(quote(), { ...input, totalBudget: '100' })).toBe(false)
    expect(
      quoteMatchesInputs(quote(), { ...input, allocationBps: '5000', allocatedBudget: BigNumber.from(5_000_000) }),
    ).toBe(false)
    expect(
      quoteMatchesInputs(quote(), { ...input, rewardTokenAddress: '0x3333333333333333333333333333333333333333' }),
    ).toBe(false)
  })
})
