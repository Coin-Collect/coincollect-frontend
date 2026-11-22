import { decodeFunctionData, keccak256, stringToHex, toHex, zeroAddress, type Address } from 'viem'
import { treasuryVaultV36Abi } from './abiV36'
import type { V3Client, V3Deployment } from './runtime'
import { inspectTreasuryToken, quoteTreasurySwap } from './treasuryV36'

const address = (suffix: string): Address => `0x${suffix.padStart(40, '0')}`
const code = '0x6000'
const deployment: V3Deployment = { address: address('1'), chainId: 31337, runtimeHash: keccak256(code) }
const vault = address('2')
const planner = address('3')
const account = address('4')
const sell = address('5')
const buy = address('6')
const adapter = address('7')
const pair = address('8')

it('verifies observed proxy implementation and its runtime against the ERC-1967 slot', async () => {
  const implementation = address('a')
  const slot = toHex(BigInt(keccak256(stringToHex('eip1967.proxy.implementation'))) - BigInt(1), { size: 32 })
  const client = {
    getBlockNumber: async () => BigInt(42),
    getChainId: async () => 31337,
    getCode: async () => code,
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === 'decimals') return 8
      if (functionName === 'symbol') return 'WBTC'
      if (functionName === 'implementation') return implementation
      return account
    },
    getStorageAt: async ({ slot: key }: { slot: string }) =>
      key === slot ? toHex(BigInt(implementation), { size: 32 }) : undefined,
  }
  await expect(inspectTreasuryToken(client as unknown as V3Client, deployment, sell)).resolves.toMatchObject({
    symbol: 'WBTC',
    authority: account,
    review: { decimals: 8, implementation, implementationHash: keccak256(code) },
  })
  const mismatched = {
    ...client,
    readContract: async (params: { functionName: string }) =>
      params.functionName === 'implementation' ? zeroAddress : client.readContract(params),
  }
  await expect(inspectTreasuryToken(mismatched as unknown as V3Client, deployment, sell)).rejects.toThrow(
    'no matching public implementation',
  )
})

it.each([
  [BigInt(101), BigInt(99), BigInt(100)],
  [BigInt(101), BigInt(101), BigInt(101)],
])('encodes the exact selected route and the stronger nonzero floor', async (output, contractMinimum, expected) => {
  const values: Record<string, unknown> = {
    quoteTreasurySwap: [0, output, contractMinimum],
    routeOptions: [{ enabled: true, first: adapter, intermediate: zeroAddress, second: zeroAddress }],
    routeState: { pair, inIsToken0: true },
    getReserves: [BigInt(1000), BigInt(1100), 0],
  }
  const client = {
    getBlock: async () => ({ number: BigInt(42), timestamp: BigInt(5000) }),
    getChainId: async () => 31337,
    getCode: async () => code,
    readContract: async ({ functionName }: { functionName: string }) => values[functionName],
    getGasPrice: async () => BigInt(3),
    estimateGas: async () => BigInt(1000),
  }
  const quote = await quoteTreasurySwap(
    client as unknown as V3Client,
    deployment,
    vault,
    planner,
    account,
    sell,
    buy,
    BigInt(100),
  )
  expect(quote.minimum).toBe(expected)
  expect(quote.impactBps).toBe(BigInt(818))
  expect(decodeFunctionData({ abi: treasuryVaultV36Abi, data: quote.data })).toEqual({
    functionName: 'swapTreasury',
    args: [sell, buy, 0, BigInt(100), expected, BigInt(5120)],
  })
})
