import { useEffect, useState } from 'react'
import { nftPoolRegistryRpcProvider } from 'utils/providers'
import {
  hydratePublishedPool,
  publishCompletedNftPool,
  localPublicationStore,
  PUBLICATION_EVENT,
  PUBLICATION_STORAGE_KEY,
  PublicV2Pool,
} from './publication'
import { loadNftPoolLaunchSessions } from './launch/storage'

const cache = new Map<string, PublicV2Pool>()
const pending = new Map<string, Promise<PublicV2Pool>>()

function readPool(record: PublicV2Pool, force: boolean): Promise<PublicV2Pool> {
  const current = cache.get(record.id)
  if (!force && current && Date.now() - current.snapshot.checkedAt < 30_000)
    return Promise.resolve({ ...current, metadata: record.metadata })
  const running = pending.get(record.id)
  if (running) return running
  const task = hydratePublishedPool(record, nftPoolRegistryRpcProvider)
    .then((pool) => {
      cache.set(pool.id, pool)
      return pool
    })
    .finally(() => {
      pending.delete(record.id)
    })
  pending.set(record.id, task)
  return task
}

export function usePublishedNftPools() {
  const [pools, setPools] = useState<PublicV2Pool[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [refreshingPools, setRefreshingPools] = useState(false)
  useEffect(() => {
    let active = true
    let refreshing = false
    let queued = false
    const refresh = async (force = false) => {
      if (refreshing) {
        queued = true
        return
      }
      refreshing = true
      let records = localPublicationStore.read()
      if (active) {
        setRefreshingPools(true)
        setPools(records.map((record) => cache.get(record.id) || record))
      }
      // A crash after COMPLETE but before the storage write must not require
      // another transaction or even reopening the operator's launch screen.
      const ids = new Set(records.map((record) => record.id))
      await Promise.allSettled(
        loadNftPoolLaunchSessions()
          .filter(
            (session) =>
              session.currentStage === 'COMPLETE' &&
              session.poolAddress &&
              !ids.has(`137:${session.poolAddress.toLowerCase()}`),
          )
          .map((session) => publishCompletedNftPool(session, nftPoolRegistryRpcProvider)),
      )
      records = localPublicationStore.read()
      if (active) setPools(records.map((record) => cache.get(record.id) || record))
      const results = await Promise.allSettled(records.map((record) => readPool(record, force)))
      if (active) {
        const nextErrors: Record<string, string> = {}
        setPools(
          results.map((result, index) => {
            if (result.status === 'fulfilled') return result.value
            nextErrors[records[index].id] = 'Current chain data unavailable. Showing the last verified snapshot.'
            return cache.get(records[index].id) || records[index]
          }),
        )
        setErrors(nextErrors)
        setLoading(false)
        setRefreshingPools(false)
      }
      refreshing = false
      if (queued && active) {
        queued = false
        void refresh(true)
      }
    }
    const changed = () => {
      void refresh(true)
    }
    const storage = (event: StorageEvent) => {
      if (!event.key || event.key === PUBLICATION_STORAGE_KEY) changed()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener(PUBLICATION_EVENT, changed)
    window.addEventListener('coincollect:nft-v2-position-changed', changed)
    window.addEventListener('storage', storage)
    window.addEventListener('focus', visible)
    document.addEventListener('visibilitychange', visible)
    const timer = window.setInterval(visible, 30_000)
    void refresh()
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener(PUBLICATION_EVENT, changed)
      window.removeEventListener('coincollect:nft-v2-position-changed', changed)
      window.removeEventListener('storage', storage)
      window.removeEventListener('focus', visible)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [])
  return { pools, errors, loading, refreshing: refreshingPools }
}
