/** @jest-environment jsdom */
import { createNftPoolLaunchSession } from '../storage'
import {
  hasConfirmedDeployment,
  isLaunchWriteInFlight,
  nextNftLaunchStageAfterDeploy,
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
    expect(nextNftLaunchStageAfterDeploy(session)).toBe('WEIGHTS_REQUIRED')
  })
})
