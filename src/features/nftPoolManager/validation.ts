import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { getAddress } from '@ethersproject/address'
import type { Provider } from '@ethersproject/providers'
import erc20Abi from 'config/abi/erc20.json'
import { NftPoolDeploymentPlan, NftPoolDraft, NftPoolDraftReward, NftPoolReadiness } from './types'
import { calculatePoolEconomics, parseUnitsExact, PoolEconomicsCalculation } from './economics'

const ERC721_INTERFACE_ID = '0x80ac58cd'
const ERC165_ABI = ['function supportsInterface(bytes4 interfaceId) view returns (bool)']
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface AddressValidationResult {
  valid: boolean
  address: string
  name?: string
  symbol?: string
  decimals?: number
  reason?: string
  supportsErc165?: boolean
}

function canonicalAddress(address: string): string | undefined {
  try {
    return getAddress(address.trim())
  } catch {
    return undefined
  }
}

export async function validateNftCollectionAddress(
  provider: Provider,
  input: string,
): Promise<AddressValidationResult> {
  const address = canonicalAddress(input)
  if (!address) return { valid: false, address: input, reason: 'Enter a valid Polygon address.' }
  const code = await provider.getCode(address)
  if (!code || code === '0x') return { valid: false, address, reason: 'No contract code was found at this address.' }
  const nft = new Contract(
    address,
    [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function balanceOf(address owner) view returns (uint256)',
    ],
    provider,
  )
  try {
    const [name, symbol] = await Promise.all([nft.name(), nft.symbol()])
    await nft.balanceOf(ZERO_ADDRESS)
    let supportsErc165: boolean | undefined
    try {
      supportsErc165 = Boolean(await new Contract(address, ERC165_ABI, provider).supportsInterface(ERC721_INTERFACE_ID))
    } catch {
      supportsErc165 = undefined
    }
    if (!name && !symbol) return { valid: false, address, reason: 'The contract does not expose NFT metadata.' }
    return { valid: true, address, name, symbol, supportsErc165 }
  } catch {
    return { valid: false, address, reason: 'This contract is not readable as an ERC-721 collection.' }
  }
}

export async function validateRewardTokenAddress(provider: Provider, input: string): Promise<AddressValidationResult> {
  const address = canonicalAddress(input)
  if (!address) return { valid: false, address: input, reason: 'Enter a valid Polygon address.' }
  const code = await provider.getCode(address)
  if (!code || code === '0x') return { valid: false, address, reason: 'No contract code was found at this address.' }
  const token = new Contract(address, erc20Abi, provider)
  try {
    const [decimals, symbol, name] = await Promise.all([token.decimals(), token.symbol(), token.name()])
    const numericDecimals = Number(decimals)
    if (!Number.isInteger(numericDecimals) || numericDecimals < 0 || numericDecimals >= 30)
      return { valid: false, address, reason: 'The staking contract only accepts ERC-20 decimals below 30.' }
    if (!symbol && !name) return { valid: false, address, reason: 'The contract does not expose ERC-20 metadata.' }
    return { valid: true, address, decimals: numericDecimals, symbol, name }
  } catch {
    return { valid: false, address, reason: 'This contract is not readable as an ERC-20 token.' }
  }
}

function duplicateAddresses(values: string[]): boolean {
  return new Set(values.map((value) => value.toLowerCase())).size !== values.length
}

function isPositiveInteger(value: string): boolean {
  if (!/^\d+$/.test(value || '')) return false
  try {
    return BigNumber.from(value).gt(0)
  } catch {
    return false
  }
}

function rewardLabel(reward: NftPoolDraftReward | null): string {
  return reward?.symbol || 'reward token'
}

export interface NftDraftValidationResult {
  readiness: NftPoolReadiness
  blockers: string[]
  warnings: string[]
  economics?: PoolEconomicsCalculation
}

