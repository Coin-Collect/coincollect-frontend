import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import { verifyMessage } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import handler from 'pages/api/v3/presentation'
import {
  emptyV3PresentationDocument,
  localPresentationMessage,
  parseV3PoolId,
  presentationRevision,
  validateV3PresentationDocument,
  withV3Presentation,
} from './poolPresentation'
import { createV3Client, getV3Deployment, type V3Deployment } from './runtime'

jest.mock('./runtime', () => ({
  createV3Client: jest.fn(),
  getV3Deployment: jest.fn(),
  validateV3Deployment: jest.fn(),
}))

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
  expect(localPresentationMessage(deployment, { ...record, poolType: 'partner' }, 'initial', 123)).not.toBe(
    localPresentationMessage(deployment, { ...record, poolType: 'community' }, 'initial', 123),
  )
})

test('uses an explicit presentation type and preserves the creation type for older overrides', () => {
  const pool = {
    poolId: BigInt(1),
    presentation: { name: 'Pool', description: '', poolType: 'partner' as const },
  }
  const row = { poolId: '1', name: 'Updated pool', description: '' }
  const documentWith = (fields: object) =>
    validateV3PresentationDocument({ ...empty, pools: [{ ...row, ...fields }] }, deployment)
  expect(withV3Presentation(pool, documentWith({})).presentation.poolType).toBe('partner')
  expect(withV3Presentation(pool, documentWith({ poolType: 'community' })).presentation.poolType).toBe('community')
  expect(() => documentWith({ poolType: 'official' })).toThrow('Choose Community or Partner.')
})

test('persists an operator-signed badge and rejects a tampered category', async () => {
  const local = { ...deployment, chainId: 31337 }
  const operator = privateKeyToAccount(`0x${randomBytes(32).toString('hex')}`)
  const getDeployment = getV3Deployment as jest.MockedFunction<typeof getV3Deployment>
  const createClient = createV3Client as jest.MockedFunction<typeof createV3Client>
  getDeployment.mockReturnValue(local)
  createClient.mockReturnValue({
    getBlockNumber: async () => BigInt(20),
    readContract: async ({ functionName }: { functionName: string }) =>
      functionName === 'admin' ? operator.address : BigInt(1),
    verifyMessage,
  } as unknown as ReturnType<typeof createV3Client>)
  const folder = mkdtempSync(join(tmpdir(), 'coincollect-pool-type-'))
  const cwd = jest.spyOn(process, 'cwd').mockReturnValue(folder)
  const request = async (method: string, body?: object) => {
    const req = { method, body, headers: { host: '127.0.0.1:3028' } } as NextApiRequest
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() }
    await handler(req, res as unknown as NextApiResponse)
    return res
  }

  try {
    const record = { poolId: '1', name: 'Pool', description: '', poolType: 'partner' as const }
    const issuedAt = Date.now()
    const revision = 'initial'
    const signature = await operator.signMessage({
      message: localPresentationMessage(local, record, revision, issuedAt),
    })
    const payload = { poolId: record.poolId, issuedAt, revision, signature }
    const denied = await request('POST', { ...payload, presentation: { ...record, poolType: 'community' } })
    expect(denied.status).toHaveBeenCalledWith(403)
    const saved = await request('POST', { ...payload, presentation: record })
    expect(saved.json).toHaveBeenCalledWith({ ...emptyV3PresentationDocument(local), pools: [record] })
    const published = await request('GET')
    expect(published.json).toHaveBeenCalledWith({ ...emptyV3PresentationDocument(local), pools: [record] })
  } finally {
    cwd.mockRestore()
    rmSync(folder, { recursive: true, force: true })
  }
})
