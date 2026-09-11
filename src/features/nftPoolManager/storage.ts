import { BigNumber } from '@ethersproject/bignumber'
import { createEmptyNftPoolDraft } from './registry'
import { NftPoolDraft, NftPoolDraftEconomics, NftPoolSourceEconomics } from './types'

export const NFT_POOL_DRAFT_STORAGE_KEY = 'coincollect.nft-pool-studio.drafts.v2'
export const NFT_POOL_DRAFT_STORAGE_KEY_V1 = 'coincollect.nft-pool-studio.drafts.v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function idFor(prefix = 'nft-draft'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function safeEconomics(input: any): NftPoolDraftEconomics {
  return {
    durationPreset: input?.durationPreset || '1 month',
    customDurationDays: input?.customDurationDays || '',
    budgetTokenAddress: input?.budgetTokenAddress,
    budgetDenomination: input?.budgetDenomination || 'USDT',
    budgetDecimals: input?.budgetDecimals,
    totalBudget: input?.totalBudget || '',
    allocationBps: input?.allocationBps || {},
    manualAmounts: input?.manualAmounts || {},
    quotes: input?.quotes || {},
    estimatedBlocks: input?.estimatedBlocks,
    secondsPerBlock: input?.secondsPerBlock,
  }
}

function reviveBigNumber(value: any): BigNumber | undefined {
  try {
    return value === undefined || value === null ? undefined : BigNumber.from(value?._hex || value)
  } catch {
    return undefined
  }
}

function safeSourceEconomics(input: any): NftPoolSourceEconomics | undefined {
  if (!input || typeof input !== 'object') return undefined
  return {
    originalRewardPerBlock: reviveBigNumber(input.originalRewardPerBlock),
    originalStartBlock: Number.isFinite(Number(input.originalStartBlock))
      ? Number(input.originalStartBlock)
      : undefined,
    originalEndBlock: Number.isFinite(Number(input.originalEndBlock)) ? Number(input.originalEndBlock) : undefined,
    originalDurationBlocks: Number.isFinite(Number(input.originalDurationBlocks))
      ? Number(input.originalDurationBlocks)
      : undefined,
    originalSideRewardPercentages: Array.isArray(input.originalSideRewardPercentages)
      ? input.originalSideRewardPercentages
          .map((item: any) => ({
            tokenAddress: String(item.tokenAddress || ''),
            percentage: reviveBigNumber(item.percentage) || BigNumber.from(0),
          }))
          .filter((item: any) => item.tokenAddress)
      : [],
    originalParticipantThreshold: reviveBigNumber(input.originalParticipantThreshold),
    originalInitialPoolCapacity: reviveBigNumber(input.originalInitialPoolCapacity),
    currentRemainingCapacity: reviveBigNumber(input.currentRemainingCapacity),
    originalPoolLimitPerUser: reviveBigNumber(input.originalPoolLimitPerUser),
    originalNumberBlocksForUserLimit: Number.isFinite(Number(input.originalNumberBlocksForUserLimit))
      ? Number(input.originalNumberBlocksForUserLimit)
      : undefined,
    originalAdmin: typeof input.originalAdmin === 'string' ? input.originalAdmin : undefined,
  }
}