export function validateNftPoolDraft(
  draft: NftPoolDraft,
  secondsPerBlock = 2.2,
  deploymentEnabled = false,
): NftDraftValidationResult {
  const blockers: string[] = []
  const warnings: string[] = []
  if (draft.chainId !== 137) blockers.push('The NFT Pool Studio is Polygon-only.')
  if (!draft.name.trim()) blockers.push('Add a pool name.')
  if (!draft.collections.length) blockers.push('Add at least one staking NFT collection.')
  const primaryCollections = draft.collections.filter((collection) => collection.primary)
  if (draft.collections.length && primaryCollections.length !== 1)
    blockers.push('Choose exactly one primary collection.')
  if (draft.collections.some((collection) => !isPositiveInteger(collection.weight)))
    blockers.push('Collection weights must be positive integers.')
  if (duplicateAddresses(draft.collections.map((collection) => collection.address)))
    blockers.push('NFT collections must be unique.')

  const primary = draft.rewards.primary
  if (!primary?.address) blockers.push('Choose a primary reward token.')
  if (primary && (primary.decimals === undefined || primary.decimals >= 30))
    blockers.push(`${rewardLabel(primary)} must expose ERC-20 decimals below 30.`)
  const side = draft.rewards.side
  if (duplicateAddresses(side.map((reward) => reward.address))) blockers.push('Side reward tokens must be unique.')
  if (primary && side.some((reward) => reward.address.toLowerCase() === primary.address.toLowerCase()))
    blockers.push('The primary reward cannot also be a side reward.')
  side.forEach((reward) => {
    if (reward.decimals === undefined || reward.decimals >= 30)
      blockers.push(`${rewardLabel(reward)} must expose ERC-20 decimals below 30.`)
  })

  if (!draft.economics.budgetTokenAddress)
    warnings.push('Budget denomination is set to USDT, but its canonical address is not selected yet.')
  const budgetAmount = parseUnitsExact(draft.economics.totalBudget, draft.economics.budgetDecimals)
  if (!budgetAmount || budgetAmount.isZero()) blockers.push('Enter a positive budget amount.')
  if (!draft.constraints.participantThreshold) blockers.push('Set the minimum effective staking power.')
  if (!draft.constraints.poolCapacity) blockers.push('Set the original configured pool capacity for this new draft.')
  const rewards = [primary, ...side].filter(Boolean) as NftPoolDraftReward[]
  const allocationKeys = rewards.map((reward) => reward.address.toLowerCase())
  if (rewards.length && duplicateAddresses(allocationKeys)) blockers.push('Reward allocation keys must be unique.')
  if (rewards.some((reward) => !/^\d+$/.test(draft.economics.allocationBps[reward.address.toLowerCase()] || '')))
    blockers.push('Reward allocations must be whole-number basis points.')
  const allocationSum = rewards.reduce(
    (sum, reward) => sum + Number(draft.economics.allocationBps[reward.address.toLowerCase()] || 0),
    0,
  )
  if (rewards.length && allocationSum !== 10_000)
    blockers.push('Reward allocations must add up to 10,000 basis points.')
  if (!draft.economics.durationPreset) blockers.push('Choose a duration.')
  if (
    draft.economics.durationPreset === 'custom' &&
    (!draft.economics.customDurationDays || Number(draft.economics.customDurationDays) <= 0)
  )
    blockers.push('Enter a positive custom duration.')
  if (draft.constraints.participantThreshold && !/^\d+$/.test(draft.constraints.participantThreshold))
    blockers.push('Minimum effective staking power must be a non-negative integer.')
  if (draft.constraints.poolCapacity && !isPositiveInteger(draft.constraints.poolCapacity))
    blockers.push('Pool capacity must be a positive integer.')
  if (draft.constraints.userLimitEnabled) {
    if (!isPositiveInteger(draft.constraints.poolLimitPerUser))
      blockers.push('Set a positive per-user NFT limit or turn the limit off.')
    if (!isPositiveInteger(draft.constraints.numberBlocksForUserLimit))
      blockers.push('Set a positive user-limit window in blocks.')
  }

  let economics: PoolEconomicsCalculation | undefined
  if (!blockers.length && primary) {
    economics = calculatePoolEconomics(draft, secondsPerBlock)
    blockers.push(...economics.blockingIssues)
    warnings.push(...economics.warnings)
  }
  const readiness: NftPoolReadiness = blockers.length
    ? 'INCOMPLETE'
    : warnings.length
    ? 'NEEDS_REVIEW'
    : deploymentEnabled
    ? 'READY_FOR_DEPLOYMENT'
    : 'READY_FOR_DRY_RUN'
  return { readiness, blockers, warnings, economics }
}

export function buildNftPoolDeploymentPlan(
  draft: NftPoolDraft,
  economics: PoolEconomicsCalculation,
  factoryAddress?: string,
): NftPoolDeploymentPlan | null {
  const primary = draft.rewards.primary
  const primaryCollection = draft.collections.find((collection) => collection.primary) || draft.collections[0]
  if (!primary || !primaryCollection) return null
  const orderedCollections = [
    primaryCollection,
    ...draft.collections.filter((collection) => collection !== primaryCollection),
  ]
  return {
    chainId: draft.chainId,
    factoryAddress,
    stakedTokenAddress: primaryCollection.address,
    rewardTokenAddress: primary.address,
    sideRewardTokens: draft.rewards.side.map((reward) => reward.address),
    sideRewardPercentages: economics.side.map((item) => item.encodedPercentage.toString()),
    collectionAddresses: orderedCollections.map((collection) => collection.address),
    collectionWeights: orderedCollections.map((collection) => collection.weight),
    budgetTokenAddress: draft.economics.budgetTokenAddress,
    budgetAmount: draft.economics.totalBudget,
    rewardAllocations: economics.allocations.map((item) => ({
      tokenAddress: item.tokenAddress,
      amount: item.achievable.toString(),
      allocationBps: draft.economics.allocationBps[item.tokenAddress.toLowerCase()] || '0',
    })),
    rewardPerBlock: economics.primary.rewardPerBlock?.toString(),
    numberBlocks: economics.blocks,
  }
}

export { ZERO_ADDRESS }
