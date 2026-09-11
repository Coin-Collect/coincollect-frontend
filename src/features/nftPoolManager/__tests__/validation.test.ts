import { BigNumber } from '@ethersproject/bignumber'
import { calculatePoolEconomics } from '../economics'
import { createEmptyNftPoolDraft } from '../registry'
import { mainnetTokens } from 'config/constants/tokens'
import { buildNftPoolDeploymentPlan, validateNftPoolDraft } from '../validation'

describe('NFT pool draft validation', () => {
  it('keeps a new draft incomplete without silently selecting assets', () => {
    const draft = createEmptyNftPoolDraft()
    expect(draft.collections).toHaveLength(0)
    expect(draft.rewards.primary?.symbol).toBe('COLLECT')
    expect(draft.economics.totalBudget).toBe('')
    expect(draft.economics.allocationBps[mainnetTokens.collect.address!.toLowerCase()]).toBe('10000')
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

  it('marks manual amounts for review without pretending they have a budget valuation', () => {
    const draft = createEmptyNftPoolDraft()
    draft.name = 'Manual amount pool'
    draft.collections = [
      {
        chainId: 137,
        address: '0x1111111111111111111111111111111111111111',
        collectionId: 'x',
        name: 'NFT',
        weight: '1',
        primary: true,
      },
    ]
    draft.rewards.primary = {
      address: '0x2222222222222222222222222222222222222222',
      symbol: 'COLLECT',
      name: 'COLLECT',
      decimals: 18,
    }
    draft.economics.totalBudget = '10'
    draft.economics.allocationBps = { '0x2222222222222222222222222222222222222222': '10000' }
    draft.economics.manualAmounts = { '0x2222222222222222222222222222222222222222': '2500' }
    draft.constraints.participantThreshold = '0'
    draft.constraints.poolCapacity = '100'
    const result = validateNftPoolDraft(draft)
    expect(result.readiness).toBe('NEEDS_REVIEW')
    expect(result.warnings[0]).toContain('manually')
    expect(result.economics?.primary.source).toBe('manual')
    expect(result.economics?.primary.valuationVerified).toBe(false)
  })

  it('creates a complete structured plan without transaction or final block data', () => {
    const draft = createEmptyNftPoolDraft()
    draft.id = 'plan-draft'
    draft.name = 'Plan pool'
    draft.collections = [
      {
        chainId: 137,
        address: '0x1111111111111111111111111111111111111111',
        collectionId: 'primary',
        name: 'Primary',
        weight: '1',
        primary: true,
      },
    ]
    draft.rewards.primary = {
      address: '0x2222222222222222222222222222222222222222',
      symbol: 'USDT',
      name: 'USDT',
      decimals: 6,
    }
    draft.economics.budgetTokenAddress = '0x2222222222222222222222222222222222222222'
    draft.economics.budgetDecimals = 6
    draft.economics.totalBudget = '10'
    draft.economics.budgetTokenAddress = '0x2222222222222222222222222222222222222222'
    draft.economics.budgetDecimals = 6
    draft.economics.allocationBps = { '0x2222222222222222222222222222222222222222': '10000' }
    draft.economics.quotes = {
      '0x2222222222222222222222222222222222222222': {
        budgetTokenAddress: draft.economics.budgetTokenAddress!,
        rewardTokenAddress: '0x2222222222222222222222222222222222222222',
        inputAmount: '10',
        outputAmount: '10',
        source: 'identity',
        sourceLabel: 'Identity quote',
        path: [],
        allocationBps: '10000',
        totalBudget: '10',
        quotedAt: Date.now(),
        freshnessSeconds: 30,
        expirySeconds: 120,
      },
    }
    draft.constraints.participantThreshold = '0'
    draft.constraints.poolCapacity = '100'
    const validation = validateNftPoolDraft(draft, 2, false, {
      factoryAddress: '0x3333333333333333333333333333333333333333',
      intendedAdmin: '0x4444444444444444444444444444444444444444',
    })
    const economics = validation.economics || calculatePoolEconomics(draft, 2)
    const plan = buildNftPoolDeploymentPlan(
      draft,
      economics,
      '0x3333333333333333333333333333333333333333',
      '0x4444444444444444444444444444444444444444',
      validation,
    )
    expect(plan?.factoryParameters.rewardPerBlock).toBeTruthy()
    expect(plan?.factoryParameters.intendedAdmin).toBe('0x4444444444444444444444444444444444444444')
    expect(plan?.collectionConfiguration.setCollectionWeightsArguments.stakedTokenWeight).toBe('1')
    expect(plan?.fundingRequirements.primary.maximumScheduledFunding).toBeTruthy()
    expect(plan?.fundingRequirements.budget.roundingRemainder).toBe('0')
    expect(plan && 'startBlock' in plan).toBe(false)
    expect(plan && 'transactions' in plan).toBe(false)
  })
})
