/** @jest-environment jsdom */
import { createEmptyNftPoolDraft } from '../registry'
import {
  clearNftPoolDraftStorage,
  loadNftPoolDraft,
  loadNftPoolDrafts,
  saveNftPoolDraft,
  NFT_POOL_DRAFT_STORAGE_KEY,
  NFT_POOL_DRAFT_STORAGE_KEY_V1,
} from '../storage'

describe('NFT pool draft persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('migrates v1 without carrying runtime capacity or unsafe identifiers', () => {
    window.localStorage.setItem(
      NFT_POOL_DRAFT_STORAGE_KEY_V1,
      JSON.stringify([
        {
          id: 'legacy',
          sourcePoolId: 'pool',
          chainId: 137,
          source: 'cloned',
          name: 'Legacy',
          collections: [],
          rewards: { primary: { address: '0x1', symbol: 'TOKEN', name: 'Token' }, side: [] },
          economics: { durationPreset: 'custom', primaryRewardAllocation: '123', budgetDenomination: 'USDT' },
          constraints: {
            participantThreshold: '3',
            poolCapacity: '55',
            poolLimitPerUser: '',
            numberBlocksForUserLimit: '',
          },
          unsafe: { deployedContractAddress: '0xdead' },
          updatedAt: 1,
        },
      ]),
    )
    const migrated = loadNftPoolDraft('legacy')
    expect(migrated?.schemaVersion).toBe(2)
    expect(migrated?.constraints.poolCapacity).toBe('')
    expect(migrated?.unsafe).toEqual({})
    expect(migrated?.sourceEconomics?.originalRewardPerBlock?.toString()).toBe('123')
  })

  it('stores multiple drafts under the v2 key', () => {
    const first = createEmptyNftPoolDraft()
    first.id = 'one'
    const second = { ...createEmptyNftPoolDraft(), id: 'two' }
    saveNftPoolDraft(first)
    saveNftPoolDraft(second)
    expect(loadNftPoolDrafts()).toHaveLength(2)
    expect(window.localStorage.getItem(NFT_POOL_DRAFT_STORAGE_KEY)).toContain('two')
    clearNftPoolDraftStorage()
    expect(loadNftPoolDrafts()).toHaveLength(0)
  })
})
