import { getAddress as checksumAddress } from '@ethersproject/address'
import { BigNumber } from '@ethersproject/bignumber'
import nftFarmsConfig from 'config/constants/nftFarms'
import { mainnetTokens } from 'config/constants/tokens'
import { getCoinCollectNftStakeAddress } from 'utils/addressHelpers'
import {
  NftCollection,
  NftPool,
  NftPoolCollection,
  NftPoolDraft,
  NftPoolDraftCollection,
  NftPoolDraftReward,
  NftPoolStatus,
  NftWeightSource,
} from './types'

export const NFT_POOL_MANAGER_CHAIN_ID = 137

type FarmConfigLike = typeof nftFarmsConfig[number] & {
  sideRewards?: Array<{ token?: string; percentage?: number | string }>
  collectionPowers?: Array<number | string>
  mainCollectionWeight?: number | string
}

export function normalizeNftAddress(address?: string | null): string | null {
  if (!address) return null
  try {
    return checksumAddress(address)
  } catch {
    return null
  }
}

export function nftCollectionId(chainId: number, address: string): string {
  return `${chainId}:${address.toLowerCase()}`
}

function configAddress(addresses: Record<string, string> | undefined, chainId: number): string | null {
  return normalizeNftAddress(addresses?.[String(chainId)])
}

function collectionLabel(farm: FarmConfigLike): string {
  return farm.lpSymbol?.replace(/^CoinCollect\s+/i, '') || `Collection ${farm.pid}`
}

export function normalizeNftCollectionRegistry(
  farms: FarmConfigLike[] = nftFarmsConfig as FarmConfigLike[],
  chainId = NFT_POOL_MANAGER_CHAIN_ID,
): NftCollection[] {
  const byAddress = new Map<string, NftCollection>()

  farms.forEach((farm) => {
    const address = configAddress(farm.nftAddresses as unknown as Record<string, string>, chainId)
    if (!address) return
    const id = nftCollectionId(chainId, address)
    if (!byAddress.has(id)) {
      byAddress.set(id, {
        id,
        chainId,
        address,
        name: farm.lpSymbol || `Collection ${farm.pid}`,
        symbol: 'UNKNOWN',
        displayName: collectionLabel(farm),
        image: farm.avatar,
        knownPid: farm.pid,
        source: 'nft-farms-config',
        verification: 'CONFIG_ONLY',
      })
    }
  })

  return Array.from(byAddress.values()).sort((left, right) => (left.knownPid || 0) - (right.knownPid || 0))
}

export function findNftCollection(
  collections: NftCollection[],
  chainId: number,
  address?: string | null,
): NftCollection | undefined {
  const normalized = normalizeNftAddress(address)
  return normalized
    ? collections.find((collection) => collection.id === nftCollectionId(chainId, normalized))
    : undefined
}

export function ensureNftCollection(
  collections: NftCollection[],
  address: string,
  chainId = NFT_POOL_MANAGER_CHAIN_ID,
  name = 'Unknown NFT collection',
): NftCollection {
  const normalized = normalizeNftAddress(address) || address
  const existing = findNftCollection(collections, chainId, normalized)
  if (existing) return existing
  const collection: NftCollection = {
    id: nftCollectionId(chainId, normalized),
    chainId,
    address: normalized,
    name,
    symbol: 'UNKNOWN',
    displayName: name,
    source: 'on-chain',
    verification: 'UNREADABLE',
  }
  collections.push(collection)
  return collection
}

function asWeight(value: number | string | undefined, fallback = 1): BigNumber {
  try {
    return BigNumber.from(value === undefined || value === '' ? fallback : value)
  } catch {
    return BigNumber.from(fallback)
  }
}

export function configuredPoolCollections(
  farm: FarmConfigLike | undefined,
  collections: NftCollection[],
  chainId = NFT_POOL_MANAGER_CHAIN_ID,
): NftPoolCollection[] {
  if (!farm) return []
  const primaryAddress = configAddress(farm.nftAddresses as unknown as Record<string, string>, chainId)
  if (!primaryAddress) return []
  const primary = ensureNftCollection(collections, primaryAddress, chainId, farm.lpSymbol)
  const supported = (farm.supportedCollectionPids || [])
    .map((pid) => farmsByPid.get(pid))
    .map((supportedFarm) => {
      if (!supportedFarm) return null
      const address = configAddress(supportedFarm.nftAddresses as unknown as Record<string, string>, chainId)
      if (!address) return null
      return {
        farm: supportedFarm,
        collection: ensureNftCollection(collections, address, chainId, supportedFarm.lpSymbol),
      }
    })
    .filter(Boolean) as Array<{ farm: FarmConfigLike; collection: NftCollection }>

  const all = [
    { farm, collection: primary, primary: true },
    ...supported.map(({ farm: supportedFarm, collection }) => ({
      farm: supportedFarm,
      collection,
      primary: false,
    })),
  ]
  const powers = farm.collectionPowers || []
  const primaryWeight = asWeight(farm.mainCollectionWeight, powers[0] === undefined ? 1 : powers[0])

  return all.map(({ collection, primary: isPrimary }, index) => ({
    collection,
    primary: isPrimary,
    weight: asWeight(isPrimary ? primaryWeight.toString() : powers[index], 1),
    weightSource: (powers[index] === undefined && !isPrimary ? 'default' : 'frontend-config') as NftWeightSource,
  }))
}

