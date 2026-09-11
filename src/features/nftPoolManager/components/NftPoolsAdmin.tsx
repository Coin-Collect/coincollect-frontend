import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageLoader from 'components/Loader/PageLoader'
import AdminShell from 'features/poolManager/components/AdminShell'
import {
  ActionButton,
  Field,
  Input,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  Select,
} from 'features/poolManager/components/styles'
import { useNftPoolRegistry } from '../hooks'
import { loadNftPoolLaunchSessions } from '../launch/storage'
import { deleteNftPoolDraft, duplicateNftPoolDraft, loadNftPoolDrafts } from '../storage'
import { NftPoolDraft, NftPoolStatus } from '../types'
import type { NftPoolLaunchSession } from '../launch/types'
import {
  FilterBar,
  NftPoolList,
  PoolSectionHeader,
  PoolSectionMeta,
  PoolSectionTitle,
  PrimaryLink,
  StudioSummary,
  SummaryCard,
  SummaryLabel,
  SummaryValue,
} from './styles'
import { NftPoolAdminCard, NftPoolDraftCard } from './studio/NftPoolAdminCard'

type AdminFilter = 'ALL' | NftPoolStatus | 'DRAFTS'

const statusFilters: AdminFilter[] = ['ALL', 'ACTIVE', 'UPCOMING', 'FINISHED', 'DRAFTS', 'UNKNOWN']

