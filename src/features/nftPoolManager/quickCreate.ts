import { mainnetTokens } from 'config/constants/tokens'
import { nftCollectionId } from './registry'
import { NftCollection, NftPoolDraft, NftPoolDraftCollection, NftPoolDraftReward } from './types'

export const QUICK_CREATE_DURATION_PRESETS: NftPoolDraft['economics']['durationPreset'][] = [
  '1 month',
  '3 months',
  '6 months',
  '1 year',
  'custom',
]

/** Placeholder only. New cards intentionally keep the financial input empty. */
export const QUICK_CREATE_DEFAULT_BUDGET = ''
export const QUICK_CREATE_DEFAULT_POOL_CAPACITY = '1000'
export const QUICK_CREATE_DEFAULT_PARTICIPANT_THRESHOLD = '20'

export interface QuickCreatePolicy {
  reward: NftPoolDraftReward
  budgetToken: NftPoolDraftReward
  defaultBudget: string
  defaultDuration: NftPoolDraft['economics']['durationPreset']
  defaultPoolCapacity: string
  defaultParticipantThreshold: string
  sideRewardsAllowed: false
  performanceFeeAllowed: false
}

export const QUICK_CREATE_POLICY: QuickCreatePolicy = {
  reward: {
    address: mainnetTokens.collect.address!,
    symbol: mainnetTokens.collect.symbol || 'COLLECT',
    name: mainnetTokens.collect.name || 'CoinCollect Token',
    decimals: mainnetTokens.collect.decimals,
  },
  budgetToken: {
    address: mainnetTokens.usdt.address!,
    symbol: mainnetTokens.usdt.symbol || 'USDT',
    name: mainnetTokens.usdt.name || 'Tether USD',
    decimals: mainnetTokens.usdt.decimals,
  },
  defaultBudget: QUICK_CREATE_DEFAULT_BUDGET,
  defaultDuration: '1 month',
  defaultPoolCapacity: QUICK_CREATE_DEFAULT_POOL_CAPACITY,
  defaultParticipantThreshold: QUICK_CREATE_DEFAULT_PARTICIPANT_THRESHOLD,
  sideRewardsAllowed: false,
  performanceFeeAllowed: false,
}

function quickCollection(collection: NftCollection): NftPoolDraftCollection {
  return {
    chainId: collection.chainId,
    address: collection.address,
    collectionId: collection.id || nftCollectionId(collection.chainId, collection.address),
    name: collection.displayName || collection.name,
    weight: '1',
    primary: true,
  }
}

function shouldRefreshGeneratedName(draft: NftPoolDraft): boolean {
  if (!draft.name) return true
  const previousCollection = draft.collections[0]?.name
  const previousReward = draft.rewards.primary?.symbol || QUICK_CREATE_POLICY.reward.symbol
  return draft.name === `${previousCollection} · ${previousReward} Pool`
}

/** Maps the three Quick Create decisions into the existing full draft model. */
export function buildQuickCreateDraft(
  draft: NftPoolDraft,
  collection: NftCollection,
  options: {
    budget?: string
    durationPreset?: NftPoolDraft['economics']['durationPreset']
    customDurationDays?: string
    reward?: NftPoolDraftReward
  } = {},
): NftPoolDraft {
  const reward = options.reward || QUICK_CREATE_POLICY.reward
  const budgetToken = QUICK_CREATE_POLICY.budgetToken
  const durationPreset = options.durationPreset || draft.economics.durationPreset || QUICK_CREATE_POLICY.defaultDuration
  const budget = options.budget === undefined ? draft.economics.totalBudget || '' : options.budget
  const collectionEntry = quickCollection(collection)
  return {
    ...draft,
    name: shouldRefreshGeneratedName(draft)
      ? `${collection.displayName || collection.name} · ${reward.symbol} Pool`
      : draft.name,
    avatar: collection.image || draft.avatar,
    banner: collection.image || draft.banner,
    collections: [collectionEntry],
    rewards: { primary: reward, side: [] },
    economics: {
      ...draft.economics,
      budgetTokenAddress: budgetToken.address,
      budgetDenomination: budgetToken.symbol,
      budgetDecimals: budgetToken.decimals,
      totalBudget: budget,
      allocationBps: { [reward.address.toLowerCase()]: '10000' },
      manualAmounts: {},
      quotes: {},
      quoteErrors: {},
      durationPreset,
      customDurationDays:
        durationPreset === 'custom' ? options.customDurationDays || draft.economics.customDurationDays || '30' : '',
    },
    constraints: {
      ...draft.constraints,
      participantThreshold: QUICK_CREATE_POLICY.defaultParticipantThreshold,
      poolCapacity: QUICK_CREATE_POLICY.defaultPoolCapacity,
      poolLimitPerUser: '',
      numberBlocksForUserLimit: '',
      userLimitEnabled: false,
      performanceFee: '',
      performanceFeeRecipient: '',
    },
    updatedAt: Date.now(),
  }
}

export function isQuickCreateShape(draft: NftPoolDraft): boolean {
  return (
    draft.collections.length === 1 &&
    draft.collections[0].primary &&
    draft.collections[0].weight === '1' &&
    draft.rewards.primary?.address.toLowerCase() === QUICK_CREATE_POLICY.reward.address.toLowerCase() &&
    draft.rewards.side.length === 0 &&
    draft.economics.allocationBps[QUICK_CREATE_POLICY.reward.address.toLowerCase()] === '10000' &&
    !draft.constraints.userLimitEnabled &&
    !draft.constraints.performanceFee &&
    !draft.constraints.performanceFeeRecipient
  )
}

export function quickCreateSummary(draft: NftPoolDraft): string {
  const collection = draft.collections[0]?.name || 'Choose an NFT collection'
  const budget = draft.economics.totalBudget
    ? `${draft.economics.totalBudget} ${QUICK_CREATE_POLICY.budgetToken.symbol}`
    : 'Set a budget'
  const rewards = [draft.rewards.primary, ...draft.rewards.side].filter(Boolean).map((reward) => reward!.symbol)
  return `${collection} · ${budget} · ${draft.economics.durationPreset} · ${rewards.join(' + ') || 'No reward'}`
}
