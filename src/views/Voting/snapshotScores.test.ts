/** @jest-environment node */

import { fetchSnapshotScores } from './snapshotScores'

const strategies = [{ name: 'erc20-balance-of', params: {} }]
const addresses = ['0x0000000000000000000000000000000000000001']
const originalFetch = Object.getOwnPropertyDescriptor(globalThis, 'fetch')
const request = jest.fn()

beforeEach(() => {
  request.mockReset()
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: request })
})

afterAll(() => {
  if (originalFetch) Object.defineProperty(globalThis, 'fetch', originalFetch)
  else Reflect.deleteProperty(globalThis, 'fetch')
})

it('preserves the Snapshot score request and ordered strategy response', async () => {
  const scores = [{ [addresses[0]]: 0.25 }]
  request.mockResolvedValue({ ok: true, json: async () => ({ result: { scores } }) })

  await expect(fetchSnapshotScores('example.eth', strategies, '56', addresses, 100)).resolves.toEqual(scores)
  expect(request).toHaveBeenCalledWith('https://score.snapshot.org/api/scores', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ params: { space: 'example.eth', network: '56', snapshot: 100, strategies, addresses } }),
  })
})

it.each([
  { status: 502, body: {} },
  { status: 200, body: { result: { scores: [] } } },
  { status: 200, body: { result: { scores: [{ [addresses[0]]: null }] } } },
])('rejects a failed or malformed Snapshot response', async ({ status, body }) => {
  request.mockResolvedValue({ ok: status === 200, json: async () => body })
  await expect(fetchSnapshotScores('example.eth', strategies, '56', addresses, 100)).rejects.toThrow('Snapshot')
})
