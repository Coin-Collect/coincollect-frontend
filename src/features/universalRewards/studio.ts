import { describeManagedCollection, managed1155Abi, readManagedAdapter, SETTLEMENT_SOURCE } from './managedNfts'
import {
  encodeFunctionData,
  getAddress,
  isAddress,
  isAddressEqual,
  parseAbi,
  parseUnits,
  zeroAddress,
  type Address,
} from 'viem'
import { managedNftCollectionAbi, ownershipVerifierAbi, treasuryVaultAbi, universalRewardsAbi } from './abi'
import { encodeV3Presentation, type V3Presentation } from './metadata'
import { erc20Abi, readV3Pool, tokenDetails } from './reader'
import { quoteV3Route, readV3RouteOptions, v3SwapLegs, type V3SwapLeg } from './routes'
import { estimateV3Economics } from './economics'
import { isV3MissingSelector, readV3Capacity, validateV3Deployment, type V3Client, type V3Deployment } from './runtime'
import type { V3Call } from './transactions'
import { tokenScale, UINT128_MAX } from './units'

const ZERO = BigInt(0)
const BPS = BigInt(10_000)
const collectionAbi = parseAbi(['function supportsInterface(bytes4 interfaceId) view returns (bool)'])
const legacyCreateAbi = parseAbi([
  'struct LegacyPoolConfig { uint64 start; uint64 end; uint8 threshold; uint8 maxWallets; uint8 maxNftsPerWallet; string metadataURI; }',
  'struct CollectionRule { uint256 sourceChainId; address collection; uint32 weight; }',
  'struct RewardConfig { address token; uint128 cap; }',
  'struct FundingConfig { address asset; uint128 budget; uint32 interval; uint16[] allocations; }',
  'function createFundedPool(LegacyPoolConfig config, CollectionRule[] collections, RewardConfig[] rewards, FundingConfig funding) returns (uint256)',
  'function createTreasuryFundedPool(LegacyPoolConfig config, CollectionRule[] collections, RewardConfig[] rewards, FundingConfig funding, uint128 initialAllocation, bool consolidated) returns (uint256)',
])

export interface V3StudioDraft extends V3Presentation {
  startLocal: string
  durationDays: string
  threshold: string
  maxWallets: string
  maxNfts: string
  fundAsset: string
  budget: string
  intervalHours: string
  usdPerFundingUnit: string
  fundingSource?: 'wallet' | 'treasury'
  purchaseMode?: 'automatic' | 'consolidated' | 'adaptive'
  collections: { address: string; sourceChain: string; power: string }[]
  rewards: { address: string; sharePercent: string }[]
}

export async function readV3Treasury(client: V3Client, deployment: V3Deployment, blockNumber?: bigint) {
  try {
    const address = await client.readContract({
      address: deployment.address,
      abi: universalRewardsAbi,
      functionName: 'treasuryVault',
      blockNumber,
    })
    if (address === zeroAddress) return undefined
    const vault = { address, abi: treasuryVaultAbi, blockNumber } as const
    const [owner, paused] = await Promise.all([
      client.readContract({ ...vault, functionName: 'owner' }),
      client.readContract({ ...vault, functionName: 'paused' }),
    ])
    return { address, owner, paused }
  } catch (error) {
    if (isV3MissingSelector(error)) return undefined
    throw error
  }
}

export async function readV3Studio(client: V3Client, deployment: V3Deployment) {
  const block = await client.getBlock()
  await validateV3Deployment(client, deployment, block.number)
  const ledger = { abi: universalRewardsAbi, address: deployment.address, blockNumber: block.number }
  const [admin, wrappedNative, swap, verifier, assets, treasury, capacity, registry] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'admin' }),
    client.readContract({ ...ledger, functionName: 'wrappedNative' }),
    client.readContract({ ...ledger, functionName: 'swapAdapter' }),
    client.readContract({ ...ledger, functionName: 'remoteVerifier' }),
    client.readContract({ ...ledger, functionName: 'supportedAssets' }),
    readV3Treasury(client, deployment, block.number),
    readV3Capacity(client, deployment, block.number),
    readManagedAdapter(client, deployment, SETTLEMENT_SOURCE, zeroAddress, block.number),
  ])
  const supported = await Promise.all(
    assets.map(async (address) => {
      const [details, balance] = await Promise.all([
        tokenDetails(client, address, block.number),
        treasury &&
          client.readContract({
            address: treasury.address,
            abi: treasuryVaultAbi,
            functionName: 'balance',
            args: [address],
            blockNumber: block.number,
          }),
      ])
      return { address, ...details, balance }
    }),
  )
  return {
    admin,
    wrappedNative,
    swap,
    verifier,
    managedCollections: registry !== undefined,
    treasury,
    supported,
    capacity,
    timestamp: block.timestamp,
    blockNumber: block.number,
  }
}

