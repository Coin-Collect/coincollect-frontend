/** @jest-environment node */
import type { NextApiRequest, NextApiResponse } from 'next'
import handler from '../pages/api/rpc/polygon'

const call = { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }
const result = { jsonrpc: '2.0', id: 1, result: '0x89' }
const originalFetch = global.fetch
const fetchMock = jest.fn()

function response() {
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  return res
}

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
})

afterAll(() => {
  global.fetch = originalFetch
})

async function send(body: unknown, method = 'POST') {
  const res = response()
  await handler({ method, body } as NextApiRequest, res as unknown as NextApiResponse)
  return res
}

it('forwards a read and returns a JSON result', async () => {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => result })
  const res = await send(call)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ body: JSON.stringify(call), redirect: 'error' })
  expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.json).toHaveBeenCalledWith(result)
})

it('returns correlated batch results and preserves an RPC error', async () => {
  const otherCall = { ...call, id: 'block', method: 'eth_blockNumber' }
  const batch = [{ jsonrpc: '2.0', id: 'block', error: { code: -32000, message: 'Unavailable' } }, result]
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => batch })
  const res = await send([call, otherCall])
  expect(res.status).toHaveBeenCalledWith(200)
  expect(res.json).toHaveBeenCalledWith(batch)
})

it.each<unknown[]>([
  { ...call, method: 'unsupported_rpc_method' },
  [call, { ...call, id: 2, method: 'unsupported_rpc_method' }],
  [call, call],
  Array.from({ length: 51 }, (_, id) => ({ ...call, id })),
  { ...call, params: { block: 'latest' } },
  { ...call, id: null },
  [],
  'not JSON',
].map((body) => [body]))('rejects invalid requests before contacting an upstream', async (body) => {
  const res = await send(body)
  expect(res.status).toHaveBeenCalledWith(400)
  expect(fetchMock).not.toHaveBeenCalled()
})

it('does not send a response belonging to a different request', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ...result, id: 2 }) })
  const res = await send(call)
  expect(res.status).toHaveBeenCalledWith(502)
  expect(res.json).toHaveBeenCalledWith({ error: 'Polygon RPC returned an invalid JSON-RPC response.' })
})

it('accepts only POST', async () => {
  const res = await send(call, 'GET')
  expect(res.setHeader).toHaveBeenCalledWith('Allow', 'POST')
  expect(res.status).toHaveBeenCalledWith(405)
  expect(fetchMock).not.toHaveBeenCalled()
})
