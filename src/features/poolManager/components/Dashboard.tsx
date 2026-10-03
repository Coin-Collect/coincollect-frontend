import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { NftPool, NftPoolDraft } from 'features/nftPoolManager/types'
import { useNftPoolRegistry } from 'features/nftPoolManager/hooks'
import { selectOperatorAttentionItems, selectRecentNftPools } from 'features/nftPoolManager/operatorOverview'
import { loadNftPoolDrafts, NFT_POOL_DRAFT_STORAGE_KEY } from 'features/nftPoolManager/storage'
import { LAUNCH_STORAGE_KEY, loadNftPoolLaunchSessions } from 'features/nftPoolManager/launch/storage'
import type { NftPoolLaunchSession } from 'features/nftPoolManager/launch/types'
import AdminShell from './AdminShell'
import { ActionButton, Notice, PanelTitle } from './styles'
import {
  AttentionAction,
  AttentionItemStatus,
  AttentionItemTitle,
  AttentionLink,
  AttentionList,
  OverviewEmptyState,
  OverviewMetric,
  OverviewMetricGrid,
  OverviewMetricLabel,
  OverviewMetricValue,
  OverviewPanel,
  OverviewSection,
  OverviewSectionHeader,
  OverviewSectionSubtitle,
  OverviewSectionTitle,
  OverviewSkeleton,
  RecentPoolGrid,
  RecentPoolLink,
  RecentPoolMeta,
  RecentPoolName,
  RecentPoolStatus,
  ViewAllLink,
} from './overviewStyles'

function poolStatusLabel(status: NftPool['status']): string {
  switch (status) {
    case 'ACTIVE':
      return 'Active'
    case 'UPCOMING':
      return 'Upcoming'
    case 'FINISHED':
      return 'Finished'
    default:
      return 'Needs review'
  }
}

function attentionAction(kind: 'launch' | 'draft' | 'pool'): string {
  if (kind === 'launch') return 'Resume'
  if (kind === 'draft') return 'Continue setup'
  return 'Review pool'
}

