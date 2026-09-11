import { BigNumber } from '@ethersproject/bignumber'
import { prepareNftLaunchSchedule, moveNftLaunchScheduleLater, DEFAULT_SETUP_BUFFER_SECONDS } from '../schedule'
import { NftPoolDeploymentPlan } from '../../types'

const plan = {
  scheduleIntent: {
    durationDays: 1,
    estimatedDurationBlocks: 39000,
    measuredSecondsPerBlock: 2.2,
    desiredStartMode: 'immediately-before-deployment',
  },
} as NftPoolDeploymentPlan

describe('NFT launch schedule', () => {
  it('calculates a fresh duration and a 15-minute setup buffer', () => {
    const schedule = prepareNftLaunchSchedule(plan, 1000, 2)
    expect(schedule.startBlock).toBe(1000 + DEFAULT_SETUP_BUFFER_SECONDS / 2)
    expect(schedule.endBlock - schedule.startBlock).toBe(43200)
    expect(schedule.planningEstimateBlocks).toBe(39000)
    expect(schedule.currentBlockAtPreparation).toBe(1000)
  })

  it('moves only the schedule later while preserving the final duration', () => {
    const original = prepareNftLaunchSchedule(plan, 1000, 2.2)
    const moved = moveNftLaunchScheduleLater(original, original.startBlock - 10, 2.2)
    expect(moved.startBlock).toBeGreaterThan(original.startBlock)
    expect(moved.endBlock - moved.startBlock).toBe(original.finalDurationBlocks)
    expect(BigNumber.from(moved.endBlock).gt(moved.startBlock)).toBe(true)
  })
})
