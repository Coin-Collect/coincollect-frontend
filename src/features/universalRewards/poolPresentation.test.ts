import {
  emptyV3PresentationDocument,
  localPresentationMessage,
  parseV3PoolId,
  presentationRevision,
  validateV3PresentationDocument,
  withV3Presentation,
} from './poolPresentation'
import type { V3Deployment } from './runtime'

const deployment = {
  chainId: 137,
  address: '0x1111111111111111111111111111111111111111',
  runtimeHash: `0x${'1'.repeat(64)}`,
} as V3Deployment
const empty = emptyV3PresentationDocument(deployment)

test('overrides presentation on the named pool while preserving the ledger state', () => {
  const pool = {
    poolId: BigInt(1),
    funding: { paused: true },
    presentation: { name: 'Original', description: 'Original' },
  }
  const document = validateV3PresentationDocument(
    {
      ...empty,
      pools: [
        { poolId: '1', name: ' New name ', description: '', artwork: '/images/hero.webp', funding: { paused: false } },
      ],
    },
    deployment,
  )
  const updated = withV3Presentation(pool, document)
  expect(updated.presentation).toEqual({ name: 'New name', description: '', artwork: '/images/hero.webp' })
  expect(updated.funding).toBe(pool.funding)
  expect(withV3Presentation({ ...pool, poolId: BigInt(2) }, document).presentation).toEqual(pool.presentation)
})

test('rejects another deployment, duplicate pool IDs, invalid IDs and unsafe artwork', () => {
  const row = { poolId: '1', name: 'Pool', description: '' }
  expect(() => validateV3PresentationDocument({ ...empty, chainId: 31337 }, deployment)).toThrow()
  expect(() => validateV3PresentationDocument({ ...empty, pools: [row, row] }, deployment)).toThrow()
  expect(() =>
    validateV3PresentationDocument({ ...empty, pools: [{ ...row, artwork: '//bad.invalid/img.png' }] }, deployment),
  ).toThrow()
  expect(parseV3PoolId('0')).toBeUndefined()
  expect(parseV3PoolId('9'.repeat(78))).toBeUndefined()
})

test('the local signature message binds the deployment, pool, revision and edited fields', () => {
  const record = { poolId: '1', name: 'Pool', description: '' }
  const message = localPresentationMessage(deployment, record, 'initial', 123)
  expect(message).not.toBe(localPresentationMessage(deployment, { ...record, poolId: '2' }, 'initial', 123))
  expect(message).not.toBe(localPresentationMessage(deployment, { ...record, name: 'Changed' }, 'initial', 123))
  expect(message).not.toBe(localPresentationMessage(deployment, record, presentationRevision(record), 123))
  expect(message).not.toBe(localPresentationMessage({ ...deployment, chainId: 31337 }, record, 'initial', 123))
})
