import { BigNumber } from '@ethersproject/bignumber'
import { createEmptyNftPoolDraft } from '../registry'
import { validateNftPoolDraft } from '../validation'

describe('NFT pool draft validation', () => {
  it('keeps a new draft incomplete without silently selecting assets', () => {
    const draft = createEmptyNftPoolDraft()
    expect(draft.collections).toHaveLength(0)
    expect(draft.rewards.primary).toBeNull()
    expect(validateNftPoolDraft(draft).readiness).toBe('INCOMPLETE')
  })

  it('requires allocation basis points to total 10,000', () => {
    const draft = createEmptyNftPoolDraft()
    draft.name = 'Test pool'
    draft.collections = [
      {
        chainId: 137,
        address: '0x1111111111111111111111111111111111111111',
        collectionId: '137:0x1111111111111111111111111111111111111111',
        name: 'NFT',
        weight: '1',
        primary: true,
      },
    ]
    draft.rewards.primary = {
      address: '0x2222222222222222222222222222222222222222',
      symbol: 'PRM',
      name: 'Primary',
      decimals: 18,
    }
    draft.economics.totalBudget = '100'
    draft.economics.allocationBps = { '0x2222222222222222222222222222222222222222': '9000' }
    const result = validateNftPoolDraft(draft)
    expect(result.blockers).toContain('Reward allocations must add up to 10,000 basis points.')
  })

  it('uses exact BigNumber values for positive weight checks', () => {
    const draft = createEmptyNftPoolDraft()
    draft.collections = [
      {
        chainId: 137,
        address: '0x1111111111111111111111111111111111111111',
        collectionId: 'x',
        name: 'NFT',
        weight: BigNumber.from(2).pow(80).toString(),
        primary: true,
      },
    ]
    expect(validateNftPoolDraft(draft).blockers).toContain('Add a pool name.')
    expect(validateNftPoolDraft(draft).blockers).not.toContain('Collection weights must be positive integers.')
  })
})
