import { POOL_MANAGER_STORAGE_KEY, RENEWAL_PLAN_STORAGE_KEY } from './constants'
import { PoolManagerDraft, RenewalPlan, RenewalPlanItem } from './types'
import { updateRenewalPlanItem } from './registry'

const getStorage = () => (typeof window === 'undefined' ? null : window.localStorage)

function read<T>(key: string): T | null {
  try {
    const storage = getStorage()
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write<T>(key: string, value: T) {
  try {
    getStorage()?.setItem(key, JSON.stringify(value))
  } catch {
    // Draft persistence is best-effort and never contains private keys.
  }
}

export const loadPoolManagerDrafts = () => read<PoolManagerDraft[]>(POOL_MANAGER_STORAGE_KEY) || []

export const savePoolManagerDraft = (draft: PoolManagerDraft) => {
  const drafts = loadPoolManagerDrafts().filter((item) => item.id !== draft.id)
  write(POOL_MANAGER_STORAGE_KEY, [...drafts, draft])
}

export const loadRenewalPlan = () => read<RenewalPlan | null>(RENEWAL_PLAN_STORAGE_KEY)

export const saveRenewalPlan = (plan: RenewalPlan) => write(RENEWAL_PLAN_STORAGE_KEY, plan)

export const updateStoredRenewalPlanItem = (itemId: string, patch: Partial<RenewalPlanItem>) => {
  const plan = loadRenewalPlan()
  if (!plan) return null
  const updated = updateRenewalPlanItem(plan, itemId, patch)
  saveRenewalPlan(updated)
  return updated
}

export const clearRenewalPlan = () => {
  try {
    getStorage()?.removeItem(RENEWAL_PLAN_STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
}
