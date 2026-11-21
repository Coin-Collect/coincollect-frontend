import type { NextApiRequest, NextApiResponse } from 'next'
import { getLocalForkRpcUrl, isLocalForkMode } from 'config/localFork'

const UPSTREAM_TIMEOUT_MS = 8_000
const MAX_BATCH_SIZE = 50
const READ_METHODS = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_estimateGas',
  'eth_feeHistory',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getLogs',
  'eth_getStorageAt',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  'net_version',
])
const UPSTREAMS = isLocalForkMode
  ? [getLocalForkRpcUrl()!]
  : [
      process.env.NEXT_PUBLIC_MATIC_NODE_1,
      'https://polygon-bor-rpc.publicnode.com',
      'https://polygon.gateway.tenderly.co',
    ].filter(Boolean) as string[]

type RpcId = string | number
type RpcRequest = {
  jsonrpc: '2.0'
  id: RpcId
  method: string
  params?: unknown[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isReadRequest(value: unknown): value is RpcRequest {
  return (
    isObject(value) &&
    value.jsonrpc === '2.0' &&
    (typeof value.id === 'string' || (typeof value.id === 'number' && Number.isSafeInteger(value.id))) &&
    typeof value.method === 'string' &&
    READ_METHODS.has(value.method) &&
    (value.params === undefined || Array.isArray(value.params))
  )
}

function matchesResponse(payload: unknown, ids: Set<RpcId>, batch: boolean): boolean {
  if (Array.isArray(payload) !== batch) return false
  const items: unknown[] = Array.isArray(payload) ? payload : [payload]
  const remaining = new Set(ids)
  return (
    items.length === remaining.size &&
    items.every((item) => {
      if (!isObject(item) || item.jsonrpc !== '2.0' || (typeof item.id !== 'string' && typeof item.id !== 'number')) {
        return false
      }
      if (!remaining.delete(item.id)) return false
      if (Object.hasOwn(item, 'result')) return !Object.hasOwn(item, 'error')
      const { error } = item
      return isObject(error) && typeof error.code === 'number' && typeof error.message === 'string'
    })
  )
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body: unknown = req.body
  const isBatch = Array.isArray(body)
  const calls: unknown[] = isBatch ? body : [body]
  if (!calls.length || calls.length > MAX_BATCH_SIZE || !calls.every(isReadRequest)) {
    return res.status(400).json({ error: 'Expected supported Polygon JSON-RPC read requests.' })
  }
  const ids = new Set(calls.map(({ id }) => id))
  if (ids.size !== calls.length) return res.status(400).json({ error: 'Duplicate JSON-RPC request IDs.' })
  const requests = calls.map(({ jsonrpc, id, method, params }) => ({ jsonrpc, id, method, params }))
  const requestBody = JSON.stringify(isBatch ? requests : requests[0])
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  let lastError = isLocalForkMode
    ? 'Local Polygon fork RPC is unavailable; no remote fallback is allowed.'
    : 'Polygon RPC upstream unavailable.'

  for (const upstream of UPSTREAMS) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    try {
      const response = await fetch(upstream, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
        redirect: 'error',
        signal: controller.signal,
      })
      if (response.ok) {
        const payload: unknown = await response.json()
        if (matchesResponse(payload, ids, isBatch)) return res.status(200).json(payload)
        lastError = 'Polygon RPC returned an invalid JSON-RPC response.'
        continue
      }

      lastError = `Polygon RPC returned HTTP ${response.status}.`
    } catch (error) {
      lastError = error instanceof Error && error.name === 'AbortError' ? 'Polygon RPC request timed out.' : lastError
    } finally {
      clearTimeout(timeout)
    }
  }

  return res.status(502).json({ error: lastError })
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '128kb' },
  },
}
