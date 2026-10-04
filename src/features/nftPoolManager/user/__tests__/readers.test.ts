import { BigNumber } from '@ethersproject/bignumber'
import {
  assertV2StakeLimits,
  assertV2StakeSelection,
  calculateV2SidePending,
  readV2IndexedArrayAtBlock,
} from '../readers'
import type { V2UserPosition } from '../types'

const collection = {
  address: '0x0000000000000000000000000000000000000001',
  name: 'KEY',
  weight: '30',
  approved: true,
  staked: [],
}

function position(overrides: Partial<V2UserPosition> = {}): V2UserPosition {
  return {
    chainId: 31337,
    poolAddress: '0x0000000000000000000000000000000000000002',
    account: '0x0000000000000000000000000000000000000003',
    blockNumber: 100,
    currentBlock: 100,
    status: 'ACTIVE',
    startBlock: 90,
    endBlock: 200,
    threshold: '40',
    nftCount: '0',
    power: '0',
    pendingPrimary: '0',
    rewards: [],
    collections: [collection],
    remainingCapacity: '1',
    capacityAvailable: true,
    hasUserLimit: false,
    userLimit: false,
    poolLimitPerUser: '0',
    userLimitEndBlock: 120,
    performanceFee: '0',
    feeTo: '0x0000000000000000000000000000000000000000',
    ...overrides,
  }
}

describe('V2 user position economics and guards', () => {
  it('accepts an indexed pool array exactly at its safety cap when the sentinel read reverts', async () => {
    const values = Array.from({ length: 16 }, (_, index) => `0x${(index + 1).toString(16).padStart(40, '0')}`)
    const contract = {
      callStatic: {
        communityCollections: jest.fn((index: number) =>
          index < values.length ? Promise.resolve(values[index]) : Promise.reject({ code: 'CALL_EXCEPTION' }),
        ),
      },
    } as any
    const result = await readV2IndexedArrayAtBlock(contract, 'communityCollections', 123, 16)
    expect(result.map((address) => address.toLowerCase())).toEqual(values.map((address) => address.toLowerCase()))
    expect(contract.callStatic.communityCollections).toHaveBeenCalledTimes(17)
  })

  it('blocks an indexed pool array that exceeds its safety cap', async () => {
    const contract = {
      callStatic: {
        sideRewardTokens: jest.fn((index: number) =>
          Promise.resolve(`0x${(index + 1).toString(16).padStart(40, '0')}`),
        ),
      },
    } as any
    await expect(readV2IndexedArrayAtBlock(contract, 'sideRewardTokens', 123, 2)).rejects.toThrow(
      'exceeded the 2-item safety limit',
    )
  })

  it('keeps participant threshold independent of selected NFT weights', () => {
    expect(() => assertV2StakeLimits(position({ threshold: '0' }), 1)).not.toThrow()
    expect(() => assertV2StakeLimits(position({ threshold: '999999' }), 1)).not.toThrow()
  })

  it('rejects duplicate NFT tuples, empty batches and collections outside the verified pool', () => {
    const nft = { collectionAddress: collection.address, tokenId: '900719925474099312345', weight: '30' }
    expect(() => assertV2StakeSelection([nft], [collection])).not.toThrow()
    expect(() => assertV2StakeSelection([nft, nft], [collection])).toThrow(/more than once/)
    expect(() => assertV2StakeSelection([], [collection])).toThrow(/at least one/)
    expect(() =>
      assertV2StakeSelection(
        [{ ...nft, collectionAddress: '0x0000000000000000000000000000000000000004' }],
        [collection],
      ),
    ).toThrow(/not part/)
  })

  it('applies per-user NFT limit only while the configured runtime window is active', () => {
    const limited = position({
      hasUserLimit: true,
      nftCount: '2',
      poolLimitPerUser: '3',
      userLimitEndBlock: 120,
    })
    expect(() => assertV2StakeLimits(limited, 1)).not.toThrow()
    expect(() => assertV2StakeLimits(limited, 2)).toThrow(/at most 3/)
    expect(() => assertV2StakeLimits({ ...limited, currentBlock: 120 }, 2)).not.toThrow()
  })

  it('enforces capacity only for a wallet entering with no existing stake', () => {
    const full = position({ capacityAvailable: false })
    expect(() => assertV2StakeLimits(full, 1)).toThrow(/capacity/)
    expect(() => assertV2StakeLimits({ ...full, nftCount: '1' }, 1)).not.toThrow()
  })

  it('matches Solidity percentage and decimal truncation in both decimal directions', () => {
    const primary18 = BigNumber.from('1234567890123456789')
    const primary6Side18 = calculateV2SidePending(BigNumber.from(1234567), BigNumber.from(50), 6, 18)
    const primary18Side6 = calculateV2SidePending(primary18, BigNumber.from(333), 18, 6)
    expect(primary6Side18.toString()).toBe('617283000000000000')
    expect(primary18Side6.toString()).toBe('4111111')
  })
})
