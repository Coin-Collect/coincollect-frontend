import { RenewalPlan, RenewalPlanItem } from './types'

export function pendingRenewalItems(plan: RenewalPlan | null): RenewalPlanItem[] {
  return plan ? plan.items.filter((item) => item.status !== 'FUNDED') : []
}

export function nextRenewalItem(plan: RenewalPlan | null): RenewalPlanItem | null {
  return pendingRenewalItems(plan)[0] || null
}
