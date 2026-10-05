import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import type { Provider } from '@ethersproject/providers'
import { readNftPoolPublicReadiness, verifyNftPoolFactoryEventAtBlock } from '../discovery'

jest.mock('@ethersproject/contracts', () => ({
  Contract: jest.fn().mockImplementation(() => ({ interface: { getEventTopic: () => `0x${'1'.repeat(64)}` } })),
}))

const POOL = '0x1111111111111111111111111111111111111111'
const FACTORY = '0x2222222222222222222222222222222222222222'
const NFT = '0x3333333333333333333333333333333333333333'
const REWARD = '0x4444444444444444444444444444444444444444'
const mockContract = Contract as unknown as jest.Mock
let poolCalls: Record<string, jest.Mock>
let provider: any

function collectionReadFailed() {
  const error: any = new Error('array ended')
  error.code = 'CALL_EXCEPTION'
  throw error
}

beforeEach(() => {
  poolCalls = {
    SMART_CHEF_FACTORY: jest.fn().mockResolvedValue(FACTORY),
    stakedToken: jest.fn().mockResolvedValue(NFT),
    rewardToken: jest.fn().mockResolvedValue(REWARD),
    startBlock: jest.fn().mockResolvedValue(BigNumber.from(100)),
    bonusEndBlock: jest.fn().mockResolvedValue(BigNumber.from(200)),
    rewardPerBlock: jest.fn().mockResolvedValue(BigNumber.from(5)),
    participantThreshold: jest.fn().mockResolvedValue(BigNumber.from(0)),
    poolCapacity: jest.fn().mockResolvedValue(BigNumber.from(0)),
    totalShares: jest.fn().mockResolvedValue(BigNumber.from(0)),
    poolLimitPerUser: jest.fn().mockResolvedValue(BigNumber.from(0)),
    numberBlocksForUserLimit: jest.fn().mockResolvedValue(BigNumber.from(0)),
    hasUserLimit: jest.fn().mockResolvedValue(false),
    userLimit: jest.fn().mockResolvedValue(false),
    performanceFee: jest.fn().mockResolvedValue(BigNumber.from(0)),
    feeTo: jest.fn().mockResolvedValue(FACTORY),
    isSideRewardActive: jest.fn().mockResolvedValue(false),
    communityCollections: jest.fn().mockImplementation(collectionReadFailed),
    sideRewardTokens: jest.fn().mockImplementation(collectionReadFailed),
    collectionWeights: jest.fn().mockResolvedValue(BigNumber.from(10)),
    rewardTokenDecimals: jest.fn().mockResolvedValue(BigNumber.from(18)),
  }
  mockContract.mockImplementation((address: string) => {
    if (address.toLowerCase() === POOL.toLowerCase()) return { callStatic: poolCalls }
    if (address.toLowerCase() === NFT.toLowerCase())
      return { callStatic: { supportsInterface: jest.fn().mockResolvedValue(true) } }
    if (address.toLowerCase() === REWARD.toLowerCase())
      return { callStatic: { decimals: jest.fn().mockResolvedValue(18), balanceOf: jest.fn().mockResolvedValue(0) } }
    throw new Error(`Unexpected contract ${address}`)
  })
  provider = {
    getBlockNumber: jest.fn().mockResolvedValue(777),
    getCode: jest.fn().mockResolvedValue('0x60006000'),
  }
})

afterEach(() => mockContract.mockReset())

it('admits a fully configured finished pool with zero threshold despite depleted rewards', async () => {
  const result = await readNftPoolPublicReadiness(provider as Provider, POOL, FACTORY, 777)

  expect(result).toEqual({ ready: true, checkedAtBlock: 777, reasons: [] })
  expect(poolCalls.startBlock).toHaveBeenCalledWith({ blockTag: 777 })
  expect(poolCalls.bonusEndBlock).toHaveBeenCalledWith({ blockTag: 777 })
  expect(provider.getCode).toHaveBeenCalledWith(POOL, 777)
  expect(provider.getCode).toHaveBeenCalledWith(FACTORY, 777)
  expect(provider.getBlockNumber).not.toHaveBeenCalled()
  expect(poolCalls).not.toHaveProperty('balanceOf')
})

it('fails closed when an on-chain collection weight is not positive', async () => {
  poolCalls.collectionWeights.mockResolvedValue(BigNumber.from(0))

  const result = await readNftPoolPublicReadiness(provider as Provider, POOL, FACTORY, 777)

  expect(result.ready).toBe(false)
  expect(result.reasons).toContain(
    'Every configured ERC-721 collection must have code, ERC-721 support, and positive on-chain weight.',
  )
})

it('marks transient RPC failures so the registry can retain its previous readiness result', async () => {
  provider.getCode.mockRejectedValue(Object.assign(new Error('connection reset'), { code: 'NETWORK_ERROR' }))

  const result = await readNftPoolPublicReadiness(provider as Provider, POOL, FACTORY, 777)

  expect(result.ready).toBe(false)
  expect(result.transient).toBe(true)
})

it('requires a fresh RPC log matching factory, pool, deployment block, and transaction hash', async () => {
  const hash = `0x${'5'.repeat(64)}`
  provider.getLogs = jest.fn().mockResolvedValue([
    {
      address: FACTORY,
      blockNumber: 88,
      transactionHash: hash,
      topics: [`0x${'1'.repeat(64)}`, `0x${POOL.slice(2).padStart(64, '0')}`],
    },
  ])

  await expect(verifyNftPoolFactoryEventAtBlock(provider, FACTORY, POOL, 88, hash)).resolves.toBe(true)
  await expect(verifyNftPoolFactoryEventAtBlock(provider, FACTORY, POOL, 89, hash)).resolves.toBe(false)
  await expect(
    verifyNftPoolFactoryEventAtBlock(provider, FACTORY, '0x9999999999999999999999999999999999999999', 88, hash),
  ).resolves.toBe(false)
  expect(provider.getLogs).toHaveBeenCalledWith({
    address: FACTORY,
    topics: [`0x${'1'.repeat(64)}`],
    fromBlock: 88,
    toBlock: 88,
  })
})
