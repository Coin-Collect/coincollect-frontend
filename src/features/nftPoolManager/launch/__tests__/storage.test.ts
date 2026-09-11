/** @jest-environment jsdom */
import {
  createNftPoolLaunchSession,
  findActiveNftPoolLaunchSession,
  loadNftPoolLaunchSession,
  saveNftPoolLaunchSession,
  clearNftPoolLaunchStorage,
} from '../storage'
import { NftPoolDeploymentPlan } from '../../types'

const plan = {
  draftId: 'draft-1',
  chainId: 137,
  factoryAddress: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258',
  factoryParameters: { intendedAdmin: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258' },
} as NftPoolDeploymentPlan

describe('NFT launch session persistence', () => {
  beforeEach(() => window.localStorage.clear())
  afterAll(() => clearNftPoolLaunchStorage())

  it('persists a plan snapshot and never a signer/provider object', () => {
    const session = createNftPoolLaunchSession(plan)
    saveNftPoolLaunchSession(session)
    const restored = loadNftPoolLaunchSession(session.sessionId)
    expect(restored?.planHash).toMatch(/^0x[0-9a-f]{64}$/)
    expect(JSON.stringify(restored)).not.toContain('signer')
    expect(JSON.stringify(restored)).not.toContain('privateKey')
  })

  it('finds an incomplete session by draft and removes it from the active set after completion', () => {
    const session = createNftPoolLaunchSession(plan)
    saveNftPoolLaunchSession(session)
    expect(findActiveNftPoolLaunchSession('draft-1')?.sessionId).toBe(session.sessionId)
    saveNftPoolLaunchSession({ ...session, currentStage: 'COMPLETE' })
    expect(findActiveNftPoolLaunchSession('draft-1')).toBeUndefined()
  })

  it('marks a session corrupted when the frozen plan is changed in localStorage', () => {
    const session = createNftPoolLaunchSession(plan)
    saveNftPoolLaunchSession(session)
    const raw = JSON.parse(window.localStorage.getItem('coincollect.nft-pool-launch-sessions.v1') || '[]')
    raw[0].plan.factoryParameters.intendedAdmin = '0x00000000000000000000000000000000000000aa'
    window.localStorage.setItem('coincollect.nft-pool-launch-sessions.v1', JSON.stringify(raw))
    const restored = loadNftPoolLaunchSession(session.sessionId)
    expect(restored?.currentStage).toBe('CORRUPTED')
    expect(restored?.retryable).toBe(false)
    expect(restored?.error).toContain('integrity')
  })
})