export default function NftPoolsAdmin() {
  const { data, loading, error, refresh } = useNftPoolRegistry()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<AdminFilter>('ALL')
  const [drafts, setDrafts] = useState<NftPoolDraft[]>([])
  const [launchSessions, setLaunchSessions] = useState<NftPoolLaunchSession[]>([])
  useEffect(() => {
    setDrafts(loadNftPoolDrafts())
    setLaunchSessions(loadNftPoolLaunchSessions())
  }, [])
  const refreshDrafts = () => {
    setDrafts(loadNftPoolDrafts())
    setLaunchSessions(loadNftPoolLaunchSessions())
  }
  const launchSessionByDraftId = useMemo(
    () =>
      new Map(
        launchSessions
          .filter((session) => session.currentStage !== 'COMPLETE')
          .map((session) => [session.draftId, session.sessionId]),
      ),
    [launchSessions],
  )
  const counts = useMemo(() => {
    const pools = data?.pools || []
    return {
      total: pools.length,
      active: pools.filter((pool) => pool.status === 'ACTIVE').length,
      upcoming: pools.filter((pool) => pool.status === 'UPCOMING').length,
      finished: pools.filter((pool) => pool.status === 'FINISHED').length,
      drafts: drafts.length,
    }
  }, [data?.pools, drafts.length])
  const pools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return (data?.pools || []).filter((pool) => {
      const searchText = [
        pool.metadata.name,
        pool.address,
        pool.onChain.stakingTokenAddress,
        pool.onChain.rewardTokenAddress,
        pool.rewards.primary.token.symbol,
        ...pool.rewards.side.map((reward) => reward.token.symbol),
        ...pool.collections.map((entry) => `${entry.collection.name} ${entry.collection.address}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (
        (!normalizedQuery || searchText.includes(normalizedQuery)) &&
        status !== 'DRAFTS' &&
        (status === 'ALL' || pool.status === status)
      )
    })
  }, [data?.pools, query, status])

  const visibleDrafts = useMemo(() => {
    if (status !== 'ALL' && status !== 'DRAFTS') return []
    const normalizedQuery = query.trim().toLowerCase()
    return drafts.filter((draft) => {
      const searchText = [
        draft.name,
        draft.sourcePoolId,
        ...draft.collections.map((collection) => collection.name),
        draft.rewards.primary?.symbol,
        ...draft.rewards.side.map((reward) => reward.symbol),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return !normalizedQuery || searchText.includes(normalizedQuery)
    })
  }, [drafts, query, status])
  const poolGroups = useMemo(
    () => ({
      published: pools.filter((pool) => pool.status !== 'FINISHED'),
      finished: pools.filter((pool) => pool.status === 'FINISHED'),
    }),
    [pools],
  )

  return (
    <AdminShell
      title="NFT Pool Studio"
      subtitle="Create, review and operate Polygon NFT reward pools from one workspace."
      headerAction={
        <Link href="/admin/nft-pools/new" passHref legacyBehavior>
          <PrimaryLink>+ New Pool</PrimaryLink>
        </Link>
      }
      authorityScope="nft"
    >
      {loading ? <PageLoader /> : null}
      {error ? <Notice $error>{error}</Notice> : null}
      {data?.warning ? <Notice>{data.warning}</Notice> : null}
      <StudioSummary>
        <SummaryCard>
          <SummaryLabel>Total pools</SummaryLabel>
          <SummaryValue>{counts.total}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>Active</SummaryLabel>
          <SummaryValue>{counts.active}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>Upcoming</SummaryLabel>
          <SummaryValue>{counts.upcoming}</SummaryValue>
        </SummaryCard>
        <SummaryCard>
          <SummaryLabel>Finished</SummaryLabel>
          <SummaryValue>{counts.finished}</SummaryValue>
        </SummaryCard>
      </StudioSummary>

      <Panel>
        <FilterBar>
          <Field>
            Search pools, collections or tokens
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pool name, 0x…, COLLECT"
            />
          </Field>
          <Field>
            Status
            <Select value={status} onChange={(event) => setStatus(event.target.value as AdminFilter)}>
              {statusFilters.map((value) => (
                <option key={value} value={value}>
                  {value === 'ALL'
                    ? 'All pools'
                    : value === 'DRAFTS'
                    ? 'Drafts'
                    : value[0] + value.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <ActionButton onClick={() => refresh()} disabled={loading}>
            {loading ? 'Reading…' : 'Refresh'}
          </ActionButton>
        </FilterBar>
        <Muted>
          {loading ? 'Reading Polygon pool state…' : `${pools.length} pool${pools.length === 1 ? '' : 's'} shown`} ·
          block {data?.currentBlock?.toLocaleString() || '—'}
        </Muted>
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <PanelTitle>Pool cards</PanelTitle>
        <Muted style={{ display: 'block', marginBottom: 14 }}>
          The same artwork, collections and rewards model is used here as in the public staking experience.
        </Muted>
        {visibleDrafts.length ? (
          <>
            <PoolSectionHeader>
              <PoolSectionTitle>Saved drafts</PoolSectionTitle>
              <PoolSectionMeta>{visibleDrafts.length}</PoolSectionMeta>
            </PoolSectionHeader>
            <NftPoolList>
              {visibleDrafts.map((draft) => (
                <NftPoolDraftCard
                  key={draft.id}
                  draft={draft}
                  knownCollections={data?.collections || []}
                  resumeSessionId={launchSessionByDraftId.get(draft.id)}
                  onDuplicate={() => {
                    const copy = duplicateNftPoolDraft(draft.id)
                    if (copy) refreshDrafts()
                  }}
                  onDelete={() => {
                    deleteNftPoolDraft(draft.id)
                    refreshDrafts()
                  }}
                />
              ))}
            </NftPoolList>
          </>
        ) : null}
        {poolGroups.published.length ? (
          <>
            <PoolSectionHeader>
              <PoolSectionTitle>Published pools</PoolSectionTitle>
              <PoolSectionMeta>{poolGroups.published.length}</PoolSectionMeta>
            </PoolSectionHeader>
            <NftPoolList>
              {poolGroups.published.map((pool) => (
                <NftPoolAdminCard key={pool.id} pool={pool} secondsPerBlock={data?.secondsPerBlock || 2.2} />
              ))}
            </NftPoolList>
          </>
        ) : null}
        {poolGroups.finished.length ? (
          <>
            <PoolSectionHeader>
              <PoolSectionTitle>Closed pools</PoolSectionTitle>
              <PoolSectionMeta>{poolGroups.finished.length}</PoolSectionMeta>
            </PoolSectionHeader>
            <NftPoolList>
              {poolGroups.finished.map((pool) => (
                <NftPoolAdminCard key={pool.id} pool={pool} secondsPerBlock={data?.secondsPerBlock || 2.2} />
              ))}
            </NftPoolList>
          </>
        ) : null}
        {!loading && pools.length === 0 && visibleDrafts.length === 0 ? (
          data?.pools?.length || drafts.length ? (
            <Muted>No pool cards matched the current filters.</Muted>
          ) : (
            <Muted>
              No pools yet. Start the first one from the Card Studio.{' '}
              <Link href="/admin/nft-pools/new">Create a pool</Link>
            </Muted>
          )
        ) : null}
      </Panel>
    </AdminShell>
  )
}
