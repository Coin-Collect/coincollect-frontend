import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'
import { getAddress } from '@ethersproject/address'
import type { Provider } from '@ethersproject/providers'
import erc20Abi from 'config/abi/erc20.json'
import { NftPoolDeploymentPlan, NftPoolDraft, NftPoolDraftReward, NftPoolReadiness, NftQuoteState } from './types'
import {
  BPS_BASE,
  calculatePoolEconomics,
  formatBaseUnitsExact,
  parseUnitsExact,
  PoolEconomicsCalculation,
} from './economics'

const ERC721_INTERFACE_ID = '0x80ac58cd'
const ERC165_ABI = ['function supportsInterface(bytes4 interfaceId) view returns (bool)']
const ERC721_PROBE_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
]
const NON_ZERO_PROBE_ADDRESS = '0x0000000000000000000000000000000000000001'

export interface AddressValidationResult {
  valid: boolean
  address: string
  name?: string
  symbol?: string
  decimals?: number
  reason?: string
  supportsErc165?: boolean
  certainty?: 'VERIFIED_ERC721' | 'COMPATIBLE' | 'INVALID'
}

function canonicalAddress(address: string): string | undefined {
  try {
    return getAddress(address.trim())
  } catch {
    return undefined
  }
}

async function readOptional(contract: Contract, method: string, args: unknown[] = []): Promise<any> {
  try {
    return await contract.callStatic[method](...args)
  } catch {
    return undefined
  }
}

function hasRuntimeSelector(code: string, selector: string): boolean {
  return code.toLowerCase().includes(selector.toLowerCase().replace(/^0x/, ''))
}

async function fallbackCompatibleErc721(provider: Provider, address: string, code: string): Promise<boolean> {
  const nft = new Contract(address, ERC721_PROBE_ABI, provider)
  const balance = await readOptional(nft, 'balanceOf', [NON_ZERO_PROBE_ADDRESS])
  if (balance === undefined) return false

  let ownerOfReadable = false
  try {
    await nft.callStatic.ownerOf(0)
    ownerOfReadable = true
  } catch {
    // Token id 0 may simply be unminted. Runtime selector evidence is used as
    // a cautious fallback without probing the forbidden zero address.
  }
  const bytecodeHasRequiredSelectors = hasRuntimeSelector(code, '6352211e') && hasRuntimeSelector(code, '23b872dd')
  return ownerOfReadable || bytecodeHasRequiredSelectors
}

