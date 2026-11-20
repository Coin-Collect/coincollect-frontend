import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomBytes } from 'crypto'
import type { NextApiRequest, NextApiResponse } from 'next'
import { isHex, keccak256, stringToHex } from 'viem'
import { universalRewardsAbi } from 'features/universalRewards/abi'
import {
  emptyV3PresentationDocument,
  localPresentationMessage,
  localPresentationScope,
  MAX_PRESENTATION_BYTES,
  MAX_PRESENTATION_POOLS,
  parseV3PoolId,
  presentationRevision,
  validateV3Presentation,
  validateV3PresentationDocument,
} from 'features/universalRewards/poolPresentation'
import { createV3Client, getV3Deployment, validateV3Deployment } from 'features/universalRewards/runtime'

export const config = { api: { bodyParser: { sizeLimit: '4kb' } } }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const deployment = getV3Deployment()
  const host = req.headers.host ?? ''
  if (deployment?.chainId !== 31337 || !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)) {
    return res.status(404).end()
  }
  res.setHeader('Cache-Control', 'no-store')
  const folder = join(process.cwd(), '.coincollect-fork', 'studio-presentations')
  const file = join(folder, `${keccak256(stringToHex(localPresentationScope(deployment))).slice(2)}.json`)
  const read = () => {
    try {
      return validateV3PresentationDocument(JSON.parse(readFileSync(file, 'utf8')), deployment)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return emptyV3PresentationDocument(deployment)
      throw error
    }
  }

  if (req.method === 'GET') {
    try {
      return res.json(read())
    } catch {
      return res.status(500).json({ error: 'Could not read the local presentation registry.' })
    }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).end()
  }
  const { poolId, revision, issuedAt, signature, presentation } = req.body ?? {}
  const id = parseV3PoolId(poolId)
  if (
    !id ||
    (revision !== 'initial' && !(isHex(revision) && revision.length === 66)) ||
    !Number.isSafeInteger(issuedAt) ||
    Math.abs(Date.now() - issuedAt) > 300_000 ||
    !isHex(signature)
  ) {
    return res.status(400).json({ error: 'The presentation request is invalid or expired.' })
  }

  let record
  try {
    record = { poolId: id.toString(), ...validateV3Presentation(presentation) }
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message })
  }

  try {
    const client = createV3Client()
    const blockNumber = await client.getBlockNumber()
    await validateV3Deployment(client, deployment, blockNumber)
    const ledger = { address: deployment.address, abi: universalRewardsAbi, blockNumber }
    const [admin, total] = await Promise.all([
      client.readContract({ ...ledger, functionName: 'admin' }),
      client.readContract({ ...ledger, functionName: 'poolCount' }),
    ])
    if (id > total) return res.status(404).json({ error: 'This pool does not exist on the local ledger.' })
    const signed = await client
      .verifyMessage({
        address: admin,
        message: localPresentationMessage(deployment, record, revision, issuedAt),
        signature,
      })
      .catch(() => false)
    if (!signed) return res.status(403).json({ error: 'The current V3 operator signature is required.' })

    // Keep the compare and replacement together after async signature verification.
    const document = read()
    const current = document.pools.find((row) => row.poolId === record.poolId)
    if (presentationRevision(current) !== revision) {
      return res
        .status(409)
        .json({ error: 'Presentation changed in another session. Reopen the editor and try again.' })
    }
    const next = { ...document, pools: [...document.pools.filter((row) => row.poolId !== record.poolId), record] }
    const json = JSON.stringify(next)
    if (next.pools.length > MAX_PRESENTATION_POOLS || Buffer.byteLength(json) > MAX_PRESENTATION_BYTES) {
      return res.status(409).json({ error: 'The local presentation registry has reached its size limit.' })
    }
    mkdirSync(folder, { recursive: true })
    const temporary = `${file}.${randomBytes(12).toString('hex')}.tmp`
    try {
      writeFileSync(temporary, json, { flag: 'wx' })
      renameSync(temporary, file)
    } catch (error) {
      try {
        unlinkSync(temporary)
      } catch {
        // The temporary file may never have been created.
      }
      throw error
    }
    return res.json(next)
  } catch {
    return res.status(503).json({ error: 'Could not verify the local deployment or save the presentation. Try again.' })
  }
}