function migrateDraft(input: any): NftPoolDraft | null {
  if (!input || typeof input !== 'object' || !input.id) return null
  if (input.schemaVersion === 2) {
    const base = createEmptyNftPoolDraft(Number(input.chainId) || 137)
    return {
      ...base,
      schemaVersion: 2,
      id: String(input.id),
      sourcePoolId: String(input.sourcePoolId || ''),
      chainId: Number(input.chainId) || 137,
      source: input.source === 'cloned' ? 'cloned' : 'manual',
      name: typeof input.name === 'string' ? input.name : '',
      banner: typeof input.banner === 'string' ? input.banner : undefined,
      avatar: typeof input.avatar === 'string' ? input.avatar : undefined,
      projectUrl: typeof input.projectUrl === 'string' ? input.projectUrl : undefined,
      getNftUrl: typeof input.getNftUrl === 'string' ? input.getNftUrl : undefined,
      collections: Array.isArray(input.collections) ? input.collections : [],
      rewards: {
        primary: input.rewards?.primary || null,
        side: Array.isArray(input.rewards?.side) ? input.rewards.side : [],
      },
      sourceEconomics: safeSourceEconomics(input.sourceEconomics),
      economics: { ...base.economics, ...safeEconomics(input.economics) },
      constraints: {
        ...base.constraints,
        ...(input.constraints || {}),
        userLimitEnabled: Boolean(input.constraints?.userLimitEnabled),
      },
      readiness: ['INCOMPLETE', 'NEEDS_REVIEW', 'READY_FOR_DRY_RUN', 'READY_FOR_DEPLOYMENT'].includes(input.readiness)
        ? input.readiness
        : undefined,
      updatedAt: Number(input.updatedAt) || Date.now(),
      unsafe: {},
    }
  }

  // v1 had a raw rewardPerBlock in primaryRewardAllocation and copied the
  // mutable runtime capacity. Preserve neither as new deployment inputs.
  const oldEconomics = input.economics || {}
  const oldConstraints = input.constraints || {}
  const oldPrimary = input.rewards?.primary
  const originalRewardPerBlock = oldEconomics.primaryRewardAllocation
  let sourceEconomics: NftPoolSourceEconomics | undefined
  if (input.sourcePoolId && originalRewardPerBlock) {
    const restored = reviveBigNumber(originalRewardPerBlock)
    sourceEconomics = restored ? { originalRewardPerBlock: restored, originalSideRewardPercentages: [] } : undefined
  }
  const base = createEmptyNftPoolDraft(Number(input.chainId) || 137)
  return {
    ...base,
    schemaVersion: 2,
    id: String(input.id),
    sourcePoolId: String(input.sourcePoolId || ''),
    chainId: Number(input.chainId) || 137,
    source: input.source === 'cloned' ? 'cloned' : 'manual',
    name: typeof input.name === 'string' ? input.name : '',
    banner: typeof input.banner === 'string' ? input.banner : undefined,
    avatar: typeof input.avatar === 'string' ? input.avatar : undefined,
    projectUrl: typeof input.projectUrl === 'string' ? input.projectUrl : undefined,
    getNftUrl: typeof input.getNftUrl === 'string' ? input.getNftUrl : undefined,
    collections: Array.isArray(input.collections)
      ? input.collections.map((item: any) => ({
          chainId: Number(item.chainId) || 137,
          address: String(item.address || ''),
          collectionId: String(item.collectionId || ''),
          name: String(item.name || 'NFT collection'),
          weight: String(item.weight || ''),
          primary: Boolean(item.primary),
        }))
      : [],
    rewards: {
      primary:
        oldPrimary?.address || oldPrimary?.symbol
          ? {
              address: String(oldPrimary.address || ''),
              symbol: String(oldPrimary.symbol || 'UNKNOWN'),
              name: String(oldPrimary.name || oldPrimary.symbol || 'Unknown token'),
              decimals: oldPrimary.decimals === undefined ? undefined : Number(oldPrimary.decimals),
            }
          : null,
      side: Array.isArray(input.rewards?.side)
        ? input.rewards.side.map((item: any) => ({
            address: String(item.address || ''),
            symbol: String(item.symbol || 'UNKNOWN'),
            name: String(item.name || item.symbol || 'Unknown token'),
            decimals: item.decimals === undefined ? undefined : Number(item.decimals),
          }))
        : [],
    },
    sourceEconomics,
    economics: {
      ...base.economics,
      durationPreset: oldEconomics.durationPreset || '1 month',
      customDurationDays: oldEconomics.customDurationDays || '',
      budgetDenomination: oldEconomics.budgetDenomination || 'USDT',
      totalBudget: oldEconomics.totalBudget || '',
      allocationBps: {},
      manualAmounts: {},
      quotes: {},
    },
    constraints: {
      ...base.constraints,
      participantThreshold: oldConstraints.participantThreshold || '',
      // v1 capacity was runtime state and is intentionally not migrated.
      poolCapacity: '',
      poolLimitPerUser: oldConstraints.poolLimitPerUser || '',
      numberBlocksForUserLimit: oldConstraints.numberBlocksForUserLimit || '',
      performanceFee: '',
      userLimitEnabled: false,
    },
    updatedAt: Number(input.updatedAt) || Date.now(),
    unsafe: {},
  }
}

function readRaw(key: string): any[] {
  if (!canUseStorage()) return []
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function loadNftPoolDrafts(): NftPoolDraft[] {
  if (!canUseStorage()) return []
  const current = readRaw(NFT_POOL_DRAFT_STORAGE_KEY).map(migrateDraft).filter(Boolean) as NftPoolDraft[]
  const legacy = readRaw(NFT_POOL_DRAFT_STORAGE_KEY_V1).map(migrateDraft).filter(Boolean) as NftPoolDraft[]
  const byId = new Map<string, NftPoolDraft>()
  ;[...current, ...legacy].forEach((draft) => {
    if (!byId.has(draft.id)) byId.set(draft.id, draft)
  })
  return Array.from(byId.values()).sort((left, right) => right.updatedAt - left.updatedAt)
}

export function loadNftPoolDraft(id: string): NftPoolDraft | undefined {
  return loadNftPoolDrafts().find((draft) => draft.id === id)
}

export function saveNftPoolDraft(draft: NftPoolDraft): void {
  if (!canUseStorage()) return
  const next = { ...draft, schemaVersion: 2 as const, updatedAt: Date.now() }
  const drafts = loadNftPoolDrafts().filter((item) => item.id !== draft.id)
  window.localStorage.setItem(NFT_POOL_DRAFT_STORAGE_KEY, JSON.stringify([next, ...drafts]))
}

export function deleteNftPoolDraft(id: string): void {
  if (!canUseStorage()) return
  const drafts = loadNftPoolDrafts().filter((draft) => draft.id !== id)
  window.localStorage.setItem(NFT_POOL_DRAFT_STORAGE_KEY, JSON.stringify(drafts))
}

export function duplicateNftPoolDraft(id: string): NftPoolDraft | undefined {
  const draft = loadNftPoolDraft(id)
  if (!draft) return undefined
  const duplicate: NftPoolDraft = {
    ...draft,
    id: idFor(),
    name: draft.name ? `${draft.name} copy` : '',
    updatedAt: Date.now(),
  }
  saveNftPoolDraft(duplicate)
  return duplicate
}

export function clearNftPoolDraftStorage(): void {
  if (!canUseStorage()) return
  window.localStorage.removeItem(NFT_POOL_DRAFT_STORAGE_KEY)
  window.localStorage.removeItem(NFT_POOL_DRAFT_STORAGE_KEY_V1)
}
