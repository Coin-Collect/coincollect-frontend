import { NormalizedPool, PoolManagerStatus, RenewalPlan, RenewalPlanItem } from './types'

export function mergePoolEntries(pools: NormalizedPool[]): NormalizedPool[] {
  const byIdentity = new Map<string, NormalizedPool>()
  pools.forEach((pool) => {
    const existing = byIdentity.get(pool.canonicalId)
    byIdentity.set(
      pool.canonicalId,
      existing ? { ...existing, ...pool, legacySousId: existing.legacySousId || pool.legacySousId } : pool,
    )
  })
  return Array.from(byIdentity.values())
}

export function countPoolStatuses(pools: NormalizedPool[]): Record<PoolManagerStatus, number> {
  return pools.reduce(
    (counts, pool) => {
      counts[pool.status] += 1
      return counts
    },
    { UPCOMING: 0, ACTIVE: 0, FINISHED: 0, UNKNOWN: 0 } as Record<PoolManagerStatus, number>,
  )
}

export function updateRenewalPlanItem(plan: RenewalPlan, itemId: string, patch: Partial<RenewalPlanItem>): RenewalPlan {
  return {
    ...plan,
    updatedAt: Date.now(),
    items: plan.items.map((item) => (item.id === itemId ? { ...item, ...patch, updatedAt: Date.now() } : item)),
  }
}
