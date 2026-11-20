import { timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createPublicClient, createWalletClient, http, isAddressEqual, isHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon } from 'viem/chains'
import { getLocalForkRpcUrl, isLocalForkMode } from 'config/localFork'
import { createLocalV3Executor, runV3Automation } from 'features/universalRewards/automation'
import { createV3Client, getV3Deployment } from 'features/universalRewards/runtime'
import { parseV3PoolId } from 'features/universalRewards/poolPresentation'

let sweep: ReturnType<typeof runV3Automation> | undefined
let lastChecked = 0

function polygonExecutor() {
  const key = process.env.COINCOLLECT_V3_EXECUTOR_KEY
  const url = process.env.COINCOLLECT_V3_EXECUTOR_RPC
  if (!key || !isHex(key) || key.length !== 66 || !url || new URL(url).protocol !== 'https:') {
    throw new Error('Missing Polygon executor configuration.')
  }
  const account = privateKeyToAccount(key)
  const expected = process.env.COINCOLLECT_V3_EXECUTOR_ADDRESS
  if (!expected || !/^0x[0-9a-f]{40}$/i.test(expected) || !isAddressEqual(account.address, expected as `0x${string}`)) {
    throw new Error('Polygon executor address mismatch.')
  }
  return {
    client: createPublicClient({ transport: http(url, { timeout: 10_000, retryCount: 1 }), pollingInterval: 2_000 }),
    executor: createWalletClient({ chain: polygon, account, transport: http(url, { retryCount: 0 }) }),
  }
}

function authorize(header: string | undefined, secret: string | undefined) {
  if (!header || !secret || secret.length < 16) return false
  const encoder = new TextEncoder()
  const actual = encoder.encode(header)
  const expected = encoder.encode(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '')
  const firstPool = parseV3PoolId(process.env.COINCOLLECT_V3_AUTOMATION_FIRST_POOL ?? '1')
  const deployment = getV3Deployment()
  const isolated = Boolean(
    isLocalForkMode &&
      localHost &&
      process.env.COINCOLLECT_V3_AUTOMATION === 'isolated' &&
      process.env.VERCEL !== '1' &&
      firstPool &&
      deployment?.chainId === 31337,
  )
  const polygonAuthorized = Boolean(
    !isLocalForkMode &&
      deployment?.chainId === 137 &&
      firstPool &&
      process.env.COINCOLLECT_V3_AUTOMATION === 'polygon' &&
      process.env.COINCOLLECT_V3_ENABLE_POLYGON_EXECUTION === '1',
  )
  const mode = isolated ? 'isolated' : polygonAuthorized ? 'polygon' : undefined

  if (req.method === 'GET' && req.query.status === '1') {
    const status = !mode ? 'disabled' : lastChecked && Date.now() - lastChecked < 90_000 ? 'running' : 'starting'
    return res.status(200).json({ mode: status, firstPool: firstPool?.toString() })
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  if (!authorize(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }
  if (!mode || !deployment || !firstPool) {
    return res.status(503).json({ error: 'V3 automated settlement is disabled in this environment.' })
  }

  try {
    if (!sweep) {
      const tick = BigInt(Math.floor(Date.now() / 30_000))
      const rpc = mode === 'isolated' ? getLocalForkRpcUrl() : undefined
      const clients = rpc
        ? { client: createV3Client(), executor: createLocalV3Executor(rpc) }
        : mode === 'polygon'
        ? polygonExecutor()
        : undefined
      if (!clients) return res.status(503).json({ error: 'V3 deployment unavailable.' })
      sweep = runV3Automation(clients.client, clients.executor, deployment, tick, firstPool, mode).finally(() => {
        sweep = undefined
      })
    }
    const results = await sweep
    lastChecked = Date.now()
    return res.status(200).json({ mode, results })
  } catch {
    return res.status(503).json({ error: 'The configured settlement and executor could not be verified.' })
  }
}
