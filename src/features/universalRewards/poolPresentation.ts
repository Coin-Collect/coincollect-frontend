import { getLocalForkStorageKey } from 'config/localFork'
import { keccak256, stringToHex } from 'viem'
import { isV3PoolType, safeArtwork, type V3Presentation } from './metadata'
import { v3DeploymentPath, type V3Deployment } from './runtime'
import { UINT256_MAX } from './units'

export const V3_PRESENTATION_URL = 'https://metadata.coincollect.org/v3-pools.json'
export function v3PresentationUrl(deployment: V3Deployment) {
  return deployment.id
    ? V3_PRESENTATION_URL.replace('v3-pools.json', `v3-pools-${deployment.address.toLowerCase()}.json`)
    : V3_PRESENTATION_URL
}
export const MAX_PRESENTATION_BYTES = 512_000
export const MAX_PRESENTATION_POOLS = 1000

export interface V3PresentationRecord extends V3Presentation {
  poolId: string
}

export interface V3PresentationDocument {
  schemaVersion: 1
  chainId: number
  ledger: string
  pools: V3PresentationRecord[]
}

export function parseV3PoolId(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,77}$/.test(value)) return undefined
  const poolId = BigInt(value)
  return poolId <= UINT256_MAX ? poolId : undefined
}

export function validateV3Presentation(value: unknown): V3Presentation {
  const { name, description, artwork, poolType } = (value ?? {}) as Partial<V3Presentation>
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 60 ||
    typeof description !== 'string' ||
    description.length > 200
  ) {
    throw new Error('Enter a pool name of up to 60 characters and a description of up to 200 characters.')
  }
  const image = artwork === '' || artwork === undefined ? undefined : safeArtwork(artwork)
  if (artwork !== undefined && artwork !== '' && !image)
    throw new Error('Choose a gallery image or enter an HTTPS image URL.')
  if (poolType !== undefined && !isV3PoolType(poolType)) throw new Error('Choose Community or Partner.')
  return { name: name.trim(), description: description.trim(), artwork: image, ...(poolType && { poolType }) }
}

export function emptyV3PresentationDocument(deployment: V3Deployment): V3PresentationDocument {
  return { schemaVersion: 1, chainId: deployment.chainId, ledger: deployment.address.toLowerCase(), pools: [] }
}

export function validateV3PresentationDocument(value: unknown, deployment: V3Deployment): V3PresentationDocument {
  const document = value as Partial<V3PresentationDocument> | null
  const expected = emptyV3PresentationDocument(deployment)
  if (
    document?.schemaVersion !== 1 ||
    document.chainId !== expected.chainId ||
    document.ledger !== expected.ledger ||
    !Array.isArray(document.pools) ||
    document.pools.length > MAX_PRESENTATION_POOLS
  )
    throw new Error('This presentation document does not match the V3 deployment.')
  const ids = new Set<string>()
  const pools = document.pools.map((row) => {
    if (!parseV3PoolId(row?.poolId) || ids.has(row.poolId)) throw new Error('Invalid or duplicate V3 pool ID.')
    ids.add(row.poolId)
    return { poolId: row.poolId, ...validateV3Presentation(row) }
  })
  return { ...expected, pools }
}

export function presentationRevision(record?: V3PresentationRecord) {
  return record ? keccak256(stringToHex(JSON.stringify(record))) : 'initial'
}

export function localPresentationScope(deployment: V3Deployment) {
  return getLocalForkStorageKey(`${deployment.chainId}:${deployment.address.toLowerCase()}:${deployment.runtimeHash}`)
}

export function localPresentationMessage(
  deployment: V3Deployment,
  record: V3PresentationRecord,
  revision: string,
  issuedAt: number,
) {
  return [
    'CoinCollect local Pool Studio — update FarmCard presentation',
    `Deployment: ${localPresentationScope(deployment)}`,
    `Pool: #${record.poolId}`,
    `Previous version: ${revision}`,
    `Issued at: ${issuedAt}`,
    `Name: ${JSON.stringify(record.name)}`,
    `Description: ${JSON.stringify(record.description)}`,
    `Artwork: ${JSON.stringify(record.artwork ?? '')}`,
    ...(record.poolType ? [`Pool type: ${record.poolType}`] : []),
  ].join('\n')
}

export function withV3Presentation<T extends { poolId: bigint; presentation: V3Presentation }>(
  pool: T,
  document?: V3PresentationDocument,
): T {
  const record = document?.pools.find(({ poolId }) => poolId === pool.poolId.toString())
  const poolType = record?.poolType ?? pool.presentation.poolType
  return record
    ? {
        ...pool,
        presentation: {
          name: record.name,
          description: record.description,
          artwork: record.artwork,
          ...(poolType && { poolType }),
        },
      }
    : pool
}

let cache: { key: string; until: number; document: V3PresentationDocument } | undefined
let pending: { key: string; request: Promise<V3PresentationDocument | undefined> } | undefined

export async function loadV3PresentationDocument(deployment: V3Deployment, force = false) {
  const key = localPresentationScope(deployment)
  const local = deployment.chainId === 31337
  if (!force && cache?.key === key && Date.now() < cache.until) return cache.document
  if (!force && pending?.key === key) return pending.request
  const request = (async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    try {
      const urls = local
        ? [v3DeploymentPath('/api/v3/presentation', deployment)]
        : new Set([v3PresentationUrl(deployment), V3_PRESENTATION_URL])
      for (const url of urls) {
        const response = await fetch(url, { cache: 'no-cache', signal: controller.signal })
        if (!response.ok || Number(response.headers.get('content-length') ?? 0) > MAX_PRESENTATION_BYTES) continue
        const body = await response.text()
        if (new TextEncoder().encode(body).byteLength > MAX_PRESENTATION_BYTES) continue
        const document = validateV3PresentationDocument(JSON.parse(body), deployment)
        cache = { key, until: Date.now() + (local ? 2000 : 300_000), document }
        return document
      }
      return undefined
    } catch {
      return undefined
    } finally {
      clearTimeout(timer)
    }
  })()
  pending = { key, request }
  try {
    return await request
  } finally {
    if (pending?.request === request) pending = undefined
  }
}
