import { timingSafeEqual } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { getLocalForkRpcUrl, isLocalForkMode } from 'config/localFork'
import { createLocalV3Executor, runV3Automation } from 'features/universalRewards/automation'
import { createV3Client, getV3Deployment } from 'features/universalRewards/runtime'

function authorize(header: string | undefined, secret: string | undefined) {
  if (!header || !secret || secret.length < 16) return false
  const encoder = new TextEncoder()
  const actual = encoder.encode(header)
  const expected = encoder.encode(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  if (!authorize(req.headers.authorization, process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized.' })
  }
  if (!isLocalForkMode || process.env.COINCOLLECT_V3_AUTOMATION !== 'isolated' || process.env.VERCEL === '1') {
    return res.status(503).json({ error: 'V3 automated settlement is disabled in this environment.' })
  }

  try {
    const rpc = getLocalForkRpcUrl()
    const deployment = getV3Deployment()
    if (!rpc || !deployment || deployment.chainId !== 31337)
      return res.status(503).json({ error: 'V3 deployment unavailable.' })
    const tick = BigInt(Math.floor(Date.now() / 60_000))
    const results = await runV3Automation(createV3Client(), createLocalV3Executor(rpc), deployment, tick)
    return res.status(200).json({ mode: 'isolated', results })
  } catch {
    return res.status(503).json({ error: 'The isolated settlement could not be verified.' })
  }
}
