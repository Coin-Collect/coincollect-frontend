import { BigNumber } from '@ethersproject/bignumber'
import nftFarmsConfig from 'config/constants/nftFarms'
import {
  configuredPoolCollections,
  createNftPoolCloneDraft,
  deriveNftPoolStatus,
  normalizeNftAddress,
  normalizeNftCollectionRegistry,
} from '../registry'
import { NftPool } from '../types'

describe('NFT pool registry adapters', () => {
  it('normalizes valid addresses and rejects invalid values', () => {
    expect(normalizeNftAddress('0x2e1cf0960fc9ece56f53bf58351d175cd1867b2c')).toBe(
      '0x2E1cF0960Fc9Ece56f53bf58351d175cd1867b2c',
    )
    expect(normalizeNftAddress('not-an-address')).toBeNull()
  })

  it('deduplicates configured collections by chain and address', () => {
    const farms = [
      { pid: 1, lpSymbol: 'Starter', nftAddresses: { 137: '0x569B70fc565AFba702d9e77e75FD3e3c78F57eeD' } },
      { pid: 2, lpSymbol: 'Starter duplicate', nftAddresses: { 137: '0x569b70fc565afba702d9e77e75fd3e3c78f57eed' } },
    ]

    const collections = normalizeNftCollectionRegistry(farms as any)

    expect(collections).toHaveLength(1)
    expect(collections[0].knownPid).toBe(1)
  })

  it('maps the Lot pool primary and community collection weights', () => {
    const lotFarm = (nftFarmsConfig as any[]).find((farm) => farm.pid === 5)
    const collections = normalizeNftCollectionRegistry()
    const poolCollections = configuredPoolCollections(lotFarm, collections)

    expect(poolCollections).toHaveLength(5)
    expect(poolCollections[0].primary).toBe(true)
    expect(poolCollections[0].weight.toString()).toBe('15')
    expect(poolCollections.slice(1).every(({ primary }) => !primary)).toBe(true)
  })
})

describe('NFT pool status and clone safety', () => {
  it('keeps the end block exclusive', () => {
    expect(deriveNftPoolStatus(99, 100, 200)).toBe('UPCOMING')
    expect(deriveNftPoolStatus(100, 100, 200)).toBe('ACTIVE')
    expect(deriveNftPoolStatus(199, 100, 200)).toBe('ACTIVE')
    expect(deriveNftPoolStatus(200, 100, 200)).toBe('FINISHED')
  })

  it('copies editable source data without deployment/runtime identifiers', () => {
    const pool: NftPool = {
      id: '0xpool',
      canonicalId: '137:0xpool',
      pid: 5,
      chainId: 137,
      kind: 'POOL',
      address: '0x1111111111111111111111111111111111111111',
      protocolVersion: 'NftStakeV2',
      source: 'nft-farms-config',
      metadata: { name: 'Lot NFT', avatar: '/lot.png' },
      onChain: {
        codeFound: true,
        abiCompatible: true,
        owner: '0x2222222222222222222222222222222222222222',
        startBlock: 10,
        endBlock: 20,
        rewardPerBlock: BigNumber.from(123),
        participantThreshold: BigNumber.from(3),
        poolCapacity: BigNumber.from(50),
        currentRemainingPoolCapacity: BigNumber.from(50),
      },
      sourceEconomics: {
        originalRewardPerBlock: BigNumber.from(123),
        originalStartBlock: 10,
        originalEndBlock: 20,
        originalDurationBlocks: 10,
        originalSideRewardPercentages: [],
        originalParticipantThreshold: BigNumber.from(3),
        originalInitialPoolCapacity: BigNumber.from(75),
        currentRemainingCapacity: BigNumber.from(50),
        originalAdmin: '0x2222222222222222222222222222222222222222',
      },
      deployment: { decodeStatus: 'unavailable' },
      collections: [
        {
          collection: {
            id: '137:0x3333333333333333333333333333333333333333',
            chainId: 137,
            address: '0x3333333333333333333333333333333333333333',
            name: 'Lot',
            symbol: 'LOT',
            displayName: 'Lot NFT',
            source: 'on-chain',
            verification: 'VERIFIED',
          },
          primary: true,
          weight: BigNumber.from(15),
          weightSource: 'on-chain',
        },
      ],
      rewards: {
        primary: {
          token: {
            address: '0x4444444444444444444444444444444444444444',
            chainId: 137,
            decimals: 18,
            symbol: 'LOT',
            name: 'Lot',
            isReadable: true,
          },
        },
        side: [],
      },
      status: 'ACTIVE',
      statusSource: 'on-chain',
      health: {
        codeFound: true,
        abiCompatible: true,
        ownerReadable: true,
        rewardTokenReadable: true,
        collectionReadable: true,
        configurationMismatch: false,
        warnings: [],
      },
      warnings: [],
      cloneSupport: 'FULL',
    }

    const draft = createNftPoolCloneDraft(pool)

    expect(draft.sourcePoolId).toBe(pool.id)
    expect(draft.collections[0].weight).toBe('15')
    expect(draft.rewards.primary?.symbol).toBe('LOT')
    expect(draft.unsafe).toEqual({})
    expect(draft.economics.allocationBps).toEqual({})
    expect((draft.economics as any).primaryRewardAllocation).toBeUndefined()
    expect(draft.sourceEconomics?.originalRewardPerBlock?.toString()).toBe('123')
    expect(draft.constraints.poolCapacity).toBe('75')
  })
})
