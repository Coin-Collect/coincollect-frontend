import { launchStageAttentionPriority, launchStageLabel } from '../presentation'
import { LaunchStage } from '../types'

describe('NFT launch stage presentation', () => {
  it.each([
    ['CORRUPTED', 'Session integrity check failed'],
    ['FAILED', 'Launch failed'],
    ['FUNDING_REQUIRED', 'Funding required'],
    ['AWAITING_DEPLOY_SIGNATURE', 'Wallet approval needed'],
  ] as Array<[LaunchStage, string]>)('maps %s to readable operator copy', (stage, label) => {
    expect(launchStageLabel(stage)).toBe(label)
  })

  it('prioritizes blocked sessions before wallet actions and setup work', () => {
    expect(launchStageAttentionPriority('CORRUPTED')).toBe(0)
    expect(launchStageAttentionPriority('PREFLIGHT_FAILED')).toBe(0)
    expect(launchStageAttentionPriority('AWAITING_DEPLOY_SIGNATURE')).toBe(1)
    expect(launchStageAttentionPriority('FUNDING_REQUIRED')).toBe(2)
    expect(launchStageAttentionPriority('DEPLOY_CONFIRMING')).toBe(3)
  })

  it('excludes completed sessions from operator attention', () => {
    expect(launchStageAttentionPriority('COMPLETE')).toBeNull()
  })
})
