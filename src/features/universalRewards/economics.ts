import type { V3SwapLeg } from './routes'

const ZERO = BigInt(0)
const ONE = BigInt(1)

// Planning allowances are rounded up from the pinned Polygon fork receipts.
const PURCHASE_GAS = [180_000, 400_000, 650_000]
const OBSERVATION_GAS = 100_000
const FEE_LIMIT_WEI = BigInt('250000000000000000')

interface Lane {
  allocation: bigint
  sampleInput: bigint
  hops: number
  minimumPol?: bigint
  observedLegs: readonly V3SwapLeg[]
}

interface EconomicsInput {
  budget: bigint
  duration: bigint
  interval: number
  consolidated: boolean
  treasuryFunded: boolean
  gasPrice?: bigint
  threshold: number
  capacity: number
  maxWallets: number
  maxNftsPerWallet: number
  powers: readonly number[]
  managed: boolean
  lanes: readonly Lane[]
}

function ceilDiv(numerator: bigint, denominator: bigint) {
  return (numerator + denominator - ONE) / denominator
}

export function estimateV3Economics(input: EconomicsInput) {
  const { interval, duration, gasPrice, budget, lanes, threshold, maxWallets, maxNftsPerWallet } = input
  const windows = input.consolidated ? 1 : Number(ceilDiv(duration, BigInt(interval)))
  const legs = new Set(
    lanes.flatMap(({ observedLegs }) =>
      observedLegs.map(({ adapter, input, output }) => `${adapter}:${input}:${output}`.toLowerCase()),
    ),
  )
  const purchases = lanes.map((lane) => {
    const gas = PURCHASE_GAS[Math.min(lane.hops, PURCHASE_GAS.length - 1)]
    const fee = gasPrice === undefined ? undefined : BigInt(gas) * gasPrice
    const quote = lane.minimumPol
    const guardedFee = (quote ?? ZERO) / BigInt(20)
    return {
      gas,
      fee,
      guardExceeded:
        fee !== undefined && (fee > FEE_LIMIT_WEI || (input.treasuryFunded && quote !== undefined && fee > guardedFee)),
      estimatedFundingFee:
        fee !== undefined && quote && quote > ZERO ? ceilDiv(fee * lane.sampleInput, quote) : undefined,
    }
  })
  const purchaseGas = purchases.reduce((sum, purchase) => sum + purchase.gas, 0) * windows
  const observations = legs.size * 2 * windows
  const observationGas = observations * OBSERVATION_GAS
  const automationGas = purchaseGas + observationGas
  const automationFee = gasPrice === undefined ? undefined : BigInt(automationGas) * gasPrice
  const valuation = lanes.reduce<Lane | undefined>((previous, lane) => {
    if (!lane.minimumPol) return previous
    if (!previous?.minimumPol || lane.sampleInput * previous.minimumPol > previous.sampleInput * lane.minimumPol) {
      return lane
    }
    return previous
  }, undefined)
  const asFunding = (fee?: bigint) =>
    fee !== undefined && valuation?.minimumPol ? ceilDiv(fee * valuation.sampleInput, valuation.minimumPol) : undefined
  const automationInFunding = asFunding(automationFee)

  // Join and one Harvest, for one position. Exits or repeated Harvest are separate.
  const participantGas = (input.managed ? 650_000 : 550_000) + lanes.length * 100_000
  const participantFee = gasPrice === undefined ? undefined : BigInt(participantGas) * gasPrice
  const participantInFunding = asFunding(participantFee)
  const minPower = Math.min(...input.powers)
  const maxPower = Math.max(...input.powers)
  const allocated = lanes.reduce((sum, lane) => sum + lane.allocation, ZERO)
  const scenarios = [4, 100, 1024].map((positions) => {
    const wallets = Math.min(positions, maxWallets)
    const thresholdDivisor = BigInt(Math.max(1, threshold))
    const thresholdNumerator = BigInt(threshold === 0 ? 1 : Math.min(wallets, threshold))
    const effectiveBudget = (allocated * thresholdNumerator) / thresholdDivisor
    const equalShare = effectiveBudget / BigInt(positions)
    const weightedShare = (effectiveBudget * BigInt(maxPower)) / BigInt((positions - 1) * minPower + maxPower)
    return {
      positions,
      wallets,
      equalShare,
      weightedShare,
      fits: positions <= Math.min(input.capacity, maxWallets * maxNftsPerWallet),
      feeExceedsShare: participantInFunding !== undefined && participantInFunding >= equalShare,
    }
  })
  return {
    windows,
    purchases,
    purchaseGas,
    observations,
    observationGas,
    automationGas,
    automationFee,
    automationInFunding,
    participantGas,
    participantFee,
    participantInFunding,
    minPower,
    maxPower,
    scenarios,
    expensiveAutomation: automationInFunding !== undefined && automationInFunding * BigInt(10) >= budget,
    gasPriceUnavailable: gasPrice === undefined,
    hasMissingValuation: lanes.some((lane) => !lane.minimumPol),
    roundingRemainder: budget - allocated,
  }
}
