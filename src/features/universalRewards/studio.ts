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
import { ownershipVerifierAbi, rewardSwapAbi, universalRewardsAbi } from './abi'
import { encodeV3Presentation, type V3Presentation } from './metadata'
import { erc20Abi, readV3Pool, tokenDetails } from './reader'
import { validateV3Deployment, type V3Client, type V3Deployment } from './runtime'
import type { V3Call } from './transactions'
import { tokenScale, UINT128_MAX } from './units'

const ZERO = BigInt(0)
const BPS = BigInt(10_000)
const collectionAbi = parseAbi(['function supportsInterface(bytes4 interfaceId) view returns (bool)'])

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
  collections: { address: string; sourceChain: string; power: string }[]
  rewards: { address: string; sharePercent: string }[]
}

export async function readV3Studio(client: V3Client, deployment: V3Deployment) {
  const block = await client.getBlock()
  await validateV3Deployment(client, deployment, block.number)
  const ledger = { abi: universalRewardsAbi, address: deployment.address, blockNumber: block.number }
  const [admin, wrappedNative, swap, verifier, assets] = await Promise.all([
    client.readContract({ ...ledger, functionName: 'admin' }),
    client.readContract({ ...ledger, functionName: 'wrappedNative' }),
    client.readContract({ ...ledger, functionName: 'swapAdapter' }),
    client.readContract({ ...ledger, functionName: 'remoteVerifier' }),
    client.readContract({ ...ledger, functionName: 'supportedAssets' }),
  ])
  const supported = await Promise.all(
    assets.map(async (address) => ({ address, ...(await tokenDetails(client, address, block.number)) })),
  )
  return { admin, wrappedNative, swap, verifier, supported, timestamp: block.timestamp, blockNumber: block.number }
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
  if (isAddressEqual(funding.address, reward.address)) return [amount, amount] as const
  if (isAddressEqual(studio.swap, zeroAddress)) throw new Error('This deployment has no approved swap adapter.')
  try {
    return await client.readContract({
      address: studio.swap,
      abi: rewardSwapAbi,
      functionName: 'preview',
      args: [funding.address, reward.address, amount, ZERO],
      blockNumber,
    })
  } catch {
    throw new Error(
      `The ${funding.symbol} to ${reward.symbol} route could not confirm liquidity and a fresh safe price for this tranche.`,
    )
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

export async function buildV3Preview(client: V3Client, deployment: V3Deployment, draft: V3StudioDraft) {
  const studio = await readV3Studio(client, deployment)
  const funding = studio.supported.find(({ address }) => address.toLowerCase() === draft.fundAsset.toLowerCase())
  if (!funding || funding.decimals === null) throw new Error('Choose a supported funding asset with readable decimals.')
  const budget = parseV3Amount(draft.budget, funding.decimals, 'funding budget')
  const days = integer(draft.durationDays, 1, 1460, 'duration in days')
  const maximumWallets = integer(draft.maxWallets, 1, 32, 'maximum participant wallets')
  const maxNftsPerWallet = integer(draft.maxNfts, 1, 32, 'maximum NFTs per wallet')
  const threshold = integer(draft.threshold, 0, maximumWallets, 'participant threshold')
  const startTime = Math.floor(new Date(draft.startLocal).getTime() / 1000)
  if (!Number.isSafeInteger(startTime) || BigInt(startTime) < studio.timestamp + BigInt(60)) {
    throw new Error('Start time must be at least one minute after the settlement clock.')
  }
  const start = BigInt(startTime)
  const duration = BigInt(days * 86_400)
  const interval = integer(draft.intervalHours, 1, Math.min(720, days * 24), 'replenishment interval in hours') * 3600
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

  for (const rule of collections) {
    if (rule.sourceChainId === BigInt(137)) {
      const supported = await client
        .readContract({
          address: rule.collection,
          abi: collectionAbi,
          functionName: 'supportsInterface',
          args: ['0x80ac58cd'],
          blockNumber: studio.blockNumber,
        })
        .catch(() => false)
      if (!supported) throw new Error('A Polygon collection did not confirm ERC-721 support.')
    } else {
      if (isAddressEqual(studio.verifier, zeroAddress))
        throw new Error('Remote NFT collections are disabled in this deployment.')
      const supported = await client.readContract({
        address: studio.verifier,
        abi: ownershipVerifierAbi,
        functionName: 'supportsSource',
        args: [rule.sourceChainId],
        blockNumber: studio.blockNumber,
      })
      if (!supported) throw new Error('This source chain has no ownership verification policy.')
    }
  }

  if (draft.rewards.length === 0 || draft.rewards.length > 4)
    throw new Error('Select between one and four reward assets.')
  const allocations = draft.rewards.map((entry) => Number(parseV3Amount(entry.sharePercent, 2, 'reward share')))
  if (allocations.reduce((total, value) => total + value, 0) !== Number(BPS))
    throw new Error('Reward shares must add to 100%.')
  const assetKeys = draft.rewards.map(({ address }) => address.toLowerCase())
  if (new Set(assetKeys).size !== assetKeys.length) throw new Error('Each reward asset can be selected once.')
  const rewards = await Promise.all(
    draft.rewards.map(async ({ address }, index) => {
      const asset = studio.supported.find((candidate) => candidate.address.toLowerCase() === address.toLowerCase())
      if (!asset || asset.decimals === null) throw new Error('Choose a supported reward asset with readable decimals.')
      const allocation = (budget * BigInt(allocations[index])) / BPS
      if (allocation <= ZERO) throw new Error('A reward share is smaller than the funding asset base unit.')
      const sampleInput = (allocation * BigInt(interval) + duration - BigInt(1)) / duration
      const [quoted, minimum] = await quoteV3RewardWindow(client, studio, funding, asset, sampleInput)
      const cap = (allocation * minimum) / sampleInput
      if (cap <= ZERO || cap > UINT128_MAX) throw new Error('A reward projection is outside the supported range.')
      return { ...asset, token: asset.address, cap, allocation, sampleInput, quoted, minimum }
    }),
  )

  const usdPerFundingUnit = draft.usdPerFundingUnit.trim()
    ? parseV3Amount(draft.usdPerFundingUnit, 6, 'USD reference price')
    : undefined
  const usdPerDay = usdPerFundingUnit && (budget * usdPerFundingUnit) / (tokenScale(funding.decimals) * BigInt(days))
  return {
    admin: studio.admin,
    config: { start, end: start + duration, threshold, maxWallets: maximumWallets, maxNftsPerWallet, metadataURI },
    collections,
    rewards,
    fundingAsset: funding,
    funding: { asset: funding.address, budget, interval, allocations },
    usdPerDay,
  }
}

export type V3Preview = Awaited<ReturnType<typeof buildV3Preview>>

export function createV3FundedPool(deployment: V3Deployment, preview: V3Preview): V3Call {
  return {
    to: deployment.address,
    data: encodeFunctionData({
      abi: universalRewardsAbi,
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
  const [details, allowance, swap, wrappedNative] = await Promise.all([
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
    client.readContract({ ...ledger, functionName: 'swapAdapter' }),
    client.readContract({ ...ledger, functionName: 'wrappedNative' }),
  ])
  const lanes = await Promise.all(
    pool.rewards.map(async (reward) => {
      const [split, [epoch, amount, target]] = await Promise.all([
        client.readContract({ ...ledger, functionName: 'fundingLane', args: [poolId, reward.token] }),
        client.readContract({ ...ledger, functionName: 'nextReplenishment', args: [poolId, reward.token] }),
      ])
      let quote: readonly [bigint, bigint] | undefined = amount > ZERO ? [amount, amount] : undefined
      let blocked = false
      if (amount > ZERO && !isAddressEqual(asset, reward.token)) {
        quote = await client
          .readContract({
            address: swap,
            abi: rewardSwapAbi,
            functionName: 'preview',
            args: [asset, reward.token, amount, ZERO],
            blockNumber: block.number,
          })
          .catch(() => undefined)
        blocked = quote === undefined
      }
      return { reward, split, epoch, amount, target, quote, blocked }
    }),
  )
  return { pool, lanes, token: { address: asset, ...details }, allowance, wrappedNative }
}

export type V3FundingSnapshot = Awaited<ReturnType<typeof readV3Funding>>

export function fundV3Budget(deployment: V3Deployment, poolId: bigint, amount: bigint, native: boolean): V3Call {
  return {
    to: deployment.address,
    data: encodeFunctionData({ abi: universalRewardsAbi, functionName: 'fundBudget', args: [poolId, amount] }),
    value: native ? amount : ZERO,
  }
}
