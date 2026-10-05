import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { getPolygonRuntimeChainId } from 'config/localFork'
import { getNftSmartChefFactoryAddress } from 'utils/addressHelpers'
import { readV2UserPositionSummary, readV2UserRecoveryPosition } from '../recovery'
import type { V2PoolIdentity } from '../../publication'

jest.mock('@ethersproject/contracts', () => ({ Contract: jest.fn() }))

const POOL = '0x1111111111111111111111111111111111111111'
const COLLECTION = '0x2222222222222222222222222222222222222222'
const ACCOUNT = '0x3333333333333333333333333333333333333333'
const FACTORY = getNftSmartChefFactoryAddress(137)!
const mockContract = Contract as unknown as jest.Mock
let poolMethods: Record<string, jest.Mock>
let collectionOwner: jest.Mock
let provider: any
let latestBlock: number
let pool: V2PoolIdentity

beforeEach(() => {
  poolMethods = {
    SMART_CHEF_FACTORY: jest.fn().mockResolvedValue(FACTORY),
    userInfo: jest.fn().mockResolvedValue([BigNumber.from(17), BigNumber.from(1), BigNumber.from(0)]),
    balanceOf: jest.fn().mockResolvedValue(BigNumber.from(1)),
    tokenOfOwnerByIndex: jest.fn().mockResolvedValue([COLLECTION, BigNumber.from(42)]),
    tokenWeight: jest.fn().mockResolvedValue(BigNumber.from(17)),
  }
  collectionOwner = jest.fn().mockResolvedValue(POOL)
  mockContract.mockImplementation((address: string) =>
    address.toLowerCase() === POOL.toLowerCase()
      ? { callStatic: poolMethods }
      : { callStatic: { ownerOf: collectionOwner } },
  )
  provider = {
    getNetwork: jest.fn().mockResolvedValue({ chainId: getPolygonRuntimeChainId() }),
    getBlockNumber: jest.fn().mockImplementation(async () => latestBlock),
    getBlock: jest.fn().mockResolvedValue({ hash: `0x${'a'.repeat(64)}` }),
    getCode: jest.fn().mockResolvedValue('0x60006000'),
  }
  latestBlock = 777
  pool = {
    address: POOL,
    chainId: 137,
    factoryAddress: FACTORY,
    verified: true,
    publicReady: false,
    pool: { collections: [] },
  } as unknown as V2PoolIdentity
})

afterEach(() => mockContract.mockReset())

it('discovers and validates staked tuples using stored tokenWeight without current collection or reward config', async () => {
  const summary = await readV2UserPositionSummary(pool, provider, ACCOUNT)
  const recovery = await readV2UserRecoveryPosition(pool, provider, ACCOUNT)

  expect(summary).toMatchObject({ state: 'positive', count: '1', power: '17', blockNumber: 777 })
  expect(recovery).toMatchObject({
    poolAddress: POOL,
    account: ACCOUNT,
    blockNumber: 777,
    nftCount: '1',
    power: '17',
    complete: true,
    collections: [
      {
        address: COLLECTION,
        staked: [{ collectionAddress: COLLECTION, tokenId: '42', weight: '17' }],
      },
    ],
  })
  expect(poolMethods.tokenWeight).toHaveBeenCalledWith(COLLECTION, expect.anything(), { blockTag: 777 })
  expect(collectionOwner).toHaveBeenCalledWith(expect.anything(), { blockTag: 777 })
  expect(Object.keys(poolMethods).sort()).toEqual(
    ['SMART_CHEF_FACTORY', 'balanceOf', 'tokenOfOwnerByIndex', 'tokenWeight', 'userInfo'].sort(),
  )
  expect(provider.getCode).toHaveBeenCalledWith(POOL, 777)
  expect(provider.getCode).toHaveBeenCalledWith(FACTORY, 777)
})

it('keeps a non-public pool position positive when full tuple enumeration is unavailable', async () => {
  poolMethods.tokenOfOwnerByIndex.mockRejectedValue(new Error('temporary NFT enumeration failure'))

  await expect(readV2UserPositionSummary(pool, provider, ACCOUNT)).resolves.toMatchObject({
    state: 'positive',
    count: '1',
    power: '17',
  })
  await expect(readV2UserRecoveryPosition(pool, provider, ACCOUNT)).rejects.toThrow('temporary NFT enumeration failure')
  expect(pool.publicReady).toBe(false)
})

it('does not treat a count-mismatched position as a positive recovery summary', async () => {
  poolMethods.balanceOf.mockResolvedValue(BigNumber.from(0))

  await expect(readV2UserPositionSummary(pool, provider, ACCOUNT)).rejects.toThrow('Position count is inconsistent')
  expect(pool.publicReady).toBe(false)
})

it('does not report a zero position when stored power remains non-zero', async () => {
  poolMethods.userInfo.mockResolvedValue([BigNumber.from(17), BigNumber.from(0), BigNumber.from(0)])
  poolMethods.balanceOf.mockResolvedValue(BigNumber.from(0))

  await expect(readV2UserPositionSummary(pool, provider, ACCOUNT)).rejects.toThrow(
    'zero staked NFTs but non-zero stored power',
  )
})

it('blocks recovery when fresh custody does not belong to the verified pool', async () => {
  collectionOwner.mockResolvedValue(ACCOUNT)

  await expect(readV2UserRecoveryPosition(pool, provider, ACCOUNT)).rejects.toThrow(
    'custody or stored-weight validation',
  )
})

it('resumes a partially enumerated position at its original pinned block', async () => {
  let failedIndex50 = false
  poolMethods.userInfo.mockResolvedValue([BigNumber.from(51), BigNumber.from(51), BigNumber.from(0)])
  poolMethods.balanceOf.mockResolvedValue(BigNumber.from(51))
  poolMethods.tokenOfOwnerByIndex.mockImplementation(async (_account, index) => {
    if (index === 50 && !failedIndex50) {
      failedIndex50 = true
      throw new Error('temporary RPC failure')
    }
    return [COLLECTION, BigNumber.from(index + 1)]
  })
  poolMethods.tokenWeight.mockResolvedValue(BigNumber.from(1))

  await expect(readV2UserRecoveryPosition(pool, provider, ACCOUNT)).rejects.toThrow('temporary RPC failure')
  latestBlock = 778
  const resumed = await readV2UserRecoveryPosition(pool, provider, ACCOUNT)

  expect(resumed.nftCount).toBe('51')
  expect(resumed.collections[0].staked).toHaveLength(51)
  expect(resumed.blockNumber).toBe(777)
  expect(resumed.stale).toBe(true)
  expect(poolMethods.tokenOfOwnerByIndex).toHaveBeenCalledWith(expect.anything(), 50, { blockTag: 777 })
})
