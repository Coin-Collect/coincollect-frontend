export const v3PoolTypeLabels = { community: 'Community', partner: 'Partner' } as const
export type V3PoolType = keyof typeof v3PoolTypeLabels

export function isV3PoolType(value: unknown): value is V3PoolType {
  return value === 'community' || value === 'partner'
}

export interface V3Presentation {
  name: string
  description: string
  artwork?: string
  poolType?: V3PoolType
}

const METADATA_PREFIX = 'data:application/json;base64,'

export function safeArtwork(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value.length > 200) return undefined
  if (/^\/images\/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg|avif)$/.test(value)) return value
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href
  } catch {
    return undefined
  }
  return undefined
}

export function encodeV3Presentation(presentation: V3Presentation): string {
  const name = presentation.name.trim()
  const description = presentation.description.trim()
  if (!name || name.length > 60 || description.length > 200) {
    throw new Error('Enter a pool name of up to 60 characters and a description of up to 200 characters.')
  }
  const artwork = safeArtwork(presentation.artwork)
  if (presentation.artwork && !artwork) throw new Error('Enter an HTTPS image URL or use the default artwork.')
  const { poolType } = presentation
  if (poolType !== undefined && !isV3PoolType(poolType)) throw new Error('Choose Community or Partner.')
  const bytes = new TextEncoder().encode(JSON.stringify({ name, description, artwork, poolType }))
  const uri = METADATA_PREFIX + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
  if (uri.length > 512) throw new Error('Shorten the description or artwork URL to fit the pool metadata limit.')
  return uri
}

export function decodeV3Presentation(uri: string, poolId: bigint): V3Presentation {
  if (uri.length <= 512 && uri.startsWith(METADATA_PREFIX)) {
    try {
      const bytes = Uint8Array.from(atob(uri.slice(METADATA_PREFIX.length)), (character) => character.charCodeAt(0))
      const parsed: Partial<V3Presentation> = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
      if (typeof parsed.name === 'string' && parsed.name.trim() && parsed.name.length <= 60) {
        return {
          name: parsed.name.trim(),
          description: typeof parsed.description === 'string' ? parsed.description.slice(0, 200) : '',
          artwork: safeArtwork(parsed.artwork),
          ...(isV3PoolType(parsed.poolType) && { poolType: parsed.poolType }),
        }
      }
    } catch {
      // A missing or malformed presentation never changes on-chain visibility or ownership.
    }
  }
  return { name: `Universal Rewards #${poolId}`, description: '' }
}