export type V3StudioSnapshot = Awaited<ReturnType<typeof readV3Studio>>
type StudioAsset = V3StudioSnapshot['supported'][number]

export async function quoteV3RewardWindow(
  client: V3Client,
  studio: V3StudioSnapshot,
  funding: StudioAsset,
  reward: StudioAsset,
  amount: bigint,
  blockNumber = studio.blockNumber,
) {
  try {
    return await quoteV3Route(client, studio.swap, funding.address, reward.address, amount, blockNumber)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'quote verification failed'
    throw new Error(`${funding.symbol} to ${reward.symbol}: ${reason}`)
  }
}

export function parseV3Amount(input: string, decimals: number, field: string) {
  const cleaned = input.trim()
  if (!/^\d{1,38}(\.\d{1,36})?$/.test(cleaned) || (cleaned.split('.')[1]?.length ?? 0) > decimals) {
    throw new Error(`Enter a valid ${field} with at most ${decimals} decimal places.`)
  }
  const result = parseUnits(cleaned, decimals)
  if (result <= ZERO || result > UINT128_MAX) throw new Error(`The ${field} is outside the supported range.`)
  return result
}

function integer(input: string, min: number, max: number, field: string) {
  if (!/^\d{1,10}$/.test(input) || Number(input) < min || Number(input) > max) {
    throw new Error(`Enter ${field} from ${min} to ${max}.`)
  }
  return Number(input)
}

export async function inspectStudioCollection(
  client: V3Client,
  deployment: V3Deployment,
  studio: Pick<V3StudioSnapshot, 'blockNumber' | 'verifier'>,
  sourceChainId: bigint,
  collection: Address,
) {
  const { blockNumber, verifier } = studio
  const adapter = await readManagedAdapter(client, deployment, sourceChainId, collection, blockNumber)
  const remote = sourceChainId !== SETTLEMENT_SOURCE
  const supports = async (id: `0x${string}`) => {
    try {
      return await client.readContract({
        address: collection,
        abi: collectionAbi,
        functionName: 'supportsInterface',
        args: [id],
        blockNumber,
      })
    } catch (error) {
      if (isV3MissingSelector(error)) return false
      throw error
    }
  }
  if (adapter && adapter !== zeroAddress) {
    const managed = await describeManagedCollection(client, adapter, undefined, blockNumber)
    if (managed.sourceChainId !== sourceChainId || !isAddressEqual(managed.collection, collection)) {
      throw new Error('The registered adapter does not match this collection and source network.')
    }
    if (remote) {
      if (deployment.chainId !== 31337 || !managed.journal || managed.journal === zeroAddress || managed.paused) {
        throw new Error('This collection needs an active source journal in an isolated test environment.')
      }
    } else {
      let bound: boolean
      try {
        bound = await client.readContract({
          address: adapter,
          abi: managedNftCollectionAbi,
          functionName: 'hasLocalHook',
          blockNumber,
        })
      } catch (error) {
        if (!isV3MissingSelector(error)) throw error
        const hook = await client
          .readContract({
            address: collection,
            abi: managed1155Abi,
            functionName: 'rewardsHook',
            blockNumber,
          })
          .catch((failure) => {
            if (isV3MissingSelector(failure)) return zeroAddress
            throw failure
          })
        bound = isAddressEqual(hook, adapter)
      }
      const [supports1155, invalidInterface] = await Promise.all([supports('0xd9b67a26'), supports('0xffffffff')])
      if (!bound || managed.standard !== 1155 || !supports1155 || invalidInterface) {
        throw new Error('ERC-1155 requires a reviewed collection with a bound transfer hook and matching adapter.')
      }
    }
    return {
      sourceChainId: SETTLEMENT_SOURCE,
      collection: adapter,
      maxUnits: managed.maxUnits,
      standard: managed.standard,
      label: `ERC-${managed.standard} · ${remote ? 'isolated journal' : 'bound transfer hook'}`,
    }
  }

  if (remote) {
    if (isAddressEqual(verifier, zeroAddress)) {
      throw new Error(
        'This source collection has no approved journal. Base and Arbitrum rewards are isolated testing only.',
      )
    }
    const supported = await client.readContract({
      address: verifier,
      abi: ownershipVerifierAbi,
      functionName: 'supportsSource',
      args: [sourceChainId],
      blockNumber,
    })
    if (!supported) throw new Error('This source chain has no isolated ownership verification policy.')
    return {
      sourceChainId,
      collection,
      maxUnits: 1,
      standard: 721,
      label: 'ERC-721 · isolated ownership verification required',
    }
  }

  const code = await client.getCode({ address: collection, blockNumber })
  if (!code || code === '0x') throw new Error('No NFT contract was found at this address on Polygon.')
  const [supports721, supports1155, invalidInterface] = await Promise.all([
    supports('0x80ac58cd'),
    supports('0xd9b67a26'),
    supports('0xffffffff'),
  ])
  if (!invalidInterface && supports721) {
    return { sourceChainId, collection, maxUnits: 1, standard: 721, label: 'Polygon ERC-721 · direct ownership check' }
  }
  if (!invalidInterface && supports1155) {
    throw new Error('This ERC-1155 collection needs a registered CoinCollect adapter and a bound transfer hook.')
  }
  throw new Error('This contract did not report a supported NFT interface on Polygon.')
}

