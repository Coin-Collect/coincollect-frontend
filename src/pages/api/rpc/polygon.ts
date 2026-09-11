import type { NextApiRequest, NextApiResponse } from 'next'

const UPSTREAM_TIMEOUT_MS = 8_000
const UPSTREAMS = [
  process.env.NEXT_PUBLIC_MATIC_NODE_1,
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.gateway.tenderly.co',
].filter(Boolean) as string[]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  let lastError = 'Polygon RPC upstream unavailable.'

  for (const upstream of UPSTREAMS) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

    try {
      const response = await fetch(upstream, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
        signal: controller.signal,
      })
      const responseBody = await response.text()

      if (response.ok) {
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
        return res.status(response.status).send(responseBody)
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
    externalResolver: true,
  },
}
