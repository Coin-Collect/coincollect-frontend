/** @jest-environment jsdom */
import { createNftPoolLaunchSession } from '../storage'
import { expectedNftLaunchPoolFingerprint } from '../fingerprint'
import { canConfigureWeights, canDeploy, canFund, validateLaunchSessionInvariant } from '../orchestrator'
import { NftPoolDeploymentPlan } from '../../types'
import { NftLaunchPoolSnapshot, NftLaunchSchedule } from '../types'

const operator = '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258'
const factory = '0xa7983F8B45860626398b391E9Bb71416A26349D4'
const staked = '0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148'
const reward = '0x8c1245BA1714BD7a61A34Cb63b95331Fa3db497C'
const pool = '0x00000000000000000000000000000000000000bb'

const plan = {
  draftId: 'draft-guard',
  chainId: 137,
  factoryAddress: factory,
  scheduleIntent: {
    durationDays: 1,
    estimatedDurationBlocks: 39000,
    measuredSecondsPerBlock: 2.2,
    desiredStartMode: 'immediately-before-deployment',
  },
  factoryParameters: {
    stakedTokenAddress: staked,
    rewardTokenAddress: reward,
    sideRewardTokens: [],
    sideRewardPercentages: [],
    rewardPerBlock: '100',
    poolLimitPerUser: '0',
    numberBlocksForUserLimit: '0',
    poolCapacity: '100',
    participantThreshold: '1',
    intendedAdmin: operator,
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
    side: [],
    budget: { tokenAddress: reward, amount: '1', allocations: [], roundingRemainder: '0' },
  },
  quotes: { budgetTokenAddress: reward, totalBudget: '1', rewards: [] },
  postDeploy: {},
  readiness: { status: 'READY_FOR_DRY_RUN', blockers: [], warnings: [], information: [] },
} as NftPoolDeploymentPlan

const schedule: NftLaunchSchedule = {
  planningEstimateBlocks: 39000,
  finalDurationBlocks: 43200,
  setupBufferBlocks: 300,
  bufferSeconds: 900,
  measuredSecondsPerBlock: 2.2,
  currentBlockAtPreparation: 1000,
  startBlock: 1300,
  endBlock: 44500,
  preparedAt: 123,
}

function snapshot(overrides: Partial<NftLaunchPoolSnapshot> = {}): NftLaunchPoolSnapshot {
  return {
    chainId: 137,
    currentBlock: 1000,
    account: operator,
    factoryAddress: factory,
    factoryOwner: operator,
    factoryCode: '0x6000',
    ...overrides,
  }
}

describe('NFT launch safety gates', () => {
  beforeEach(() => window.localStorage.clear())

  it('requires a fresh preflight and blocks when its setup window is stale', () => {
    const session = createNftPoolLaunchSession(plan)
    const ready = {
      ...session,
      currentStage: 'PREFLIGHT_READY' as const,
      schedule,
      preflight: {
        ok: true,
        checkedAt: 123,
        chainId: 137,
        currentBlock: 1000,
        currentBlockAtPreflight: 1000,
        expiresAtBlock: 1030,
        schedulePreparedAt: schedule.preparedAt,
        account: operator,
        ownerIsContract: false,
        schedule,
        checks: [],
        nativeBalance: '1',
        tokenBalances: [],
      },
    }
    expect(canDeploy(ready, snapshot()).allowed).toBe(true)
    expect(canDeploy(ready, snapshot({ currentBlock: 1031 })).reasons).toContain('Preflight expired — run again.')
  })

  it('blocks post-deploy writes until deployment verification and fingerprint pass', () => {
    const session = createNftPoolLaunchSession({
      ...plan,
      collectionConfiguration: { ...plan.collectionConfiguration, collectionWeightConfigurationRequired: true },
    })
    const postPlan = session.plan
    const expectedFingerprint = expectedNftLaunchPoolFingerprint(postPlan, schedule)
    const base = {
      ...session,
      currentStage: 'WEIGHTS_REQUIRED' as const,
      schedule,
      poolAddress: pool,
      transactionHashes: { ...session.transactionHashes, deploy: '0xdeploy' },
      verification: {
        deployment: { passed: true, checkedAt: 123, checks: [], fingerprint: expectedFingerprint },
      },
      poolFingerprint: expectedFingerprint,
    }
    const chain = snapshot({
      poolAddress: pool,
      poolCode: '0x6000',
      owner: operator,
      stakedToken: staked,
      rewardToken: reward,
      sideRewardTokens: [],
      sideRewardPercentages: [],
      sideRewardActive: false,
      rewardPerBlock: '100',
      startBlock: 1300,
      endBlock: 44500,
      poolLimitPerUser: '0',
      numberBlocksForUserLimit: 0,
      poolCapacity: '100',
      participantThreshold: '1',
      fingerprint: expectedFingerprint,
    })
    expect(canConfigureWeights(base, chain).allowed).toBe(true)
    expect(canConfigureWeights({ ...base, currentStage: 'DEPLOY_CONFIRMED' }, chain).allowed).toBe(false)
    expect(canConfigureWeights(base, { ...chain, fingerprint: '0xwrong' }).allowed).toBe(false)
    expect(canConfigureWeights({ ...base, pendingSchedule: schedule }, chain).reasons).toContain(
      'A schedule update is awaiting confirmation and exact on-chain read-back.',
    )
  })

  it('blocks funding if the pool reward mapping differs from the frozen token', () => {
    const session = createNftPoolLaunchSession(plan)
    const expectedFingerprint = expectedNftLaunchPoolFingerprint(plan, schedule)
    const fundingSession = {
      ...session,
      currentStage: 'FUNDING_REQUIRED' as const,
      schedule,
      poolAddress: pool,
      transactionHashes: { ...session.transactionHashes, deploy: '0xdeploy' },
      verification: { deployment: { passed: true, checkedAt: 123, checks: [], fingerprint: expectedFingerprint } },
      poolFingerprint: expectedFingerprint,
    }
    const result = canFund(
      fundingSession,
      snapshot({
        poolAddress: pool,
        poolCode: '0x6000',
        owner: operator,
        stakedToken: staked,
        rewardToken: '0x00000000000000000000000000000000000000cc',
        sideRewardTokens: [],
        sideRewardPercentages: [],
        fingerprint: expectedFingerprint,
        startBlock: 1300,
      }),
    )
    expect(result.allowed).toBe(false)
    expect(result.reasons).toContain('Primary funding token does not match pool.rewardToken().')
  })

  it('rejects a COMPLETE session without all confirmed read-backs', () => {
    const session = createNftPoolLaunchSession(plan)
    const errors = validateLaunchSessionInvariant({ ...session, currentStage: 'COMPLETE' })
    expect(errors).toEqual(
      expect.arrayContaining(['Deployment verification is not confirmed.', 'Final verification is not confirmed.']),
    )
  })
})
