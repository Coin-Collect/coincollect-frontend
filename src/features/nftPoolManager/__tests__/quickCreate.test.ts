import { mainnetTokens } from 'config/constants/tokens'
import { createEmptyNftPoolDraft } from '../registry'
import { QUICK_CREATE_POLICY, buildQuickCreateDraft, isQuickCreateShape, quickCreateSummary } from '../quickCreate'
import { NftCollection } from '../types'

const collection: NftCollection = {
  id: '137:0x1111111111111111111111111111111111111111',
  chainId: 137,
  address: '0x1111111111111111111111111111111111111111',
  name: 'Starter NFT',
  symbol: 'START',
  displayName: 'Starter collection',
  image: '/images/collections/avatar/avlogo.png',
  source: 'nft-farms-config',
  verification: 'CONFIG_ONLY',
}

describe('Quick Create policy', () => {
  it('maps one collection, COLLECT and USDT into the full draft model', () => {
    const draft = buildQuickCreateDraft(createEmptyNftPoolDraft(), collection, {
      budget: '250',
      durationPreset: '3 months',
    })
    expect(draft.rewards.primary?.address).toBe(mainnetTokens.collect.address)
    expect(draft.economics.budgetTokenAddress).toBe(mainnetTokens.usdt.address)
    expect(draft.economics.allocationBps).toEqual({ [mainnetTokens.collect.address.toLowerCase()]: '10000' })
    expect(draft.collections).toHaveLength(1)
    expect(draft.collections[0]).toMatchObject({ primary: true, weight: '1' })
    expect(draft.rewards.side).toEqual([])
    expect(draft.constraints.performanceFee).toBe('')
    expect(draft.economics.durationPreset).toBe('3 months')
    expect(draft.avatar).toBe(collection.image)
    expect(draft.banner).toBe(collection.image)
    expect(isQuickCreateShape(draft)).toBe(true)
    expect(quickCreateSummary(draft)).toContain('250 USDT')
  })

  it('supports an explicit reward override without changing the default policy', () => {
    const reward = {
      address: '0x2222222222222222222222222222222222222222',
      symbol: 'TEST',
      name: 'Test token',
      decimals: 18,
    }
    const draft = buildQuickCreateDraft(createEmptyNftPoolDraft(), collection, { reward })
    expect(draft.rewards.primary).toEqual(reward)
    expect(draft.economics.allocationBps).toEqual({ [reward.address.toLowerCase()]: '10000' })
    expect(isQuickCreateShape(draft)).toBe(false)
    expect(QUICK_CREATE_POLICY.reward.symbol).toBe('COLLECT')
  })

  it('preserves a manually edited pool name when defaults are reapplied', () => {
    const draft = buildQuickCreateDraft(createEmptyNftPoolDraft(), collection)
    const edited = buildQuickCreateDraft({ ...draft, name: 'My canary pool' }, { ...collection, image: '/other.png' })
    expect(edited.name).toBe('My canary pool')
    expect(edited.avatar).toBe('/other.png')
  })

  it('keeps the policy defaults explicit and custom setup outside Quick Create', () => {
    expect(QUICK_CREATE_POLICY.defaultDuration).toBe('1 month')
    expect(QUICK_CREATE_POLICY.sideRewardsAllowed).toBe(false)
    expect(QUICK_CREATE_POLICY.performanceFeeAllowed).toBe(false)
    expect(QUICK_CREATE_POLICY.defaultPoolCapacity).toBe('1000')
  })
})
