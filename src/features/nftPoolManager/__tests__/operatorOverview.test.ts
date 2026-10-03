import { selectOperatorAttentionItems, selectRecentNftPools } from '../operatorOverview'
import { NftPool } from '../types'
import { NftPoolDraft } from '../types'
import { NftPoolLaunchSession, LaunchStage } from '../launch/types'

function launchSession(sessionId: string, currentStage: LaunchStage, updatedAt: number, draftId = sessionId) {
  return { sessionId, currentStage, updatedAt, draftId } as NftPoolLaunchSession
}

function draft(id: string, name: string, updatedAt: number) {
  return { id, name, updatedAt } as NftPoolDraft
}

function pool(id: string, status: NftPool['status'], blockNumber = 0): NftPool {
  return {
    id,
    canonicalId: id,
    kind: 'POOL',
    status,
    metadata: { name: id },
    health: { codeFound: true, abiCompatible: true, configurationMismatch: false },
    deployment: { blockNumber },
    onChain: {},
  } as NftPool
}

describe('NFT operator overview selectors', () => {
  it('puts corrupted and failed launches first, then wallet work and saved drafts', () => {
    const items = selectOperatorAttentionItems({
      pools: [],
      drafts: [draft('draft-only', 'A saved pool', 10)],
      sessions: [
        launchSession('pending', 'DEPLOY_CONFIRMING', 30),
        launchSession('blocked', 'CORRUPTED', 10),
        launchSession('failed', 'FAILED', 20),
        launchSession('wallet', 'AWAITING_DEPLOY_SIGNATURE', 40),
      ],
    })

    expect(items.map(({ id }) => id)).toEqual(['failed', 'blocked', 'wallet', 'draft-only', 'pending'])
    expect(items[0]).toMatchObject({ status: 'Launch failed', href: '/admin/nft-pools/launch/failed' })
    expect(items[1].status).toBe('Session integrity check failed')
  })

  it('excludes completed sessions and their retained drafts', () => {
    const items = selectOperatorAttentionItems({
      pools: [],
      drafts: [draft('done', 'Already launched', 1), draft('new', 'Still to do', 2)],
      sessions: [launchSession('complete', 'COMPLETE', 3, 'done')],
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ kind: 'draft', id: 'new' })
  })

  it('surfaces unknown live pool states and omits healthy pools', () => {
    const items = selectOperatorAttentionItems({
      pools: [pool('active', 'ACTIVE'), pool('unreadable', 'UNKNOWN', 99)],
      drafts: [],
      sessions: [],
    })

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ id: 'unreadable', kind: 'pool', status: 'Pool data needs review' })
  })

  it('shows the most recently deployed pools first within the requested limit', () => {
    expect(
      selectRecentNftPools(
        [pool('older', 'FINISHED', 2), pool('newer', 'ACTIVE', 9), pool('middle', 'UPCOMING', 4)],
        2,
      ).map(({ id }) => id),
    ).toEqual(['newer', 'middle'])
  })

  it('does not count static collection definitions as recent pools', () => {
    const definition = { ...pool('definition', 'ACTIVE'), kind: 'COLLECTION_DEFINITION' as const }
    expect(selectRecentNftPools([pool('real-pool', 'ACTIVE', 3), definition]).map(({ id }) => id)).toEqual([
      'real-pool',
    ])
  })
})