export default function Dashboard() {
  const { data, loading, error, refresh } = useNftPoolRegistry()
  const [drafts, setDrafts] = useState<NftPoolDraft[]>([])
  const [sessions, setSessions] = useState<NftPoolLaunchSession[]>([])
  const [localStateReady, setLocalStateReady] = useState(false)

  const syncLocalState = useCallback(() => {
    setDrafts(loadNftPoolDrafts())
    setSessions(loadNftPoolLaunchSessions())
    setLocalStateReady(true)
  }, [])

  useEffect(() => {
    syncLocalState()
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === NFT_POOL_DRAFT_STORAGE_KEY || event.key === LAUNCH_STORAGE_KEY) syncLocalState()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', syncLocalState)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', syncLocalState)
    }
  }, [syncLocalState])

  const pools = useMemo(() => data.pools.filter((pool) => pool.kind === 'POOL'), [data.pools])
  const counts = useMemo(
    () => ({
      total: pools.length,
      active: pools.filter((pool) => pool.status === 'ACTIVE').length,
      upcoming: pools.filter((pool) => pool.status === 'UPCOMING').length,
      finished: pools.filter((pool) => pool.status === 'FINISHED').length,
    }),
    [pools],
  )
  const attentionItems = useMemo(
    () => selectOperatorAttentionItems({ pools, drafts, sessions }),
    [pools, drafts, sessions],
  )
  const recentPools = useMemo(() => selectRecentNftPools(pools, 6), [pools])
  const registryReady = !loading && !error
  const metrics: Array<[string, number]> = [
    ['Total NFT pools', counts.total],
    ['Active', counts.active],
    ['Upcoming', counts.upcoming],
    ['Finished', counts.finished],
    ['Needs attention', attentionItems.length],
  ]

  return (
    <AdminShell title="Pool Manager" subtitle="Manage CoinCollect NFT reward pools and pool operations.">
      {data.warning ? (
        <Notice>
          Some NFT pool data may be incomplete. The registry warning can be reviewed on the{' '}
          <Link href="/admin/nft-pools">NFT Pools page</Link>.
        </Notice>
      ) : null}
      {error ? (
        <Notice $error>
          NFT pool registry could not be refreshed. Existing saved sessions remain available.
          <details>
            <summary>Technical details</summary>
            <code>{error}</code>
          </details>
          <ActionButton onClick={() => void refresh()} disabled={loading}>
            Retry registry
          </ActionButton>
        </Notice>
      ) : null}

      <OverviewMetricGrid aria-label="NFT pool metrics">
        {metrics.map(([label, value], index) => (
          <OverviewMetric key={label}>
            <OverviewMetricLabel>{label}</OverviewMetricLabel>
            <OverviewMetricValue>
              {!registryReady && index < 4 ? '—' : !localStateReady && index === 4 ? '…' : value}
            </OverviewMetricValue>
          </OverviewMetric>
        ))}
      </OverviewMetricGrid>

      <OverviewSection>
        <OverviewSectionHeader>
          <div>
            <OverviewSectionTitle>Needs attention</OverviewSectionTitle>
            <OverviewSectionSubtitle>Resume setup or review pool data that needs an operator.</OverviewSectionSubtitle>
          </div>
          <ViewAllLink href="/admin/nft-pools">Open NFT Pools</ViewAllLink>
        </OverviewSectionHeader>
        <OverviewPanel>
          {!localStateReady || (loading && pools.length === 0) ? (
            <AttentionList aria-label="Loading attention items">
              <OverviewSkeleton />
              <OverviewSkeleton />
            </AttentionList>
          ) : attentionItems.length ? (
            <AttentionList>
              {attentionItems.slice(0, 6).map((item) => (
                <Link href={item.href} passHref legacyBehavior key={`${item.kind}:${item.id}`}>
                  <AttentionLink>
                    <span style={{ minWidth: 0 }}>
                      <AttentionItemTitle>{item.title}</AttentionItemTitle>
                      <AttentionItemStatus>{item.status}</AttentionItemStatus>
                    </span>
                    <AttentionAction>{attentionAction(item.kind)} →</AttentionAction>
                  </AttentionLink>
                </Link>
              ))}
            </AttentionList>
          ) : (
            <OverviewEmptyState>
              No saved launches, drafts or pool issues need attention right now. New work starts in NFT Pool Studio.
            </OverviewEmptyState>
          )}
        </OverviewPanel>
      </OverviewSection>

      <OverviewSection>
        <OverviewSectionHeader>
          <div>
            <OverviewSectionTitle>Recent NFT pools</OverviewSectionTitle>
            <OverviewSectionSubtitle>Recently deployed pools from the Polygon registry.</OverviewSectionSubtitle>
          </div>
          <ViewAllLink href="/admin/nft-pools">View all pools</ViewAllLink>
        </OverviewSectionHeader>
        <OverviewPanel>
          {loading && recentPools.length === 0 ? (
            <RecentPoolGrid aria-label="Loading recent NFT pools">
              <OverviewSkeleton />
              <OverviewSkeleton />
              <OverviewSkeleton />
              <OverviewSkeleton />
            </RecentPoolGrid>
          ) : error && recentPools.length === 0 ? (
            <OverviewEmptyState>
              Pool activity is unavailable until the registry connection is restored.
            </OverviewEmptyState>
          ) : recentPools.length ? (
            <RecentPoolGrid>
              {recentPools.map((pool) => (
                <Link
                  href={`/admin/nft-pools/${encodeURIComponent(pool.id)}`}
                  passHref
                  legacyBehavior
                  key={pool.canonicalId}
                >
                  <RecentPoolLink>
                    <span style={{ minWidth: 0 }}>
                      <RecentPoolName>{pool.metadata.name || 'Untitled NFT pool'}</RecentPoolName>
                      <RecentPoolMeta>
                        {pool.collections.length} {pool.collections.length === 1 ? 'collection' : 'collections'}
                        {pool.rewards.primary.token.symbol ? ` · ${pool.rewards.primary.token.symbol} rewards` : ''}
                      </RecentPoolMeta>
                    </span>
                    <RecentPoolStatus
                      $tone={pool.status === 'ACTIVE' ? 'active' : pool.status === 'UNKNOWN' ? 'warning' : 'muted'}
                    >
                      {poolStatusLabel(pool.status)}
                    </RecentPoolStatus>
                  </RecentPoolLink>
                </Link>
              ))}
            </RecentPoolGrid>
          ) : (
            <OverviewEmptyState>
              No NFT pools have been discovered yet. Create the first pool in NFT Pool Studio.
            </OverviewEmptyState>
          )}
        </OverviewPanel>
      </OverviewSection>

      <OverviewSection>
        <OverviewSectionHeader>
          <div>
            <OverviewSectionTitle>Pool operations</OverviewSectionTitle>
            <OverviewSectionSubtitle>
              Use NFT Pool Studio for the complete create, review and launch flow.
            </OverviewSectionSubtitle>
          </div>
        </OverviewSectionHeader>
        <OverviewPanel>
          <PanelTitle>{data.currentBlock ? `Polygon · block ${data.currentBlock}` : 'Polygon registry'}</PanelTitle>
          <OverviewSectionSubtitle>
            {data.factoryAddress ? `NFT factory ${data.factoryAddress}` : 'Factory address is not available.'}
            {data.factoryOwner ? ` · Owner ${data.factoryOwner}` : ''}
          </OverviewSectionSubtitle>
          <div style={{ marginTop: 14 }}>
            <Link href="/admin/nft-pools" passHref legacyBehavior>
              <ActionButton as="a" $secondary>
                Open NFT Pool Studio
              </ActionButton>
            </Link>
          </div>
        </OverviewPanel>
      </OverviewSection>
    </AdminShell>
  )
}
