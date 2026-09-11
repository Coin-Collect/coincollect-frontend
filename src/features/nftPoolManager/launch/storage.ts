import { keccak256 } from '@ethersproject/keccak256'
import { toUtf8Bytes } from '@ethersproject/strings'
import { NftPoolDeploymentPlan } from '../types'
import { NftPoolLaunchSession, LaunchStage } from './types'

export const LAUNCH_STORAGE_KEY = 'coincollect.nft-pool-launch-sessions.v1'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function stableValue(value: any): any {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object')
    return Object.keys(value)
      .sort()
      .reduce((result, key) => ({ ...result, [key]: stableValue(value[key]) }), {})
  return value
}

export function stablePlanString(plan: NftPoolDeploymentPlan): string {
  return JSON.stringify(stableValue(plan))
}

export function hashNftPoolDeploymentPlan(plan: NftPoolDeploymentPlan): string {
  return keccak256(toUtf8Bytes(stablePlanString(plan)))
}

function readRaw(): any[] {
  if (!canUseStorage()) return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LAUNCH_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function isStage(value: any): value is LaunchStage {
  return (
    typeof value === 'string' &&
    [
      'DRAFT',
      'PREFLIGHT_RUNNING',
      'PREFLIGHT_FAILED',
      'PREFLIGHT_READY',
      'AWAITING_DEPLOY_SIGNATURE',
      'DEPLOY_SUBMITTED',
      'DEPLOY_CONFIRMING',
      'DEPLOY_CONFIRMED',
      'DEPLOY_VERIFIED',
      'WEIGHTS_REQUIRED',
      'AWAITING_WEIGHTS_SIGNATURE',
      'WEIGHTS_SUBMITTED',
      'WEIGHTS_CONFIRMING',
      'WEIGHTS_VERIFIED',
      'FEE_CONFIG_REQUIRED',
      'AWAITING_FEE_SIGNATURE',
      'FEE_SUBMITTED',
      'FEE_CONFIRMING',
      'FEE_VERIFIED',
      'FUNDING_REQUIRED',
      'FUNDING_IN_PROGRESS',
      'FINAL_VERIFYING',
      'COMPLETE',
      'FAILED',
    ].includes(value)
  )
}

function reviveSession(input: any): NftPoolLaunchSession | null {
  if (!input || input.schemaVersion !== 1 || typeof input.sessionId !== 'string' || !input.plan) return null
  if (!isStage(input.currentStage) || typeof input.planHash !== 'string') return null
  return {
    ...input,
    transactionHashes: {
      deploy: input.transactionHashes?.deploy,
      weights: input.transactionHashes?.weights,
      fee: input.transactionHashes?.fee,
      primaryFunding: input.transactionHashes?.primaryFunding,
      sideFunding: input.transactionHashes?.sideFunding || {},
      scheduleUpdate: input.transactionHashes?.scheduleUpdate,
    },
    verification: input.verification || {},
    funding: { primary: input.funding?.primary, side: input.funding?.side || {} },
    retryable: Boolean(input.retryable),
  } as NftPoolLaunchSession
}

export function loadNftPoolLaunchSessions(): NftPoolLaunchSession[] {
  return readRaw()
    .map(reviveSession)
    .filter(Boolean)
    .sort((a, b) => b!.updatedAt - a!.updatedAt) as NftPoolLaunchSession[]
}

export function loadNftPoolLaunchSession(sessionId: string): NftPoolLaunchSession | undefined {
  return loadNftPoolLaunchSessions().find((session) => session.sessionId === sessionId)
}

export function saveNftPoolLaunchSession(session: NftPoolLaunchSession): void {
  if (!canUseStorage()) return
  const next = { ...session, schemaVersion: 1 as const, updatedAt: Date.now() }
  const sessions = loadNftPoolLaunchSessions().filter((item) => item.sessionId !== session.sessionId)
  window.localStorage.setItem(LAUNCH_STORAGE_KEY, JSON.stringify([next, ...sessions]))
}

export function createNftPoolLaunchSession(
  plan: NftPoolDeploymentPlan,
  chainId = plan.chainId,
  factoryAddress = plan.factoryAddress,
  intendedAdmin = plan.factoryParameters.intendedAdmin,
): NftPoolLaunchSession {
  const now = Date.now()
  const sessionId = `nft-launch-${now}-${Math.random().toString(36).slice(2, 8)}`
  return {
    schemaVersion: 1,
    sessionId,
    draftId: plan.draftId,
    plan: JSON.parse(JSON.stringify(plan)),
    planHash: hashNftPoolDeploymentPlan(plan),
    chainId,
    factoryAddress,
    intendedAdmin,
    createdAt: now,
    updatedAt: now,
    currentStage: 'DRAFT',
    transactionHashes: { sideFunding: {} },
    verification: {},
    funding: { side: {} },
    retryable: true,
  }
}

export function findActiveNftPoolLaunchSession(draftId: string): NftPoolLaunchSession | undefined {
  return loadNftPoolLaunchSessions().find(
    (session) => session.draftId === draftId && session.currentStage !== 'COMPLETE',
  )
}

export function deleteNftPoolLaunchSession(sessionId: string): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(
    LAUNCH_STORAGE_KEY,
    JSON.stringify(loadNftPoolLaunchSessions().filter((session) => session.sessionId !== sessionId)),
  )
}

export function clearNftPoolLaunchStorage(): void {
  if (canUseStorage()) window.localStorage.removeItem(LAUNCH_STORAGE_KEY)
}
