/** @jest-environment jsdom */
import { createNftPoolLaunchSession } from '../storage'
import {
  hasConfirmedDeployment,
  isLaunchWriteInFlight,
  nextNftLaunchStageAfterDeploy,
  nextNftLaunchStageAfterWeights,
  nextUnverifiedSetupStep,
  updateNftLaunchSession,
} from '../orchestrator'
import { NftPoolDeploymentPlan } from '../../types'

const plan = {
  draftId: 'draft',
  chainId: 137,
  factoryAddress: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258',
  factoryParameters: { intendedAdmin: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258' },
  collectionConfiguration: { collectionWeightConfigurationRequired: true },
  postDeploy: {},
} as NftPoolDeploymentPlan

describe('NFT launch state transitions', () => {
  beforeEach(() => window.localStorage.clear())
  it('does not treat a submitted deployment as complete without an address', () => {
    const session = createNftPoolLaunchSession(plan)
    const next = updateNftLaunchSession(session, {
      currentStage: 'DEPLOY_SUBMITTED',
      transactionHashes: { ...session.transactionHashes, deploy: '0xhash' },
    })
    expect(hasConfirmedDeployment(next)).toBe(false)
    expect(isLaunchWriteInFlight(next.currentStage)).toBe(true)
  })
  it('routes a confirmed deployment to mandatory weights before later steps', () => {
    const session = createNftPoolLaunchSession(plan)
    const verified = {
      passed: true,
      checkedAt: Date.now(),
      checks: [],
      fingerprint: '0xfingerprint',
    }
    expect(nextNftLaunchStageAfterDeploy({ ...session, verification: { deployment: verified } })).toBe(
      'WEIGHTS_REQUIRED',
    )
  })

  it('detects missing weight verification in a funding-stage session without a pending tx', () => {
    const session = createNftPoolLaunchSession(plan)
    expect(
      nextUnverifiedSetupStep({
        ...session,
        currentStage: 'FUNDING_REQUIRED',
        poolAddress: '0x00000000000000000000000000000000000000bb',
        verification: { deployment: { passed: true, checkedAt: Date.now(), checks: [] } },
      }),
    ).toBe('weights')
  })

  it('leaves an unresolved weight transaction to receipt reconciliation', () => {
    const session = createNftPoolLaunchSession(plan)
    expect(
      nextUnverifiedSetupStep({
        ...session,
        currentStage: 'FUNDING_REQUIRED',
        poolAddress: '0x00000000000000000000000000000000000000bb',
        transactionHashes: { ...session.transactionHashes, weights: '0xpending' },
      }),
    ).toBeNull()
  })

  it('does not repeat already verified fee setup after power verification', () => {
    const feePlan = {
      ...plan,
      postDeploy: { feeTo: '0x00000000000000000000000000000000000000aa', performanceFee: '100' },
    } as NftPoolDeploymentPlan
    const session = createNftPoolLaunchSession(feePlan)
    const verified = { passed: true, checkedAt: Date.now(), checks: [] }
    expect(
      nextNftLaunchStageAfterWeights({
        ...session,
        verification: { weights: verified, fee: verified },
      }),
    ).toBe('FUNDING_REQUIRED')
  })
})
