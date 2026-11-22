import {
  encodeFunctionData,
  getAddress,
  isAddressEqual,
  keccak256,
  parseAbi,
  stringToHex,
  toHex,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from 'viem'
import { rewardSwapAbi } from './abi'
import { treasuryAssetsV36Abi, treasuryVaultV36Abi, universalRewardsV36Abi } from './abiV36'
import { erc20Abi, tokenDetails } from './reader'
import { quoteV3Route, readV3RouteOptions, v3SwapLegs } from './routes'
import { isV3MissingSelector, validateV3Deployment, type V3Client, type V3Deployment } from './runtime'
import { withV3GasHeadroom } from './transactions'

export const treasuryPermission = { deposit: 1, reward: 2, swap: 4 } as const
const ZERO = BigInt(0)
const BPS = BigInt(10_000)
const proxyAbi = parseAbi([
  'function implementation() view returns (address)',
  'function proxyOwner() view returns (address)',
])
const pairAbi = parseAbi(['function getReserves() view returns (uint112, uint112, uint32)'])
const proxySlot = (label: string, offset: number) =>
  toHex(BigInt(keccak256(stringToHex(label))) - BigInt(offset), { size: 32 })
const implementationSlot = proxySlot('eip1967.proxy.implementation', 1)
const legacySlot = proxySlot('org.zeppelinos.proxy.implementation', 0)
const beaconSlot = proxySlot('eip1967.proxy.beacon', 1)
const adminSlot = proxySlot('eip1967.proxy.admin', 1)
const legacyAdminSlot = proxySlot('org.zeppelinos.proxy.admin', 0)

function slotAddress(word?: Hex) {
  if (!word || !/^0x0{24}[a-f\d]{40}$/i.test(word)) return zeroAddress
  return getAddress('0x' + word.slice(-40))
}

export async function readV36Treasury(
  client: V3Client,
  deployment: V3Deployment,
  address: Address,
  blockNumber?: bigint,
) {
  const registry = await client
    .readContract({
      address: deployment.address,
      abi: universalRewardsV36Abi,
      functionName: 'registry',
      blockNumber,
    })
    .catch((error: unknown) => {
      if (isV3MissingSelector(error)) return undefined
      throw error
    })
  if (!registry) return undefined
  const vault = { address, abi: treasuryVaultV36Abi, blockNumber } as const
  const [vaultRegistry, planner, ledgerPlanner] = await Promise.all([
    client.readContract({ ...vault, functionName: 'registry' }),
    client.readContract({ ...vault, functionName: 'planner' }),
    client.readContract({
      address: deployment.address,
      abi: universalRewardsV36Abi,
      functionName: 'swapAdapter',
      blockNumber,
    }),
  ])
  if (
    registry === zeroAddress ||
    planner === zeroAddress ||
    !isAddressEqual(registry, vaultRegistry) ||
    !isAddressEqual(planner, ledgerPlanner)
  )
    throw new Error('The V3.6 Treasury configuration could not be verified.')
  return { registry, planner }
}

export async function readV36Asset(
  client: V3Client,
  vault: Address,
  registry: Address,
  token: Address,
  blockNumber: bigint,
) {
  const [[entry, valid], [swappedIn, swappedOut]] = await Promise.all([
    client.readContract({
      address: registry,
      abi: treasuryAssetsV36Abi,
      functionName: 'assetState',
      args: [token],
      blockNumber,
    }),
    client.readContract({
      address: vault,
      abi: treasuryVaultV36Abi,
      functionName: 'swapTotals',
      args: [token],
      blockNumber,
    }),
  ])
  return { ...entry, valid, swappedIn, swappedOut }
}

export async function inspectTreasuryToken(client: V3Client, deployment: V3Deployment, token: Address) {
  const blockNumber = await client.getBlockNumber()
  await validateV3Deployment(client, deployment, blockNumber)
  const [code, details, implementation, legacy, beacon, admin, legacyAdmin, getter] = await Promise.all([
    client.getCode({ address: token, blockNumber }),
    tokenDetails(client, token, blockNumber),
    client.getStorageAt({ address: token, slot: implementationSlot, blockNumber }),
    client.getStorageAt({ address: token, slot: legacySlot, blockNumber }),
    client.getStorageAt({ address: token, slot: beaconSlot, blockNumber }),
    client.getStorageAt({ address: token, slot: adminSlot, blockNumber }),
    client.getStorageAt({ address: token, slot: legacyAdminSlot, blockNumber }),
    client
      .readContract({ address: token, abi: proxyAbi, functionName: 'implementation', blockNumber })
      .catch((error: unknown) => {
        if (isV3MissingSelector(error)) return zeroAddress
        throw error
      }),
  ])
  if (!code || code === '0x' || details.decimals === null)
    throw new Error('Enter a Polygon token with readable ERC-20 decimals.')
  if (slotAddress(beacon) !== zeroAddress || /^0x363d3d373d3d3d363d73/i.test(code)) {
    throw new Error('This proxy type has no supported live implementation check.')
  }
  if (
    [implementation, legacy]
      .map(slotAddress)
      .some((candidate) => candidate !== zeroAddress && !isAddressEqual(candidate, getter))
  ) {
    throw new Error('This proxy has no matching public implementation() getter. Registration is unavailable.')
  }
  const implementationCode = getter === zeroAddress ? undefined : await client.getCode({ address: getter, blockNumber })
  if (getter !== zeroAddress && (!implementationCode || implementationCode === '0x')) {
    throw new Error('The reported implementation has no contract code.')
  }
  const storageAdmin = [admin, legacyAdmin].map(slotAddress).find((value) => value !== zeroAddress)
  const authority =
    storageAdmin ??
    (getter === zeroAddress
      ? undefined
      : await client
          .readContract({
            address: token,
            abi: proxyAbi,
            functionName: 'proxyOwner',
            blockNumber,
          })
          .catch(() => undefined))
  return {
    token,
    symbol: details.symbol,
    authority,
    review: {
      decimals: details.decimals,
      runtimeHash: keccak256(code),
      implementation: getter,
      implementationHash: implementationCode ? keccak256(implementationCode) : zeroHash,
    },
  }
}

export async function quoteTreasurySwap(
  client: V3Client,
  deployment: V3Deployment,
  vault: Address,
  planner: Address,
  account: Address,
  input: Address,
  output: Address,
  amount: bigint,
) {
  const block = await client.getBlock()
  await validateV3Deployment(client, deployment, block.number)
  const call = { address: vault, abi: treasuryVaultV36Abi, blockNumber: block.number } as const
  const [index, quoted, protectedMinimum] = await client
    .readContract({
      ...call,
      functionName: 'quoteTreasurySwap',
      args: [input, output, amount],
    })
    .catch(async (error: unknown) => {
      // Preserve the vault's balance and permissions checks. Route reads only add a specific diagnostic.
      await quoteV3Route(client, planner, input, output, amount, block.number)
      throw error
    })
  const options = await readV3RouteOptions(client, planner, input, output, block.number)
  const route = options?.[index]
  if (!route?.enabled) throw new Error('The quoted route could not be verified.')
  const legs = v3SwapLegs(route, input, output)
  const snapshots = await Promise.all(
    legs.map(async (leg) => {
      const state = await client.readContract({
        address: leg.adapter,
        abi: rewardSwapAbi,
        functionName: 'routeState',
        args: [leg.input, leg.output],
        blockNumber: block.number,
      })
      const [reserve0, reserve1] = await client.readContract({
        address: state.pair,
        abi: pairAbi,
        functionName: 'getReserves',
        blockNumber: block.number,
      })
      return state.inIsToken0 ? [reserve0, reserve1] : [reserve1, reserve0]
    }),
  )
  const spot = snapshots.reduce(
    (value, [inputReserve, outputReserve]) => (value * outputReserve) / inputReserve,
    amount,
  )
  const impactBps = spot > quoted ? ((spot - quoted) * BPS) / spot : ZERO
  // The UI adds a 1% bound relative to what the admin actually sees. The on-chain TWAP floor may be stricter.
  const quoteBound = (quoted * BigInt(9900) + BPS - BigInt(1)) / BPS
  const minimum = protectedMinimum > quoteBound ? protectedMinimum : quoteBound
  const deadline = block.timestamp + BigInt(120)
  const data = encodeFunctionData({
    abi: treasuryVaultV36Abi,
    functionName: 'swapTreasury',
    args: [input, output, index, amount, minimum, deadline],
  })
  const [estimatedGas, gasPrice] = await Promise.all([
    client.estimateGas({ account, to: vault, data }),
    client.getGasPrice(),
  ])
  return {
    input,
    output,
    amount,
    quoted,
    minimum,
    deadline,
    data,
    impactBps,
    route,
    fee: withV3GasHeadroom(estimatedGas) * gasPrice,
  }
}
