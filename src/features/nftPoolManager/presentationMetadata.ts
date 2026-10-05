import { getAddress, isAddress } from '@ethersproject/address'
import { getLocalForkStorageKey, isLocalForkMode } from 'config/localFork'
import { resolveNftAssetUrl } from './assets'

export const NFT_POOL_PRESENTATION_URL = 'https://metadata.coincollect.org/nft-pools.json'
const METADATA_CACHE_KEY = getLocalForkStorageKey('coincollect:nft-pool-presentations:v1')
const CACHE_TTL_MS = 5 * 60_000
const STALE_LIMIT_MS = 24 * 60 * 60_000
const FETCH_TIMEOUT_MS = 4_000
const MAX_DOCUMENT_BYTES = 1_000_000

export interface RemoteNftPoolPresentation {
  id: string
  name?: string
  banner?: string
  avatar?: string
  projectUrl?: string
  getNftUrl?: string
  description?: string
  category?: 'PARTNER' | 'COMMUNITY'
}

interface MetadataDocument {
  schemaVersion: 1
  updatedAt: string
  pools: RemoteNftPoolPresentation[]
}

let memoryCache: { fetchedAt: number; document: MetadataDocument } | undefined
let pending: Promise<MetadataDocument | undefined> | undefined

function boundedText(value: unknown, max: number): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined
}

function safeUrl(value: unknown, max = 2_048): string | undefined {
  const text = boundedText(value, max)
  if (!text) return undefined
  if (/^\/(?!\/)/.test(text)) return resolveNftAssetUrl(text)
  try {
    const url = new URL(text)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function validateNftPoolPresentationDocument(value: unknown): MetadataDocument {
  const document = value as Partial<MetadataDocument> | null
  if (!document || document.schemaVersion !== 1 || !Array.isArray(document.pools) || document.pools.length > 2_000)
    throw new Error('NFT pool presentation document has an unsupported schema or size.')
  const updatedAt = boundedText(document.updatedAt, 80)
  if (!updatedAt || !Number.isFinite(Date.parse(updatedAt)))
    throw new Error('NFT pool presentation document has an invalid updatedAt timestamp.')
  const pools: RemoteNftPoolPresentation[] = []
  const ids = new Set<string>()
  for (const item of document.pools) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    const match = /^137:(0x[\da-f]{40})$/i.exec(id)
    if (!match || !isAddress(match[1])) throw new Error('NFT pool presentation contains an invalid canonical ID.')
    const canonicalId = `137:${getAddress(match[1]).toLowerCase()}`
    if (ids.has(canonicalId)) throw new Error(`NFT pool presentation contains duplicate ID ${canonicalId}.`)
    ids.add(canonicalId)
    const category = item.category === 'PARTNER' || item.category === 'COMMUNITY' ? item.category : undefined
    pools.push({
      id: canonicalId,
      name: boundedText(item.name, 200),
      banner: safeUrl(item.banner),
      avatar: safeUrl(item.avatar),
      projectUrl: safeUrl(item.projectUrl),
      getNftUrl: safeUrl(item.getNftUrl),
      description: boundedText(item.description, 1_000),
      category,
    })
  }
  return {
    schemaVersion: 1,
    updatedAt,
    pools,
  }
}

function readStoredDocument(): { cachedAt: number; document: MetadataDocument } | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const stored = JSON.parse(window.localStorage.getItem(METADATA_CACHE_KEY) || 'null')
    if (!Number.isFinite(stored?.cachedAt) || Date.now() - stored.cachedAt > STALE_LIMIT_MS) return undefined
    return { cachedAt: stored.cachedAt, document: validateNftPoolPresentationDocument(stored.document) }
  } catch {
    return undefined
  }
}

export async function loadNftPoolPresentations(force = false): Promise<MetadataDocument | undefined> {
  if (isLocalForkMode) return undefined
  if (memoryCache && !force && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) return memoryCache.document
  if (pending) return pending
  pending = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const controller = new AbortController()
      timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
      const response = await fetch(NFT_POOL_PRESENTATION_URL, { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error(`Presentation metadata returned HTTP ${response.status}.`)
      const declaredSize = Number(response.headers.get('content-length') || 0)
      if (declaredSize > MAX_DOCUMENT_BYTES) throw new Error('Presentation metadata exceeds the 1 MB document limit.')
      const body = await response.text()
      if (new TextEncoder().encode(body).byteLength > MAX_DOCUMENT_BYTES)
        throw new Error('Presentation metadata exceeds the 1 MB document limit.')
      const document = validateNftPoolPresentationDocument(JSON.parse(body))
      memoryCache = { fetchedAt: Date.now(), document }
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(METADATA_CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), document }))
        } catch {
          // Metadata caching is optional and never affects pool discovery.
        }
      }
      return document
    } catch {
      const stored = readStoredDocument()
      if (memoryCache && Date.now() - memoryCache.fetchedAt <= STALE_LIMIT_MS) return memoryCache.document
      if (stored) {
        memoryCache = { fetchedAt: stored.cachedAt, document: stored.document }
        return stored.document
      }
      return undefined
    } finally {
      if (timer) clearTimeout(timer)
      pending = undefined
    }
  })()
  return pending
}

export function clearNftPoolPresentationCache() {
  memoryCache = undefined
  pending = undefined
}
