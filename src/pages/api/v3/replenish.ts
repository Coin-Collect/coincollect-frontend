import { timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLocalForkRpcUrl, isLocalForkMode } from 'config/localFork'
import { createLocalV3Executor, runV3Automation } from 'features/universalRewards/automation'
import { createV3Client, getV3Deployment } from 'features/universalRewards/runtime'
import { parseV3PoolId } from 'features/universalRewards/poolPresentation'

let sweep: ReturnType<typeof runV3Automation> | undefined
let lastChecked = 0

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
  const enabled = Boolean(
    isLocalForkMode && localHost && process.env.COINCOLLECT_V3_AUTOMATION === 'isolated' &&
    process.env.VERCEL !== '1' && firstPool && deployment?.chainId === 31337,
  )

  if (req.method === 'GET' && req.query.status === '1') {
    const mode = !enabled ? 'disabled' : lastChecked && Date.now() - lastChecked < 90_000 ? 'running' : 'starting'
    return res.status(200).json({ mode, firstPool: firstPool?.toString() })
  }
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  if (!authorize(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }
  if (!enabled || !deployment || !firstPool) {
    return res.status(503).json({ error: 'V3 automated settlement is disabled in this environment.' })
  }

  try {
    const rpc = getLocalForkRpcUrl()
    if (!rpc) return res.status(503).json({ error: 'V3 deployment unavailable.' })
    const tick = BigInt(Math.floor(Date.now() / 30_000))
    sweep ??= runV3Automation(createV3Client(), createLocalV3Executor(rpc), deployment, tick, firstPool).finally(() => {
      sweep = undefined
    })
    const results = await sweep
    lastChecked = Date.now()
    return res.status(200).json({ mode: 'isolated', results })
  } catch {
    return res.status(503).json({ error: 'The isolated settlement could not be verified.' })
  }
}
