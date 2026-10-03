import { NftPoolLaunchSession } from './launch/types'
import { launchStageAttentionPriority, launchStageLabel } from './launch/presentation'
import { NftPool, NftPoolDraft } from './types'

export type OperatorAttentionKind = 'launch' | 'draft' | 'pool'

export interface OperatorAttentionItem {
  id: string
  kind: OperatorAttentionKind
  title: string
  status: string
  href: string
  priority: number
  updatedAt: number
}

export interface OperatorAttentionInput {
  pools: NftPool[]
  drafts: NftPoolDraft[]
  sessions: NftPoolLaunchSession[]
}

function poolNeedsReview(pool: NftPool): boolean {
  if (pool.kind !== 'POOL') return false
  return (
    pool.status === 'UNKNOWN' ||
    !pool.health.codeFound ||
    !pool.health.abiCompatible ||
    pool.health.configurationMismatch
  )
}

export function selectOperatorAttentionItems({
  pools,
  drafts,
  sessions,
}: OperatorAttentionInput): OperatorAttentionItem[] {
  const activeSessions = sessions.filter((session) => session.currentStage !== 'COMPLETE')
  const activeDraftIds = new Set(activeSessions.map((session) => session.draftId))
  const completedDraftIds = new Set(
    sessions.filter((session) => session.currentStage === 'COMPLETE').map((session) => session.draftId),
  )
  const draftById = new Map(drafts.map((draft) => [draft.id, draft]))

  const items: OperatorAttentionItem[] = activeSessions.flatMap((session) => {
    const priority = launchStageAttentionPriority(session.currentStage)
    if (priority === null) return []
    const draft = draftById.get(session.draftId)
    return [
      {
        id: session.sessionId,
        kind: 'launch' as const,
        title: draft?.name.trim() || 'NFT pool launch',
        status: launchStageLabel(session.currentStage),
        href: `/admin/nft-pools/launch/${encodeURIComponent(session.sessionId)}`,
        priority,
        updatedAt: session.updatedAt,
      },
    ]
  })

  drafts.forEach((draft) => {
    if (activeDraftIds.has(draft.id) || completedDraftIds.has(draft.id)) return
    items.push({
      id: draft.id,
      kind: 'draft',
      title: draft.name.trim() || 'Untitled NFT pool',
      status: 'Saved draft',
      href: `/admin/nft-pools/new?draft=${encodeURIComponent(draft.id)}`,
      priority: 2,
      updatedAt: draft.updatedAt,
    })
  })

  pools.forEach((pool) => {
    if (!poolNeedsReview(pool)) return
    items.push({
      id: pool.canonicalId,
      kind: 'pool',
      title: pool.metadata.name || 'NFT pool',
      status: 'Pool data needs review',
      href: `/admin/nft-pools/${encodeURIComponent(pool.id)}`,
      priority: 0,
      updatedAt: (pool.deployment.blockNumber || pool.onChain.startBlock || 0) * 1000,
    })
  })

  return items.sort((left, right) => left.priority - right.priority || right.updatedAt - left.updatedAt)
}

function poolRecency(pool: NftPool): number {
  return pool.deployment.blockNumber || pool.onChain.startBlock || 0
}

export function selectRecentNftPools(pools: NftPool[], limit = 6): NftPool[] {
  return pools
    .filter((pool) => pool.kind === 'POOL')
    .map((pool, index) => ({ pool, index, recency: poolRecency(pool) }))
    .sort((left, right) => right.recency - left.recency || left.index - right.index)
    .slice(0, Math.max(0, limit))
    .map(({ pool }) => pool)
}