const farmsByPid = new Map<number, FarmConfigLike>((nftFarmsConfig as FarmConfigLike[]).map((farm) => [farm.pid, farm]))

export function getNftFarmConfig(pid: number): FarmConfigLike | undefined {
  return farmsByPid.get(pid)
}

export function getConfiguredPoolAddress(farm: FarmConfigLike, chainId = NFT_POOL_MANAGER_CHAIN_ID): string | null {
  return configAddress(farm.contractAddresses as unknown as Record<string, string> | undefined, chainId)
}

export function getConfiguredRewardToken(farm: FarmConfigLike | undefined): NftRewardConfig | undefined {
  if (!farm) return undefined
  const earningToken = farm.earningToken as any
  if (!earningToken?.address) return undefined
  return {
    address: normalizeNftAddress(earningToken.address) || earningToken.address,
    symbol: earningToken.symbol || 'UNKNOWN',
    name: earningToken.name || earningToken.symbol || 'Unknown token',
    decimals: earningToken.decimals,
  }
}

export interface NftRewardConfig {
  address: string
  symbol: string
  name: string
  decimals?: number
}

export function getConfiguredSideRewards(
  farm: FarmConfigLike | undefined,
): Array<NftRewardConfig & { percentage?: string }> {
  const tokenBySymbol = new Map<string, NftRewardConfig>()
  ;(Object.values(mainnetTokens) as any[]).forEach((token) => {
    if (token?.symbol && token?.address && token.chainId === NFT_POOL_MANAGER_CHAIN_ID) {
      tokenBySymbol.set(token.symbol.toLowerCase(), {
        address: normalizeNftAddress(token.address) || token.address,
        symbol: token.symbol,
        name: token.name || token.symbol,
        decimals: token.decimals,
      })
    }
  })
  return (farm?.sideRewards || []).map((sideReward) => {
    const symbol = sideReward.token || 'UNKNOWN'
    const configured = tokenBySymbol.get(symbol.toLowerCase())
    return {
      address: configured?.address || '',
      symbol,
      name: configured?.name || symbol,
      decimals: configured?.decimals,
      percentage: sideReward.percentage === undefined ? undefined : String(sideReward.percentage),
    }
  })
}

export function deriveNftPoolStatus(currentBlock: number, startBlock?: number, endBlock?: number): NftPoolStatus {
  if (startBlock === undefined || endBlock === undefined || !Number.isFinite(currentBlock)) return 'UNKNOWN'
  if (currentBlock < startBlock) return 'UPCOMING'
  if (currentBlock < endBlock) return 'ACTIVE'
  return 'FINISHED'
}

export function inferredDurationDays(startBlock?: number, endBlock?: number, secondsPerBlock = 2.2): string {
  if (startBlock === undefined || endBlock === undefined || endBlock <= startBlock) return ''
  const days = ((endBlock - startBlock) * secondsPerBlock) / 86400
  return String(Math.max(1, Math.round(days)))
}

export function formatNftDuration(pool: NftPool, secondsPerBlock: number): string {
  const days = Number(inferredDurationDays(pool.onChain.startBlock, pool.onChain.endBlock, secondsPerBlock))
  if (!days) return 'Duration unavailable'
  if (days >= 330 && days <= 400) return '1 year'
  if (days >= 165 && days <= 200) return '6 months'
  if (days >= 75 && days <= 105) return '3 months'
  if (days >= 20 && days <= 45) return '1 month'
  return `${days} days`
}

export function durationPresetFromDays(days?: number): NftPoolDraft['economics']['durationPreset'] {
  if (!days || !Number.isFinite(days)) return 'custom'
  if (days >= 20 && days <= 45) return '1 month'
  if (days >= 75 && days <= 105) return '3 months'
  if (days >= 165 && days <= 200) return '6 months'
  if (days >= 330 && days <= 400) return '1 year'
  return 'custom'
}

function draftReward(reward: NftRewardConfig | undefined, fallback = 'UNKNOWN'): NftPoolDraftReward {
  return {
    address: reward?.address || '',
    symbol: reward?.symbol || fallback,
    name: reward?.name || fallback,
    decimals: reward?.decimals,
  }
}

