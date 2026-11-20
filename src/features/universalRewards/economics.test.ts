import { estimateV3Economics } from './economics'

const unit = BigInt(1_000_000)
const day = 86_400
const leg = {
  adapter: '0x0000000000000000000000000000000000000001',
  input: '0x0000000000000000000000000000000000000002',
  output: '0x0000000000000000000000000000000000000003',
} as const

const input = {
  budget: BigInt(10) * unit,
  duration: BigInt(365 * day),
  interval: 30 * day,
  consolidated: false,
  treasuryFunded: true,
  threshold: 0,
  capacity: 1024,
  maxWallets: 1024,
  maxNftsPerWallet: 1,
  powers: [1],
  managed: false,
  lanes: [{ allocation: BigInt(10) * unit, sampleInput: unit, hops: 1, observedLegs: [leg] }],
}

describe('Polygon Studio economics', () => {
  it('models window round-up and the 10 USDT equal-power comparisons', () => {
    const result = estimateV3Economics(input)
    expect(result.windows).toBe(13)
    expect(result.automationGas).toBe(7_800_000)
    expect(result.scenarios.map(({ equalShare }) => equalShare)).toEqual([2_500_000, 100_000, 9_765].map(BigInt))
    expect(result.gasPriceUnavailable).toBe(true)
    expect(result.automationInFunding).toBeUndefined()
  })

  it('deduplicates shared observations and models one purchase per consolidated lane', () => {
    const lanes = [0, 1].map(() => ({ ...input.lanes[0], allocation: BigInt(5) * unit }))
    const result = estimateV3Economics({ ...input, lanes, consolidated: true })
    expect(result.windows).toBe(1)
    expect(result.observations).toBe(2)
    expect(result.automationGas).toBe(1_000_000)
  })

  it('models wallet thresholds, unequal power and configuration limits', () => {
    const result = estimateV3Economics({ ...input, threshold: 8, maxWallets: 12, maxNftsPerWallet: 4, powers: [1, 3] })
    expect(result.scenarios[0]).toMatchObject({ equalShare: BigInt(1_250_000), weightedShare: BigInt(2_500_000) })
    expect(result.scenarios[1].fits).toBe(false)
  })

  it('warns about purchase guard, aggregate costs, and negative participant economics', () => {
    const lanes = [{ ...input.lanes[0], minimumPol: BigInt('1000000000000000000') }]
    const result = estimateV3Economics({ ...input, lanes, gasPrice: BigInt(200_000_000_000) })
    expect(result.purchases[0].guardExceeded).toBe(true)
    expect(result.expensiveAutomation).toBe(true)
    expect(result.scenarios[2].feeExceedsShare).toBe(true)
  })
})
