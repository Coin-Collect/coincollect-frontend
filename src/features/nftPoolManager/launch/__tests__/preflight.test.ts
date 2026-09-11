import { BigNumber } from '@ethersproject/bignumber'
import { Contract } from '@ethersproject/contracts'
import { runNftPoolPreflight } from '../preflight'
import { NftPoolDeploymentPlan } from '../../types'

jest.mock('@ethersproject/contracts', () => ({ Contract: jest.fn() }))

const factoryAddress = '0xa7983F8B45860626398b391E9Bb71416A26349D4'
const owner = '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258'
const staked = '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148'
const reward = '0x8c1245BA1714BD7a61A34Cb63b95331Fa3db497C'
const side = '0x1111111111111111111111111111111111111111'
const plan = {
  draftId: 'draft',
  chainId: 137,
  factoryAddress,
  scheduleIntent: {
    durationDays: 1,
    estimatedDurationBlocks: 39000,
    measuredSecondsPerBlock: 2.2,
    desiredStartMode: 'immediately-before-deployment',
  },
  factoryParameters: {
    stakedTokenAddress: staked,
    rewardTokenAddress: reward,
    sideRewardTokens: [side],
    sideRewardPercentages: ['10'],
    rewardPerBlock: '100',
    poolLimitPerUser: '0',
    numberBlocksForUserLimit: '0',
    poolCapacity: '100',
    participantThreshold: '1',
    intendedAdmin: owner,
  },
  collectionConfiguration: {
    primaryCollection: staked,
    communityCollections: [],
    collectionWeights: ['1'],
    setCollectionWeightsArguments: { communityNftAddresses: [], weights: [], stakedTokenWeight: '1' },
    collectionWeightConfigurationRequired: false,
  },
  fundingRequirements: {
    primary: {
      tokenAddress: reward,
      desiredAmount: '100',
      maximumScheduledFunding: '100',
      residual: '0',
      source: 'manual',
    },
    side: [
      {
        tokenAddress: side,
        desiredAmount: '10',
        encodedPercentage: '10',
        maximumImpliedSideFunding: '10',
        deviationFromDesired: '0',
        deviationBps: '0',
        representability: 'EXACT',
        source: 'manual',
      },
    ],
    budget: { tokenAddress: reward, amount: '1', allocations: [], roundingRemainder: '0' },
  },
  quotes: { budgetTokenAddress: reward, totalBudget: '1', rewards: [] },
  postDeploy: {},
  readiness: { status: 'READY_FOR_DRY_RUN', blockers: [], warnings: [], information: [] },
} as NftPoolDeploymentPlan
const MockContract = Contract as unknown as jest.Mock

function setupContracts(balance = BigNumber.from(1000)) {
  const factory = {
    owner: jest.fn().mockResolvedValue(owner),
    callStatic: { deployPool: jest.fn().mockResolvedValue(undefined) },
    estimateGas: { deployPool: jest.fn().mockResolvedValue(BigNumber.from(100000)) },
  }
  const token = { decimals: jest.fn().mockResolvedValue(18), balanceOf: jest.fn().mockResolvedValue(balance) }
  MockContract.mockImplementation((address: string) =>
    address.toLowerCase() === factoryAddress.toLowerCase() ? factory : token,
  )
  return { factory, token }
}

function provider(chainId = 137, balance = BigNumber.from('1000000000000000000')): any {
  return {
    getNetwork: jest.fn().mockResolvedValue({ chainId }),
    getBlockNumber: jest.fn().mockResolvedValue(1000),
    getBlock: jest.fn().mockImplementation((block: number) => Promise.resolve({ timestamp: block * 2 })),
    getCode: jest
      .fn()
      .mockImplementation((address: string) =>
        Promise.resolve(address.toLowerCase() === factoryAddress.toLowerCase() ? '0x6000' : '0x'),
      ),
    getBalance: jest.fn().mockResolvedValue(balance),
    getFeeData: jest.fn().mockResolvedValue({ gasPrice: BigNumber.from(1) }),
  }
}

describe('NFT launch preflight', () => {
  beforeEach(() => {
    MockContract.mockReset()
  })

  it('passes EOA owner, fresh schedule, balance and simulation checks without a write', async () => {
    const { factory } = setupContracts()
    const result = await runNftPoolPreflight({
      provider: provider(),
      signer: { getAddress: jest.fn().mockResolvedValue(owner) } as any,
      plan,
      account: owner,
    })
    expect(result.ok).toBe(true)
    expect(result.schedule.startBlock).toBeGreaterThan(1000)
    expect(result.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'deployment-simulation', status: 'PASS' })]),
    )
    expect(factory.callStatic.deployPool).toHaveBeenCalledTimes(1)
    expect((factory as any).deployPool).toBeUndefined()
  })

  it('blocks wrong network, unauthorized owner and insufficient token balance', async () => {
    setupContracts(BigNumber.from(0))
    const wrongNetwork = await runNftPoolPreflight({
      provider: provider(1),
      signer: { getAddress: jest.fn().mockResolvedValue(owner) } as any,
      plan,
      account: owner,
    })
    expect(wrongNetwork.ok).toBe(false)
    expect(wrongNetwork.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'chain', status: 'BLOCK' })]),
    )
    const unauthorized = await runNftPoolPreflight({
      provider: provider(),
      signer: { getAddress: jest.fn().mockResolvedValue('0x00000000000000000000000000000000000000aa') } as any,
      plan,
      account: '0x00000000000000000000000000000000000000aa',
    })
    expect(unauthorized.ok).toBe(false)
    expect(unauthorized.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'admin-account', status: 'BLOCK' })]),
    )
    const poor = await runNftPoolPreflight({
      provider: provider(),
      signer: { getAddress: jest.fn().mockResolvedValue(owner) } as any,
      plan,
      account: owner,
    })
    expect(poor.ok).toBe(false)
    expect(poor.checks).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'token-balance-0', status: 'BLOCK' })]),
    )
  })
})