export async function validateNftCollectionAddress(
  provider: Provider,
  input: string,
): Promise<AddressValidationResult> {
  const address = canonicalAddress(input)
  if (!address) return { valid: false, address: input, certainty: 'INVALID', reason: 'Enter a valid Polygon address.' }
  const code = await provider.getCode(address)
  if (!code || code === '0x')
    return { valid: false, address, certainty: 'INVALID', reason: 'No contract code was found at this address.' }

  let supportsErc165: boolean | undefined
  try {
    supportsErc165 = Boolean(await new Contract(address, ERC165_ABI, provider).supportsInterface(ERC721_INTERFACE_ID))
  } catch {
    supportsErc165 = undefined
  }

  const metadataContract = new Contract(
    address,
    ['function name() view returns (string)', 'function symbol() view returns (string)'],
    provider,
  )
  const [name, symbol] = await Promise.all([
    readOptional(metadataContract, 'name'),
    readOptional(metadataContract, 'symbol'),
  ])

  if (supportsErc165 === true)
    return { valid: true, address, name, symbol, supportsErc165, certainty: 'VERIFIED_ERC721' }
  if (supportsErc165 === false)
    return {
      valid: false,
      address,
      name,
      symbol,
      supportsErc165,
      certainty: 'INVALID',
      reason: 'ERC165 reports that this is not an ERC-721 collection.',
    }

  const compatible = await fallbackCompatibleErc721(provider, address, code)
  return compatible
    ? {
        valid: true,
        address,
        name,
        symbol,
        supportsErc165,
        certainty: 'COMPATIBLE',
        reason: 'ERC165 was unavailable; required ERC-721 probes were compatible.',
      }
    : {
        valid: false,
        address,
        name,
        symbol,
        supportsErc165,
        certainty: 'INVALID',
        reason: 'This contract could not be confirmed as an ERC-721 collection.',
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

function parseUint(value: string | undefined, allowZero = false): BigNumber | undefined {
  if (value === undefined || !/^\d+$/.test(value)) return undefined
  try {
    const parsed = BigNumber.from(value)
    return allowZero || parsed.gt(0) ? parsed : undefined
  } catch {
    return undefined
  }
}

function isCanonicalAddress(value: string): boolean {
  return Boolean(canonicalAddress(value))
}

function rewardLabel(reward: NftPoolDraftReward | null): string {
  return reward?.symbol || 'reward token'
}

export interface NftDraftValidationContext {
  factoryAddress?: string
  intendedAdmin?: string
}

export interface NftDraftValidationResult {
  readiness: NftPoolReadiness
  blockers: string[]
  warnings: string[]
  information: string[]
  economics?: PoolEconomicsCalculation
}

export function validateNftPoolDraft(
  draft: NftPoolDraft,
  secondsPerBlock = 2.2,
  deploymentEnabled = false,
  context?: NftDraftValidationContext,
): NftDraftValidationResult {
  const blockers: string[] = []
  const warnings: string[] = []
  const information: string[] = []
  if (draft.chainId !== 137) blockers.push('The NFT Pool Studio is Polygon-only.')
  if (!draft.name.trim()) blockers.push('Add a pool name.')
  if (!draft.collections.length) blockers.push('Add at least one staking NFT collection.')
  const primaryCollections = draft.collections.filter((collection) => collection.primary)
  if (draft.collections.length && primaryCollections.length !== 1)
    blockers.push('Choose exactly one primary collection.')
  if (draft.collections.some((collection) => collection.chainId !== 137 || !isCanonicalAddress(collection.address)))
    blockers.push('Every staking NFT must be a valid Polygon contract address.')
  if (draft.collections.some((collection) => !parseUint(collection.weight)))
    blockers.push('Collection weights must be positive integers.')
  if (duplicateAddresses(draft.collections.map((collection) => collection.address)))
    blockers.push('NFT collections must be unique.')

  const primary = draft.rewards.primary
  if (!primary?.address || !isCanonicalAddress(primary.address)) blockers.push('Choose a valid primary reward token.')
  if (primary && (primary.decimals === undefined || primary.decimals >= 30))
    blockers.push(`${rewardLabel(primary)} must expose ERC-20 decimals below 30.`)
  const side = draft.rewards.side
  if (side.some((reward) => !isCanonicalAddress(reward.address)))
    blockers.push('Every side reward must be a valid token address.')
  if (duplicateAddresses(side.map((reward) => reward.address))) blockers.push('Side reward tokens must be unique.')
  if (primary && side.some((reward) => reward.address.toLowerCase() === primary.address.toLowerCase()))
    blockers.push('The primary reward cannot also be a side reward.')
  side.forEach((reward) => {
    if (reward.decimals === undefined || reward.decimals >= 30)
      blockers.push(`${rewardLabel(reward)} must expose ERC-20 decimals below 30.`)
  })

  if (!draft.economics.budgetTokenAddress || !isCanonicalAddress(draft.economics.budgetTokenAddress))
    blockers.push('Choose a valid Polygon budget token.')
  if (draft.economics.budgetDecimals === undefined || draft.economics.budgetDecimals >= 30)
    blockers.push('Budget token decimals must be below 30.')
  const budgetAmount = parseUnitsExact(draft.economics.totalBudget, draft.economics.budgetDecimals)
  if (!budgetAmount || budgetAmount.isZero()) blockers.push('Enter a positive budget amount.')

  const threshold = parseUint(draft.constraints.participantThreshold, true)
  if (threshold === undefined) blockers.push('Set the minimum effective staking power.')
  const capacity = parseUint(draft.constraints.poolCapacity)
  if (!capacity) blockers.push('Set the original configured pool capacity for this new draft.')
  const rewards = [primary, ...side].filter(Boolean) as NftPoolDraftReward[]
  const allocationValues = rewards.map((reward) =>
    parseUint(draft.economics.allocationBps[reward.address.toLowerCase()], true),
  )
  if (allocationValues.some((value) => value === undefined))
    blockers.push('Reward allocations must be whole-number basis points.')
  const allocationSum = allocationValues.reduce<BigNumber>(
    (sum, value) => sum.add(value || BigNumber.from(0)),
    BigNumber.from(0),
  )
  if (rewards.length && !allocationSum.eq(BPS_BASE))
    blockers.push('Reward allocations must add up to 10,000 basis points.')
  if (allocationValues.some((value) => value?.isZero()))
    blockers.push('Each configured reward must have a positive allocation.')
  if (!draft.economics.durationPreset) blockers.push('Choose a duration.')
  if (
    draft.economics.durationPreset === 'custom' &&
    (!draft.economics.customDurationDays || Number(draft.economics.customDurationDays) <= 0)
  )
    blockers.push('Enter a positive custom duration.')
  if (draft.constraints.userLimitEnabled) {
    if (!parseUint(draft.constraints.poolLimitPerUser))
      blockers.push('Set a positive maximum NFTs per wallet or turn the limit off.')
    if (!parseUint(draft.constraints.numberBlocksForUserLimit))
      blockers.push('Set a positive advanced limit duration in blocks.')
  } else if (draft.constraints.poolLimitPerUser || draft.constraints.numberBlocksForUserLimit) {
    blockers.push('Clear user-limit parameters when the wallet limit is off.')
  }

  if (draft.constraints.performanceFee) {
    if (!parseUint(draft.constraints.performanceFee, true))
      blockers.push('Performance fee must be a non-negative integer in wei.')
    if (!draft.constraints.performanceFeeRecipient)
      blockers.push('Set a fee recipient when a performance fee is configured.')
    else if (!isCanonicalAddress(draft.constraints.performanceFeeRecipient))
      blockers.push('The performance fee recipient address is invalid.')
  } else if (draft.constraints.performanceFeeRecipient) {
    if (!isCanonicalAddress(draft.constraints.performanceFeeRecipient))
      blockers.push('The performance fee recipient address is invalid.')
    else warnings.push('A fee recipient is configured but no performance fee will be applied.')
  }

  if (draft.source === 'cloned' && draft.sourceEconomics?.userLimitSource !== 'deployment-provenance')
    warnings.push(
      'Original user-limit configuration was not decoded from factory deployment data; verify it before cloning.',
    )
  if (context) {
    if (context.factoryAddress === undefined) blockers.push('The Polygon NFT SmartChefFactory address is unavailable.')
    if (context.factoryAddress && !isCanonicalAddress(context.factoryAddress))
      blockers.push('The configured factory address is invalid.')
    if (context.intendedAdmin === undefined)
      blockers.push('Connect the intended admin wallet before creating the pool.')
    if (context.intendedAdmin && !isCanonicalAddress(context.intendedAdmin))
      blockers.push('The intended admin address is invalid.')
  }

  let economics: PoolEconomicsCalculation | undefined
  if (!blockers.length && primary) {
    economics = calculatePoolEconomics(draft, secondsPerBlock)
    blockers.push(...economics.blockingIssues)
    warnings.push(...economics.warnings)
    information.push(...economics.information)
  }
  // Phase 2.5 never enables deployment readiness. The legacy parameter remains
  // for call-site compatibility; Phase 3 owns the additional pre-sign checks.
  void deploymentEnabled
  const readiness: NftPoolReadiness = blockers.length
    ? 'INCOMPLETE'
    : warnings.length
    ? 'NEEDS_REVIEW'
    : 'READY_FOR_DRY_RUN'
  return {
    readiness,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    information: Array.from(new Set(information)),
    economics,
  }
}

function planInvariant(
  draft: NftPoolDraft,
  economics: PoolEconomicsCalculation,
  factoryAddress?: string,
  intendedAdmin?: string,
): boolean {
  const primary = draft.rewards.primary
  const primaryCollection = draft.collections.find((collection) => collection.primary)
  const primaryCollectionCount = draft.collections.filter((collection) => collection.primary).length
  const rewardAddresses = [primary, ...draft.rewards.side].filter(Boolean).map((reward) => reward!.address)
  const collectionWeights = draft.collections.map((collection) => parseUint(collection.weight))
  const budgetAmount = parseUnitsExact(draft.economics.totalBudget, draft.economics.budgetDecimals)
  const expectedRewardCount = 1 + draft.rewards.side.length
  const allAddressesCanonical = [
    factoryAddress,
    intendedAdmin,
    draft.economics.budgetTokenAddress,
    primary?.address,
    ...draft.collections.map((collection) => collection.address),
    ...draft.rewards.side.map((reward) => reward.address),
  ].every((address) => Boolean(address && isCanonicalAddress(address)))
  const allocationSum = economics.allocations.reduce(
    (sum, allocation) => sum.add(allocation.allocationBps),
    BigNumber.from(0),
  )
  const sidePercentagesValid = economics.side.length === draft.rewards.side.length
  const rewardAllocationAddressesMatch = economics.allocations.every(
    (allocation, index) => allocation.tokenAddress.toLowerCase() === rewardAddresses[index]?.toLowerCase(),
  )
  const budgetAllocationAddressesMatch = economics.budgetAllocations.every(
    (allocation, index) => allocation.tokenAddress.toLowerCase() === rewardAddresses[index]?.toLowerCase(),
  )
  return Boolean(
    factoryAddress &&
      intendedAdmin &&
      allAddressesCanonical &&
      primary &&
      primaryCollection &&
      primaryCollectionCount === 1 &&
      draft.collections.length > 0 &&
      draft.collections.every((collection) => collection.chainId === 137) &&
      !duplicateAddresses(draft.collections.map((collection) => collection.address)) &&
      collectionWeights.every(Boolean) &&
      !duplicateAddresses(rewardAddresses) &&
      primary.decimals !== undefined &&
      primary.decimals < 30 &&
      draft.rewards.side.every((reward) => reward.decimals !== undefined && reward.decimals < 30) &&
      budgetAmount?.gt(0) &&
      draft.economics.budgetDecimals !== undefined &&
      allocationSum.eq(BPS_BASE) &&
      economics.allocations.length === expectedRewardCount &&
      economics.budgetAllocations.length === expectedRewardCount &&
      rewardAllocationAddressesMatch &&
      budgetAllocationAddressesMatch &&
      economics.allocations.every((allocation) => allocation.allocationBps.gt(0)) &&
      sidePercentagesValid &&
      economics.primary.rewardPerBlock?.gt(0) &&
      economics.estimatedDurationBlocks > 0 &&
      parseUint(draft.constraints.poolCapacity) &&
      parseUint(draft.constraints.participantThreshold, true) &&
      (!draft.constraints.userLimitEnabled ||
        (parseUint(draft.constraints.poolLimitPerUser) && parseUint(draft.constraints.numberBlocksForUserLimit))) &&
      (draft.constraints.userLimitEnabled ||
        (!draft.constraints.poolLimitPerUser && !draft.constraints.numberBlocksForUserLimit)) &&
      !economics.budgetRoundingRemainder.isNegative() &&
      economics.allocations.every((allocation) => !allocation.desiredAmount.isNegative()) &&
      economics.side.every((sideReward) => !sideReward.maximumImpliedSideFunding.isNegative()),
  )
}

export function buildNftPoolDeploymentPlan(
  draft: NftPoolDraft,
  economics: PoolEconomicsCalculation,
  factoryAddress?: string,
  intendedAdmin?: string,
  validation?: NftDraftValidationResult,
): NftPoolDeploymentPlan | null {
  const primary = draft.rewards.primary
  const primaryCollection = draft.collections.find((collection) => collection.primary)
  const admin = intendedAdmin || draft.intendedAdmin
  if (
    !primary ||
    !primaryCollection ||
    !factoryAddress ||
    !admin ||
    !planInvariant(draft, economics, factoryAddress, admin)
  )
    return null
  if (validation?.blockers.length || economics.blockingIssues.length) return null
  const orderedCollections = [
    primaryCollection,
    ...draft.collections.filter((collection) => collection !== primaryCollection),
  ]
  const communityCollections = orderedCollections.slice(1)
  const communityWeights = orderedCollections.slice(1).map((collection) => collection.weight)
  const durationDays = economics.durationDays || 0
  const status = validation?.readiness || (economics.warnings.length ? 'NEEDS_REVIEW' : 'READY_FOR_DRY_RUN')
  return {
    draftId: draft.id,
    sourcePoolId: draft.sourcePoolId || undefined,
    chainId: draft.chainId,
    factoryAddress,
    scheduleIntent: {
      durationDays,
      estimatedDurationBlocks: economics.estimatedDurationBlocks,
      measuredSecondsPerBlock: economics.measuredSecondsPerBlock,
      desiredStartMode: 'immediately-before-deployment',
    },
    factoryParameters: {
      stakedTokenAddress: primaryCollection.address,
      rewardTokenAddress: primary.address,
      sideRewardTokens: draft.rewards.side.map((reward) => reward.address),
      sideRewardPercentages: economics.side.map((item) => item.encodedPercentage.toString()),
      rewardPerBlock: economics.primary.rewardPerBlock!.toString(),
      poolLimitPerUser: draft.constraints.userLimitEnabled ? draft.constraints.poolLimitPerUser : '0',
      numberBlocksForUserLimit: draft.constraints.userLimitEnabled ? draft.constraints.numberBlocksForUserLimit : '0',
      poolCapacity: draft.constraints.poolCapacity,
      participantThreshold: draft.constraints.participantThreshold,
      intendedAdmin: admin,
    },
    collectionConfiguration: {
      primaryCollection: primaryCollection.address,
      communityCollections: communityCollections.map((collection) => collection.address),
      collectionWeights: orderedCollections.map((collection) => collection.weight),
      setCollectionWeightsArguments: {
        communityNftAddresses: communityCollections.map((collection) => collection.address),
        weights: communityWeights,
        stakedTokenWeight: primaryCollection.weight,
      },
      collectionWeightConfigurationRequired: communityCollections.length > 0 || primaryCollection.weight !== '1',
    },
    fundingRequirements: {
      primary: {
        tokenAddress: primary.address,
        desiredAmount: economics.primary.desiredAmount.toString(),
        maximumScheduledFunding: economics.primary.maximumScheduledFunding.toString(),
        residual: economics.primary.residual.toString(),
        source: economics.primary.source,
      },
      side: economics.side.map((sideReward) => ({
        tokenAddress: sideReward.tokenAddress,
        desiredAmount: sideReward.desiredSideAmount.toString(),
        encodedPercentage: sideReward.encodedPercentage.toString(),
        maximumImpliedSideFunding: sideReward.maximumImpliedSideFunding.toString(),
        deviationFromDesired: sideReward.deviationFromDesired.toString(),
        deviationBps: sideReward.deviationBps.toString(),
        representability: sideReward.representability,
        source: sideReward.source,
      })),
      budget: {
        tokenAddress: draft.economics.budgetTokenAddress!,
        amount: draft.economics.totalBudget!,
        allocations: economics.budgetAllocations.map((allocation) => ({
          tokenAddress: allocation.tokenAddress,
          allocationBps: allocation.allocationBps.toString(),
          allocatedBudget: formatBaseUnitsExact(allocation.allocatedBudget, draft.economics.budgetDecimals),
        })),
        roundingRemainder: economics.budgetRoundingRemainder.toString(),
      },
    },
    quotes: {
      budgetTokenAddress: draft.economics.budgetTokenAddress!,
      totalBudget: draft.economics.totalBudget!,
      rewards: economics.allocations.map((allocation) => ({
        tokenAddress: allocation.tokenAddress,
        inputAmount:
          allocation.quote?.inputAmount ||
          formatBaseUnitsExact(allocation.allocatedBudget, draft.economics.budgetDecimals),
        outputAmount:
          allocation.quote?.outputAmount || formatBaseUnitsExact(allocation.desiredAmount, allocation.decimals),
        source: allocation.source,
        state: allocation.quoteState,
        quotedAt: allocation.quote?.quotedAt,
        freshnessSeconds: allocation.quote?.freshnessSeconds,
      })),
    },
    postDeploy: {
      performanceFee: draft.constraints.performanceFee || undefined,
      feeTo: draft.constraints.performanceFeeRecipient || undefined,
    },
    readiness: {
      status,
      blockers: validation?.blockers || [],
      warnings: validation?.warnings || economics.warnings,
      information: validation?.information || economics.information,
    },
  }
}
