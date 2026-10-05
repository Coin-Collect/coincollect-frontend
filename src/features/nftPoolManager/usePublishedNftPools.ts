import { useCallback, useEffect, useState } from 'react'
import { nftPoolRegistryRpcProvider } from 'utils/providers'
import { getLocalForkStorageKey, isLocalForkMode } from 'config/localFork'
import { getNftPoolRegistry } from './discovery'
import { toPublicV2Pool, toVerifiedNftPool, type PublicV2Pool, type VerifiedNftPool } from './publication'
import { loadNftPoolPresentations, type RemoteNftPoolPresentation } from './presentationMetadata'
import type { NftPool } from './types'

const REFRESH_INTERVAL_MS = 5 * 60_000
const registryCache = new Map<string, { pools: PublicV2Pool[]; verifiedPools: VerifiedNftPool[] }>()

function metadataForPool(pool: NftPool, remote?: RemoteNftPoolPresentation): NftPool['metadata'] {
  const collection = pool.collections.find((item) => item.primary)?.collection || pool.collections[0]?.collection
  const configuredName = pool.metadata.name?.trim()
  const name =
    remote?.name ||
    (configuredName && configuredName !== 'Unlabelled NFT pool' ? configuredName : undefined) ||
    collection?.displayName ||
    collection?.name ||
    `CoinCollect NFT Pool ${pool.address.slice(0, 6)}…${pool.address.slice(-4)}`
  return {
    ...pool.metadata,
    name,
    description: remote?.description || pool.metadata.description,
    banner: remote?.banner || pool.metadata.banner || collection?.image,
    avatar: remote?.avatar || pool.metadata.avatar || collection?.image,
    projectUrl: remote?.projectUrl || pool.metadata.projectUrl,
    getNftUrl: remote?.getNftUrl || pool.metadata.getNftUrl,
    isCommunity:
      remote?.category === 'PARTNER'
        ? false
        : remote?.category === 'COMMUNITY'
        ? true
        : pool.metadata.isCommunity !== false,
  }
}

async function readRegistry(force: boolean) {
  const registry = await getNftPoolRegistry(nftPoolRegistryRpcProvider, force)
  const presentationDocument = await loadNftPoolPresentations(force).catch(() => undefined)
  const remoteById = new Map(presentationDocument?.pools.map((item) => [item.id, item]) || [])
  const verifiedPools = registry.pools
    .filter((pool) => pool.protocolVersion === 'NftStakeV2' && pool.verified === true)
    .map((pool) => {
      const withMetadata = { ...pool, metadata: metadataForPool(pool, remoteById.get(pool.canonicalId)) }
      return toVerifiedNftPool(withMetadata)
    })
    .filter(Boolean) as VerifiedNftPool[]
  const pools = verifiedPools.flatMap((pool) => {
    if (!pool.publicReady) return []
    try {
      const projection = toPublicV2Pool(pool, registry.secondsPerBlock)
      return projection ? [projection] : []
    } catch (error) {
      pool.publicReady = false
      pool.readinessReasons = [
        ...pool.readinessReasons,
        error instanceof Error ? error.message : 'A complete public pool projection is unavailable.',
      ]
      return []
    }
  })
  const result = { pools, verifiedPools }
  const cacheKey = getLocalForkStorageKey('coincollect:nft-pool-catalogue:v1')
  registryCache.set(cacheKey, result)
  return { ...result, registry }
}

export function usePublishedNftPools() {
  const [pools, setPools] = useState<PublicV2Pool[]>([])
  const [verifiedPools, setVerifiedPools] = useState<VerifiedNftPool[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (force = false, shouldUpdate: () => boolean = () => true) => {
    const cacheKey = getLocalForkStorageKey('coincollect:nft-pool-catalogue:v1')
    const previous = registryCache.get(cacheKey)
    if (previous && shouldUpdate()) {
      setPools(previous.pools)
      setVerifiedPools(previous.verifiedPools)
    }
    if (shouldUpdate()) setRefreshing(true)
    try {
      const result = await readRegistry(force)
      if (shouldUpdate()) {
        setPools(result.pools)
        setVerifiedPools(result.verifiedPools)
      }
      const nextErrors: Record<string, string> = {}
      const warnings: string[] = []
      if (result.registry.coverage?.warning || result.registry.warning) {
        warnings.push(result.registry.coverage?.warning || result.registry.warning || 'Factory discovery is partial.')
      }
      if (result.registry.coverage?.stale)
        warnings.push('Showing the last verified factory registry while RPC discovery is unavailable.')
      const staleReadinessCount = result.verifiedPools.filter((pool) => pool.readinessStale).length
      if (staleReadinessCount)
        warnings.push(
          `${staleReadinessCount} pool readiness result${
            staleReadinessCount === 1 ? ' is' : 's are'
          } stale; new writes recheck chain state.`,
        )
      if (warnings.length) nextErrors['*'] = warnings.join(' ')
      if (shouldUpdate()) setErrors(nextErrors)
    } catch (error) {
      if (shouldUpdate()) {
        setErrors({
          '*': error instanceof Error ? error.message : 'Factory pool discovery could not be refreshed.',
        })
        if (!previous) {
          setPools([])
          setVerifiedPools([])
        }
      }
    } finally {
      if (shouldUpdate()) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    let active = true
    let pendingRefresh = false
    let busy = false
    const run = async (force = false) => {
      if (busy) {
        pendingRefresh = true
        return
      }
      busy = true
      if (active) await refresh(force, () => active)
      busy = false
      if (pendingRefresh && active) {
        pendingRefresh = false
        void run(true)
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void run()
    }
    const revalidate = () => void run(true)
    window.addEventListener('coincollect:nft-pool-discovery-refresh', revalidate)
    window.addEventListener('focus', visible)
    document.addEventListener('visibilitychange', visible)
    const timer = window.setInterval(visible, REFRESH_INTERVAL_MS)
    void run()
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('coincollect:nft-pool-discovery-refresh', revalidate)
      window.removeEventListener('focus', visible)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [refresh])

  return {
    pools,
    verifiedPools,
    errors,
    loading,
    refreshing,
    refresh: () => refresh(true),
    isLocalFork: isLocalForkMode,
  }
}