export function createNftPoolCloneDraft(pool: NftPool, secondsPerBlock = 2.2): NftPoolDraft {
  const collections: NftPoolDraftCollection[] = pool.collections.map(({ collection, primary, weight }) => ({
    chainId: collection.chainId,
    address: collection.address,
    collectionId: collection.id,
    name: collection.displayName,
    weight: weight.toString(),
    primary,
  }))
  const primaryReward = pool.rewards.primary.token
  const sourceEconomics = pool.sourceEconomics || {
    originalRewardPerBlock: pool.onChain.rewardPerBlock,
    originalStartBlock: pool.onChain.startBlock,
    originalEndBlock: pool.onChain.endBlock,
    originalDurationBlocks:
      pool.onChain.startBlock !== undefined && pool.onChain.endBlock !== undefined
        ? pool.onChain.endBlock - pool.onChain.startBlock
        : undefined,
    originalSideRewardPercentages: pool.rewards.side
      .filter((reward) => reward.onChainPercentage !== undefined)
      .map((reward) => ({ tokenAddress: reward.token.address, percentage: reward.onChainPercentage as BigNumber })),
    originalParticipantThreshold: pool.onChain.participantThreshold,
    originalInitialPoolCapacity: pool.onChain.configuredInitialPoolCapacity,
    currentRemainingCapacity: pool.onChain.currentRemainingPoolCapacity || pool.onChain.poolCapacity,
    originalPoolLimitPerUser: pool.onChain.poolLimitPerUser,
    originalNumberBlocksForUserLimit: pool.onChain.numberBlocksForUserLimit,
    originalAdmin: pool.onChain.owner,
    originalConfiguredUserLimit:
      pool.onChain.poolLimitPerUser !== undefined ? pool.onChain.poolLimitPerUser.gt(0) : undefined,
    userLimitSource: pool.onChain.poolLimitPerUser !== undefined ? 'on-chain-configuration' : 'unavailable',
    originalPerformanceFee: pool.onChain.performanceFee,
    originalFeeTo: pool.onChain.feeTo,
  }
  const durationDays =
    sourceEconomics.originalDurationBlocks && sourceEconomics.originalDurationBlocks > 0
      ? (sourceEconomics.originalDurationBlocks * secondsPerBlock) / 86400
      : undefined
  const durationPreset = durationPresetFromDays(durationDays)
  const sideRewards = pool.rewards.side.map((reward) =>
    draftReward({
      address: reward.token.address,
      symbol: reward.token.symbol,
      name: reward.token.name,
      decimals: reward.token.decimals,
    }),
  )
  return {
    schemaVersion: 2,
    id: `nft-draft-${Date.now()}`,
    sourcePoolId: pool.id,
    chainId: pool.chainId,
    source: 'cloned',
    name: `${pool.metadata.name} copy`,
    banner: pool.metadata.banner,
    avatar: pool.metadata.avatar,
    projectUrl: pool.metadata.projectUrl,
    getNftUrl: pool.metadata.getNftUrl,
    collections,
    rewards: { primary: draftReward(primaryReward), side: sideRewards },
    sourceEconomics,
    unsafe: {},
    economics: {
      durationPreset,
      customDurationDays: durationPreset === 'custom' ? String(Math.max(1, Math.round(durationDays || 30))) : '',
      totalBudget: '',
      budgetTokenAddress: mainnetTokens.usdt.address,
      budgetDecimals: mainnetTokens.usdt.decimals,
      allocationBps: {},
      manualAmounts: {},
      quotes: {},
      quoteErrors: {},
      budgetDenomination: 'USDT',
    },
    constraints: {
      participantThreshold: sourceEconomics.originalParticipantThreshold?.toString() || '',
      poolCapacity: sourceEconomics.originalInitialPoolCapacity?.toString() || '',
      poolLimitPerUser: sourceEconomics.originalPoolLimitPerUser?.toString() || '',
      numberBlocksForUserLimit: sourceEconomics.originalNumberBlocksForUserLimit?.toString() || '',
      userLimitEnabled:
        sourceEconomics.originalConfiguredUserLimit === undefined ? true : sourceEconomics.originalConfiguredUserLimit,
      performanceFee: '',
      performanceFeeRecipient: '',
    },
    updatedAt: Date.now(),
  }
}

export function createEmptyNftPoolDraft(chainId = NFT_POOL_MANAGER_CHAIN_ID): NftPoolDraft {
  return {
    schemaVersion: 2,
    id: `nft-draft-${Date.now()}`,
    sourcePoolId: '',
    chainId,
    source: 'manual',
    name: '',
    collections: [],
    rewards: { primary: null, side: [] },
    economics: {
      durationPreset: '1 month',
      totalBudget: '',
      budgetTokenAddress: mainnetTokens.usdt.address,
      budgetDecimals: mainnetTokens.usdt.decimals,
      budgetDenomination: 'USDT',
      allocationBps: {},
      manualAmounts: {},
      quotes: {},
      quoteErrors: {},
    },
    constraints: {
      participantThreshold: '',
      poolCapacity: '',
      poolLimitPerUser: '',
      numberBlocksForUserLimit: '',
      userLimitEnabled: false,
      performanceFee: '',
      performanceFeeRecipient: '',
    },
    updatedAt: Date.now(),
  }
}

export function configForPool(pool: NftPool): FarmConfigLike | undefined {
  return getNftFarmConfig(pool.pid)
}

export function legacyPoolAddress(): string | null {
  try {
    return getCoinCollectNftStakeAddress()
  } catch {
    return null
  }
}