export async function buildV3Preview(client: V3Client, deployment: V3Deployment, draft: V3StudioDraft) {
  const studio = await readV3Studio(client, deployment)
  const funding = studio.supported.find(({ address }) => address.toLowerCase() === draft.fundAsset.toLowerCase())
  if (!funding || funding.decimals === null) throw new Error('Choose a supported funding asset with readable decimals.')
  const budget = parseV3Amount(draft.budget, funding.decimals, 'funding budget')
  const treasuryFunded = draft.fundingSource === 'treasury'
  if (treasuryFunded && (!studio.treasury || studio.treasury.paused || (funding.balance?.available ?? ZERO) < budget)) {
    throw new Error('Treasury is paused or has insufficient available balance for this lifetime budget.')
  }
  const days = integer(draft.durationDays, 1, 1460, 'duration in days')
  const maximumWallets = integer(draft.maxWallets, 1, studio.capacity, 'maximum participant wallets')
  const maxNftsPerWallet = integer(draft.maxNfts, 1, studio.capacity, 'maximum NFTs per wallet')
  const threshold = integer(draft.threshold, 0, maximumWallets, 'participant threshold')
  const startTime = Math.floor(new Date(draft.startLocal).getTime() / 1000)
  if (!Number.isSafeInteger(startTime) || BigInt(startTime) < studio.timestamp + BigInt(60)) {
    throw new Error('Start time must be at least one minute after the settlement clock.')
  }
  const start = BigInt(startTime)
  const duration = BigInt(days * 86_400)
  const maxIntervalHours = Math.min(720, days * 24)
  const selectedInterval = integer(draft.intervalHours, 1, maxIntervalHours, 'replenishment interval in hours') * 3600
  const metadataURI = encodeV3Presentation(draft)

  if (draft.collections.length === 0 || draft.collections.length > 16)
    throw new Error('Add between one and 16 NFT collections.')
  const collections = draft.collections.map((entry) => {
    if (!isAddress(entry.address) || isAddressEqual(entry.address, zeroAddress))
      throw new Error('Enter a valid NFT collection address.')
    if (!['137', '8453', '42161'].includes(entry.sourceChain)) throw new Error('Select Polygon, Base or Arbitrum One.')
    return {
      sourceChainId: BigInt(entry.sourceChain),
      collection: getAddress(entry.address),
      weight: integer(entry.power, 1, 1_000_000_000, 'NFT power'),
    }
  })
  if (
    new Set(collections.map(({ sourceChainId, collection }) => `${sourceChainId}:${collection}`)).size !==
    collections.length
  ) {
    throw new Error('Each chain and NFT collection pair can be included once.')
  }

  let managed = false
  for (const rule of collections) {
    const compatibility = await inspectStudioCollection(client, deployment, studio, rule.sourceChainId, rule.collection)
    if (BigInt(compatibility.maxUnits) * BigInt(rule.weight) > BigInt(4_294_967_295)) {
      throw new Error('Unit power multiplied by the adapter quantity limit must fit within 4,294,967,295.')
    }
    managed ||= compatibility.standard === 1155
    rule.sourceChainId = compatibility.sourceChainId
    rule.collection = compatibility.collection
  }

  if (draft.rewards.length === 0 || draft.rewards.length > 4)
    throw new Error('Select between one and four reward assets.')
  const allocations = draft.rewards.map((entry) => Number(parseV3Amount(entry.sharePercent, 2, 'reward share')))
  if (allocations.reduce((total, value) => total + value, 0) !== Number(BPS))
    throw new Error('Reward shares must add to 100%.')
  const assetKeys = draft.rewards.map(({ address }) => address.toLowerCase())
  if (new Set(assetKeys).size !== assetKeys.length) throw new Error('Each reward asset can be selected once.')
  const lanes = draft.rewards.map(({ address }, index) => {
    const asset = studio.supported.find((candidate) => candidate.address.toLowerCase() === address.toLowerCase())
    if (!asset || asset.decimals === null) throw new Error('Choose a supported reward asset with readable decimals.')
    const allocation = (budget * BigInt(allocations[index])) / BPS
    if (allocation <= ZERO) throw new Error('A reward share is smaller than the funding asset base unit.')
    return { asset, allocation }
  })
  const quoteLanes = (consolidated: boolean, interval: number) =>
    Promise.all(
      lanes.map(async ({ asset, allocation }) => {
        const sampleInput = consolidated
          ? allocation
          : (allocation * BigInt(interval) + duration - BigInt(1)) / duration
        const { quoted, minimum, hops, intermediate, legs, approvedPaths } = await quoteV3RewardWindow(
          client,
          studio,
          funding,
          asset,
          sampleInput,
        )
        const cap = (allocation * minimum) / sampleInput
        if (cap <= ZERO || cap > UINT128_MAX) throw new Error('A reward projection is outside the supported range.')
        return {
          ...asset,
          token: asset.address,
          cap,
          allocation,
          sampleInput,
          quoted,
          minimum,
          hops,
          intermediate,
          legs,
          approvedPaths: approvedPaths ?? (hops ? 1 : 0),
        }
      }),
    )
  const automatic = treasuryFunded && (draft.purchaseMode === undefined || draft.purchaseMode === 'automatic')
  let interval = selectedInterval
  let consolidated = treasuryFunded && draft.purchaseMode !== 'adaptive'
  let strategyNote: string | undefined
  const rewards = await quoteLanes(consolidated, interval).catch((error: unknown) => {
    if (!automatic) throw error
    consolidated = false
    interval = maxIntervalHours * 3600
    strategyNote = error instanceof Error ? error.message : 'A protected lifetime purchase could not be verified.'
    return quoteLanes(false, interval)
  })

  const usdPerFundingUnit = draft.usdPerFundingUnit.trim()
    ? parseV3Amount(draft.usdPerFundingUnit, 6, 'USD reference price')
    : undefined
  const usdPerDay = usdPerFundingUnit && (budget * usdPerFundingUnit) / (tokenScale(funding.decimals) * BigInt(days))
  const [gasPrice, economicLanes] = await Promise.all([
    client.getGasPrice().catch(() => undefined),
    Promise.all(
      rewards.map(async (reward) => {
        const quote = await quoteV3Route(
          client,
          studio.swap,
          funding.address,
          studio.wrappedNative,
          reward.sampleInput,
          studio.blockNumber,
        ).catch(() => undefined)
        const outputs = [...new Set([reward.token, studio.wrappedNative])].filter(
          (token) => !isAddressEqual(token, funding.address),
        )
        const observedLegs = (
          await Promise.all(
            outputs.map(async (output): Promise<V3SwapLeg[]> => {
              if (isAddressEqual(studio.swap, zeroAddress)) return []
              const options = await readV3RouteOptions(
                client,
                studio.swap,
                funding.address,
                output,
                studio.blockNumber,
              ).catch(() => undefined)
              return options
                ? options.filter(({ enabled }) => enabled).flatMap((path) => v3SwapLegs(path, funding.address, output))
                : [...(reward.legs ?? []), ...(quote?.legs ?? [])].filter((leg) => isAddressEqual(leg.output, output))
            }),
          )
        ).flat()
        return { ...reward, minimumPol: quote?.minimum, observedLegs }
      }),
    ),
  ])
  const economics = estimateV3Economics({
    budget,
    duration,
    interval,
    consolidated,
    treasuryFunded,
    gasPrice,
    threshold,
    capacity: studio.capacity,
    maxWallets: maximumWallets,
    maxNftsPerWallet,
    powers: collections.map(({ weight }) => weight),
    managed,
    lanes: economicLanes,
  })
  return {
    admin: studio.admin,
    capacity: studio.capacity,
    config: { start, end: start + duration, threshold, maxWallets: maximumWallets, maxNftsPerWallet, metadataURI },
    collections,
    rewards,
    fundingAsset: funding,
    funding: { asset: funding.address, budget, interval, allocations },
    usdPerDay,
    treasuryFunded,
    consolidated,
    economics,
    strategyNote,
  }
}

