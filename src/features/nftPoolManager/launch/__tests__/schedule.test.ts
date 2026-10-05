import { BigNumber } from '@ethersproject/bignumber'
import {
  prepareNftLaunchSchedule,
  moveNftLaunchScheduleLater,
  DEFAULT_SETUP_BUFFER_SECONDS,
  isSetupWindowSafe,
  plannedNftLaunchWriteCount,
  remainingNftLaunchSetupWriteCount,
} from '../schedule'
import { NftPoolDeploymentPlan } from '../../types'
import { NftPoolLaunchSession } from '../types'

const plan = (overrides: Record<string, any> = {}) =>
  ({
    scheduleIntent: {
      durationDays: 1,
      estimatedDurationBlocks: 39000,
      measuredSecondsPerBlock: 2.2,
      desiredStartMode: 'immediately-before-deployment',
    },
    collectionConfiguration: { collectionWeightConfigurationRequired: false },
    postDeploy: {},
    fundingRequirements: {
      primary: { maximumScheduledFunding: '100' },
      side: [],
    },
    ...overrides,
  } as unknown as NftPoolDeploymentPlan)

describe('NFT launch schedule', () => {
  it('preserves funded duration and calculates a fresh 15-minute setup buffer', () => {
    const schedule = prepareNftLaunchSchedule(plan(), 1000, 2)
    // Deployment + primary funding each consume a confirmed block.
    expect(schedule.startBlock).toBe(1000 + DEFAULT_SETUP_BUFFER_SECONDS / 2 + 2)
    expect(schedule.setupBufferBlocks).toBe(DEFAULT_SETUP_BUFFER_SECONDS / 2 + 2)
    expect(schedule.endBlock - schedule.startBlock).toBe(39000)
    expect(schedule.planningEstimateBlocks).toBe(39000)
    expect(schedule.currentBlockAtPreparation).toBe(1000)
  })

  it('moves only the schedule later while preserving the final duration', () => {
    const original = prepareNftLaunchSchedule(plan(), 1000, 2.2)
    const moved = moveNftLaunchScheduleLater(original, original.startBlock - 10, 2.2)
    expect(moved.startBlock).toBeGreaterThan(original.startBlock)
    expect(moved.endBlock - moved.startBlock).toBe(original.finalDurationBlocks)
    expect(BigNumber.from(moved.endBlock).gt(moved.startBlock)).toBe(true)
  })

  it('reserves one block for each deployment, configuration and positive reward transfer', () => {
    const configuredPlan = plan({
      collectionConfiguration: { collectionWeightConfigurationRequired: true },
      postDeploy: { feeTo: '0x0000000000000000000000000000000000000001', performanceFee: '1' },
      fundingRequirements: {
        primary: { maximumScheduledFunding: '100' },
        side: [{ maximumImpliedSideFunding: '20' }, { maximumImpliedSideFunding: '0' }],
      },
    })

    expect(plannedNftLaunchWriteCount(configuredPlan)).toBe(5)
    const schedule = prepareNftLaunchSchedule(configuredPlan, 1000, 15)
    expect(schedule.setupBufferBlocks).toBe(60 + 5)
    expect(isSetupWindowSafe(1000 + 5, schedule.startBlock, 15)).toBe(true)
  })

  it('keeps the full safety window after moving start and mining every outstanding setup write', () => {
    const launchPlan = plan({
      collectionConfiguration: { collectionWeightConfigurationRequired: true },
      fundingRequirements: {
        primary: { maximumScheduledFunding: '100' },
        side: [{ tokenAddress: '0x0000000000000000000000000000000000000002', maximumImpliedSideFunding: '20' }],
      },
    })
    const session = {
      plan: launchPlan,
      verification: {},
      funding: { side: {} },
    } as unknown as NftPoolLaunchSession
    const remainingSetupWrites = remainingNftLaunchSetupWriteCount(session)
    expect(remainingSetupWrites).toBe(3)

    const original = prepareNftLaunchSchedule(launchPlan, 1000, 15)
    const currentBlock = 2000
    const moveUpdateWrites = 1 + remainingSetupWrites
    const moved = moveNftLaunchScheduleLater(original, currentBlock, 15, DEFAULT_SETUP_BUFFER_SECONDS, moveUpdateWrites)

    // Schedule update + weights + primary + side funding are all mined.
    expect(isSetupWindowSafe(currentBlock + moveUpdateWrites, moved.startBlock, 15)).toBe(true)
    expect(moved.startBlock - (currentBlock + moveUpdateWrites)).toBe(60)
  })

  it('does not reserve writes that the session already verified', () => {
    const session = {
      plan: plan({
        collectionConfiguration: { collectionWeightConfigurationRequired: true },
        postDeploy: { feeTo: '0x0000000000000000000000000000000000000001', performanceFee: '1' },
        fundingRequirements: {
          primary: { maximumScheduledFunding: '100' },
          side: [{ tokenAddress: '0x0000000000000000000000000000000000000002', maximumImpliedSideFunding: '20' }],
        },
      }),
      verification: { weights: { passed: true }, fee: { passed: true } },
      funding: {
        primary: { status: 'VERIFIED' },
        side: { '0x0000000000000000000000000000000000000002': { status: 'SKIPPED' } },
      },
    } as unknown as NftPoolLaunchSession

    expect(remainingNftLaunchSetupWriteCount(session)).toBe(0)
  })
})
