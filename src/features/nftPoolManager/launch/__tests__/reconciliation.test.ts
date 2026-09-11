/** @jest-environment jsdom */
import { createNftPoolLaunchSession } from '../storage'
import { advanceLaunchStage, nextPendingLaunchOperation, reconcileTransaction } from '../reconciliation'
import { NftPoolDeploymentPlan } from '../../types'

const plan = {
  draftId: 'reconciliation-draft',
  chainId: 137,
  factoryAddress: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258',
  factoryParameters: { intendedAdmin: '0x8fC2e77C47D5D9fDe1ff35098d6e22EB6F9e8258' },
} as NftPoolDeploymentPlan

describe('NFT launch reconciliation', () => {
  beforeEach(() => window.localStorage.clear())

  it('dispatches later unresolved writes before an old deployment hash', () => {
    const session = createNftPoolLaunchSession(plan)
    expect(
      nextPendingLaunchOperation({
        ...session,
        poolAddress: '0x00000000000000000000000000000000000000aa',
        transactionHashes: { ...session.transactionHashes, deploy: '0xold', weights: '0xweights', fee: '0xfee' },
        currentStage: 'FEE_SUBMITTED',
      }),
    ).toBe('weights')
    expect(
      nextPendingLaunchOperation({
        ...session,
        poolAddress: '0x00000000000000000000000000000000000000aa',
        transactionHashes: { ...session.transactionHashes, deploy: '0xold', fee: '0xfee' },
        currentStage: 'FEE_SUBMITTED',
      }),
    ).toBe('fee')
  })

  it('only considers an unresolved deploy when no later operation is pending', () => {
    const session = createNftPoolLaunchSession(plan)
    expect(
      nextPendingLaunchOperation({
        ...session,
        transactionHashes: { ...session.transactionHashes, deploy: '0xdeploy' },
        currentStage: 'DEPLOY_SUBMITTED',
      }),
    ).toBe('deploy')
    expect(nextPendingLaunchOperation(session)).toBeNull()
  })

  it('never lets a late deploy read move a session backwards', () => {
    const session = createNftPoolLaunchSession(plan)
    expect(advanceLaunchStage({ ...session, currentStage: 'FUNDING_REQUIRED' }, 'DEPLOY_CONFIRMED')).toBe(
      'FUNDING_REQUIRED',
    )
    expect(advanceLaunchStage({ ...session, currentStage: 'DEPLOY_SUBMITTED' }, 'DEPLOY_CONFIRMED')).toBe(
      'DEPLOY_CONFIRMED',
    )
  })

  it('keeps the effective replacement hash from a confirmed receipt', async () => {
    const provider = {
      getTransactionReceipt: jest.fn().mockResolvedValue({ status: 1, transactionHash: '0xreplacement' }),
    }
    await expect(reconcileTransaction(provider as any, '0xoriginal')).resolves.toEqual({
      state: 'CONFIRMED',
      hash: '0xreplacement',
      receipt: { status: 1, transactionHash: '0xreplacement' },
    })
  })
})
