import { BaseError, ContractFunctionRevertedError, zeroAddress, type Address } from 'viem'
import { rewardRoutePlannerAbi, rewardSwapAbi } from './abi'
import { isV3MissingSelector, type V3Client } from './runtime'

const ZERO = BigInt(0)

export interface V3SwapLeg {
  adapter: Address
  input: Address
  output: Address
}

export async function readV3RouteOptions(
  client: V3Client,
  swap: Address,
  input: Address,
  output: Address,
  blockNumber?: bigint,
) {
  try {
    return await client.readContract({
      address: swap,
      abi: rewardRoutePlannerAbi,
      functionName: 'routeOptions',
      args: [input, output],
      blockNumber,
    })
  } catch (error) {
    if (isV3MissingSelector(error)) return undefined
    throw error
  }
}

type RouteOption = NonNullable<Awaited<ReturnType<typeof readV3RouteOptions>>>[number]

export function v3SwapLegs(path: RouteOption, input: Address, output: Address): V3SwapLeg[] {
  if (path.intermediate === zeroAddress) return [{ adapter: path.first, input, output }]
  return [
    { adapter: path.first, input, output: path.intermediate },
    { adapter: path.second, input: path.intermediate, output },
  ]
}

export function v3RouteFailure(error: unknown) {
  const revert =
    error instanceof BaseError ? error.walk((cause) => cause instanceof ContractFunctionRevertedError) : undefined
  const reason = revert instanceof ContractFunctionRevertedError ? revert.data?.errorName : undefined
  switch (reason) {
    case 'UnconfiguredRoute':
      return 'no approved pair'
    case 'InvalidPair':
    case 'InvalidRouter':
      return 'configured router or pair identity could not be verified'
    case 'StalePrice':
      return 'TWAP observations are missing or stale'
    case 'LowLiquidity':
      return 'reserves or maximum price impact do not support this amount'
    case 'PriceDeviation':
      return 'spot price exceeds the TWAP deviation limit'
    case 'InsufficientOutput':
      return 'quoted output is below the protected minimum'
    case 'Paused':
      return 'swaps are paused'
    default:
      return 'the quote could not be verified'
  }
}

export async function quoteV3Route(
  client: V3Client,
  swap: Address,
  input: Address,
  output: Address,
  amount: bigint,
  blockNumber?: bigint,
) {
  if (input.toLowerCase() === output.toLowerCase()) return { quoted: amount, minimum: amount, hops: 0 }
  if (swap === zeroAddress) throw new Error('No approved swap adapter is configured.')
  const options = await readV3RouteOptions(client, swap, input, output, blockNumber)
  const leafQuote = (leg: V3SwapLeg, value: bigint) =>
    client.readContract({
      address: leg.adapter,
      abi: rewardSwapAbi,
      functionName: 'preview',
      args: [leg.input, leg.output, value, ZERO],
      blockNumber,
    })
  if (options === undefined) {
    try {
      const [quoted, minimum] = await leafQuote({ adapter: swap, input, output }, amount)
      return { quoted, minimum, hops: 1, legs: [{ adapter: swap, input, output }] }
    } catch (error) {
      throw new Error(v3RouteFailure(error))
    }
  }
  if (!options.some(({ enabled }) => enabled)) throw new Error('No approved path connects these tokens.')
  try {
    const [index, quoted, minimum] = await client.readContract({
      address: swap,
      abi: rewardRoutePlannerAbi,
      functionName: 'bestRoute',
      args: [input, output, amount, ZERO],
      blockNumber,
    })
    const legs = v3SwapLegs(options[index], input, output)
    return {
      quoted,
      minimum,
      hops: legs.length,
      intermediate: options[index].intermediate,
      legs,
      approvedPaths: options.filter(({ enabled }) => enabled).length,
    }
  } catch (error) {
    const blockers = await Promise.all(
      options.map(async (path, index) => {
        if (!path.enabled) return undefined
        let value = amount
        let hop = 0
        try {
          for (const leg of v3SwapLegs(path, input, output)) {
            hop++
            ;[value] = await leafQuote(leg, value)
          }
          return `path ${index + 1}: allowlist, pause or combined output check failed`
        } catch (cause) {
          return `path ${index + 1}, hop ${hop}: ${v3RouteFailure(cause)}`
        }
      }),
    )
    throw new Error([v3RouteFailure(error), ...blockers.filter(Boolean)].join(' · '))
  }
}
