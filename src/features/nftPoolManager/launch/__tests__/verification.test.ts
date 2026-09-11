import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { verifyDeployedNftPool, verifyNftCollectionWeights } from '../verification'
import { NftPoolDeploymentPlan } from '../../types'
import { NftLaunchSchedule } from '../types'

jest.mock('@ethersproject/contracts', () => ({ Contract: jest.fn() }))
const MockContract = Contract as unknown as jest.Mock
const factory = '0xa7983F8B45860626398b391E9Bb71416A26349D4'
const owner = '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258'
const staked = '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148'
const reward = '0x8c1245BA1714BD7a61A34Cb63b95331Fa3db497C'
const poolAddress = '0x00000000000000000000000000000000000000bb'
const side = '0x1111111111111111111111111111111111111111'
const plan = {
  factoryAddress: factory,
  factoryParameters: {
    intendedAdmin: owner,
    stakedTokenAddress: staked,
    rewardTokenAddress: reward,
    sideRewardTokens: [side],
    sideRewardPercentages: ['10'],
    rewardPerBlock: '100',
    poolLimitPerUser: '0',
    numberBlocksForUserLimit: '0',
    poolCapacity: '100',
    participantThreshold: '1',
  },
  collectionConfiguration: {
    primaryCollection: staked,
    communityCollections: [],
    collectionWeights: ['1'],
    setCollectionWeightsArguments: { communityNftAddresses: [], weights: [], stakedTokenWeight: '1' },
  },
} as unknown as NftPoolDeploymentPlan
const schedule: NftLaunchSchedule = {
  planningEstimateBlocks: 1,
  finalDurationBlocks: 2,
  setupBufferBlocks: 3,
  bufferSeconds: 10,
  measuredSecondsPerBlock: 2,
  currentBlockAtPreparation: 1,
  startBlock: 10,
  endBlock: 12,
  preparedAt: 1,
}

function poolFake(overrides: Record<string, any> = {}) {
  return {
    SMART_CHEF_FACTORY: jest.fn().mockResolvedValue(factory),
    owner: jest.fn().mockResolvedValue(owner),
    stakedToken: jest.fn().mockResolvedValue(staked),
    rewardToken: jest.fn().mockResolvedValue(reward),
    sideRewardTokens: jest
      .fn()
      .mockImplementation((index: number) =>
        index === 0 ? Promise.resolve(side) : Promise.reject(new Error('out of bounds')),
      ),
    isSideRewardActive: jest.fn().mockResolvedValue(true),
    rewardPerBlock: jest.fn().mockResolvedValue(BigNumber.from(100)),
    startBlock: jest.fn().mockResolvedValue(BigNumber.from(10)),
    bonusEndBlock: jest.fn().mockResolvedValue(BigNumber.from(12)),
    poolLimitPerUser: jest.fn().mockResolvedValue(BigNumber.from(0)),
    numberBlocksForUserLimit: jest.fn().mockResolvedValue(BigNumber.from(0)),
    poolCapacity: jest.fn().mockResolvedValue(BigNumber.from(100)),
    participantThreshold: jest.fn().mockResolvedValue(BigNumber.from(1)),
    sideRewardPercentage: jest.fn().mockResolvedValue(BigNumber.from(10)),
    communityCollections: jest.fn().mockRejectedValue(new Error('empty')),
    collectionWeights: jest.fn().mockResolvedValue(BigNumber.from(1)),
    ...overrides,
  }
}

describe('NFT launch verification', () => {
  beforeEach(() => MockContract.mockReset())
  it('passes exact deployment read-back and fails a field mismatch', async () => {
    const pool = poolFake()
    MockContract.mockImplementation(() => pool)
    const provider: any = { getCode: jest.fn().mockResolvedValue('0x6000') }
    expect((await verifyDeployedNftPool(provider, plan, schedule, poolAddress)).passed).toBe(true)
    pool.rewardPerBlock.mockResolvedValue(BigNumber.from(101))
    expect((await verifyDeployedNftPool(provider, plan, schedule, poolAddress)).checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'reward-per-block', status: 'BLOCK' })]),
    )
  })

  it('verifies collection order and primary power', async () => {
    const pool = poolFake()
    MockContract.mockImplementation(() => pool)
    const result = await verifyNftCollectionWeights({} as any, plan, poolAddress)
    expect(result.passed).toBe(true)
  })
})