export type V3Preview = Awaited<ReturnType<typeof buildV3Preview>>

export function createV3FundedPool(deployment: V3Deployment, preview: V3Preview): V3Call {
  const abi = preview.capacity <= 32 ? legacyCreateAbi : universalRewardsAbi
  if (preview.treasuryFunded) {
    return {
      to: deployment.address,
      data: encodeFunctionData({
        abi,
        functionName: 'createTreasuryFundedPool',
        args: [
          preview.config,
          preview.collections,
          preview.rewards,
          preview.funding,
          preview.funding.budget,
          preview.consolidated,
        ],
      }),
    }
  }
  return {
    to: deployment.address,
    data: encodeFunctionData({
      abi,
      functionName: 'createFundedPool',
      args: [preview.config, preview.collections, preview.rewards, preview.funding],
    }),
  }
}

export async function readV3Funding(client: V3Client, deployment: V3Deployment, poolId: bigint, account?: Address) {
  const block = await client.getBlock()
  await validateV3Deployment(client, deployment, block.number)
  const pool = await readV3Pool(client, deployment, poolId, block)
  const ledger = { abi: universalRewardsAbi, address: deployment.address, blockNumber: block.number }
  const asset = pool.funding.asset
  if (isAddressEqual(asset, zeroAddress)) throw new Error('This pool uses direct reward deposits.')
  const [details, allowance, tokenBalance, nativeBalance, swap, wrappedNative, treasury] = await Promise.all([
    tokenDetails(client, asset, block.number),
    account
      ? client.readContract({
          address: asset,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [account, deployment.address],
          blockNumber: block.number,
        })
      : Promise.resolve(ZERO),
    account
      ? client.readContract({
          address: asset,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account],
          blockNumber: block.number,
        })
      : Promise.resolve(ZERO),
    account ? client.getBalance({ address: account, blockNumber: block.number }) : Promise.resolve(ZERO),
    client.readContract({ ...ledger, functionName: 'swapAdapter' }),
    client.readContract({ ...ledger, functionName: 'wrappedNative' }),
    readV3Treasury(client, deployment, block.number),
  ])
  const [treasuryBacked, consolidated] = treasury
    ? await client.readContract({ ...ledger, functionName: 'treasuryFunding', args: [poolId] })
    : [false, false]
  const lanes = await Promise.all(
    pool.rewards.map(async (reward) => {
      const [split, [epoch, amount, target]] = await Promise.all([
        client.readContract({ ...ledger, functionName: 'fundingLane', args: [poolId, reward.token] }),
        client.readContract({ ...ledger, functionName: 'nextReplenishment', args: [poolId, reward.token] }),
      ])
      let quote: readonly [bigint, bigint] | undefined = amount > ZERO ? [amount, amount] : undefined
      let blocker: string | undefined
      if (amount > ZERO && !isAddressEqual(asset, reward.token)) {
        try {
          const route = await quoteV3Route(client, swap, asset, reward.token, amount, block.number)
          quote = [route.quoted, route.minimum]
        } catch (error) {
          quote = undefined
          blocker = error instanceof Error ? error.message : 'The route could not be verified.'
        }
      }
      return { reward, split, epoch, amount, target, quote, blocked: Boolean(blocker), blocker }
    }),
  )
  return {
    pool,
    lanes,
    token: { address: asset, ...details },
    allowance,
    tokenBalance,
    nativeBalance,
    wrappedNative,
    treasuryBacked,
    consolidated,
  }
}

export type V3FundingSnapshot = Awaited<ReturnType<typeof readV3Funding>>

export function fundV3Budget(deployment: V3Deployment, poolId: bigint, amount: bigint, native: boolean): V3Call {
  return {
    to: deployment.address,
    data: encodeFunctionData({ abi: universalRewardsAbi, functionName: 'fundBudget', args: [poolId, amount] }),
    value: native ? amount : ZERO,
  }
}
