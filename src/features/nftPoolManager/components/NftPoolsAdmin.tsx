import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import PageLoader from 'components/Loader/PageLoader'
import AdminShell from 'features/poolManager/components/AdminShell'
import {
  ActionButton,
  Field,
  FormGrid,
  Input,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  Select,
  StatusPill,
} from 'features/poolManager/components/styles'
import { useNftPoolRegistry } from '../hooks'
import { deleteNftPoolDraft, duplicateNftPoolDraft, loadNftPoolDrafts } from '../storage'
import { NftPoolDraft } from '../types'
import { NftPoolStatus } from '../types'
import {
  ColumnLabel,
  FilterBar,
  NftPoolList,
  NftPoolRow,
  PoolActions,
  PoolColumn,
  PoolIdentity,
  PoolMeta,
  PoolName,
  PoolThumb,
  PoolThumbVideo,
  SoftLink,
  StudioSummary,
  SummaryCard,
  SummaryLabel,
  SummaryValue,
} from './styles'

const statusFilters: Array<'ALL' | NftPoolStatus> = ['ALL', 'ACTIVE', 'UPCOMING', 'FINISHED', 'UNKNOWN']

function shorten(address: string): string {
  return address.length > 14 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address
}

function rewardSummary(pool: any): string {
  return [pool.rewards.primary.token.symbol, ...pool.rewards.side.map((reward: any) => reward.token.symbol)].join(' + ')
}

function collectionSummary(pool: any): string {
  const names = pool.collections.map((entry: any) => entry.collection.displayName)
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ')
}

function sourceLabel(source: string): string {
  if (source === 'legacy-masterchef') return 'Legacy MasterChef'
  if (source === 'nft-factory') return 'NFT factory'
  return 'Config + chain'
}

function fallbackHeroVideo(address: string): string {
  const suffix = Number.parseInt(address.slice(-2), 16)
  const index = Number.isFinite(suffix) ? (suffix % 9) + 1 : 1
  return `/images/superheroes/${index}.webm`
}

function PoolMedia({ pool }: { pool: any }) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = pool.metadata.avatar || pool.metadata.banner

  if (!image || imageFailed) {
    return <PoolThumbVideo autoPlay loop muted playsInline src={fallbackHeroVideo(pool.address)} aria-hidden="true" />
  }

  return <PoolThumb src={image} alt="" onError={() => setImageFailed(true)} />
}

export default function NftPoolsAdmin() {
  const { data, loading, error, refresh } = useNftPoolRegistry()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'ALL' | NftPoolStatus>('ALL')
  const [drafts, setDrafts] = useState<NftPoolDraft[]>([])
  useEffect(() => setDrafts(loadNftPoolDrafts()), [])
  const refreshDrafts = () => setDrafts(loadNftPoolDrafts())
  const counts = useMemo(() => {
    const pools = data?.pools || []
    return {
      total: pools.length,
      active: pools.filter((pool) => pool.status === 'ACTIVE').length,
      upcoming: pools.filter((pool) => pool.status === 'UPCOMING').length,
      finished: pools.filter((pool) => pool.status === 'FINISHED').length,
    }
  }, [data?.pools])
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
      return (!normalizedQuery || searchText.includes(normalizedQuery)) && (status === 'ALL' || pool.status === status)
    })
  }, [data?.pools, query, status])

  return (
    <AdminShell
      title="NFT Pool Studio"
      subtitle="A read-only operational view of every NFT staking pool, its collections, rewards and contract health."
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
            <Select value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | NftPoolStatus)}>
              {statusFilters.map((value) => (
                <option key={value} value={value}>
                  {value === 'ALL' ? 'All pools' : value[0] + value.slice(1).toLowerCase()}
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
        <PanelTitle>All NFT pools</PanelTitle>
        <NftPoolList>
          {pools.map((pool) => (
            <NftPoolRow key={pool.id}>
              <PoolIdentity>
                <PoolMedia pool={pool} />
                <div style={{ minWidth: 0 }}>
                  <PoolName>{pool.metadata.name}</PoolName>
                  <PoolMeta>
                    {sourceLabel(pool.source)} · {pool.protocolVersion} · {shorten(pool.address)}
                  </PoolMeta>
                </div>
              </PoolIdentity>
              <PoolColumn>
                <ColumnLabel>Staking NFTs</ColumnLabel>
                {collectionSummary(pool) || 'Unavailable'}
                <PoolMeta>
                  {pool.collections.length} collection{pool.collections.length === 1 ? '' : 's'}
                </PoolMeta>
              </PoolColumn>
              <PoolColumn>
                <ColumnLabel>Rewards</ColumnLabel>
                {rewardSummary(pool)}
                <PoolMeta>
                  {pool.onChain.startBlock !== undefined && pool.onChain.endBlock !== undefined
                    ? `${pool.onChain.startBlock.toLocaleString()} → ${pool.onChain.endBlock.toLocaleString()}`
                    : 'Schedule unavailable'}
                </PoolMeta>
              </PoolColumn>
              <PoolActions>
                <StatusPill $status={pool.status}>{pool.status}</StatusPill>
                <Link href={`/admin/nft-pools/${pool.id}`} passHref legacyBehavior>
                  <SoftLink>View</SoftLink>
                </Link>
                {pool.cloneSupport !== 'UNAVAILABLE' ? (
                  <Link href={`/admin/nft-pools/new?clone=${encodeURIComponent(pool.id)}`} passHref legacyBehavior>
                    <SoftLink>Clone</SoftLink>
                  </Link>
                ) : null}
              </PoolActions>
              {pool.warnings.length > 0 ? (
                <PoolMeta style={{ gridColumn: '1 / -1', color: 'inherit' }}>⚠ {pool.warnings[0]}</PoolMeta>
              ) : null}
            </NftPoolRow>
          ))}
        </NftPoolList>
        {!loading && pools.length === 0 ? <Muted>No NFT pools matched the current filters.</Muted> : null}
      </Panel>

      <Panel style={{ marginTop: 16 }}>
        <PanelTitle>Saved drafts</PanelTitle>
        <Muted>Drafts stay in this browser only. They contain no wallet secrets and never send a transaction.</Muted>
        {drafts.length ? (
          drafts.map((draft) => (
            <NftPoolRow key={draft.id} style={{ marginTop: 10 }}>
              <PoolIdentity>
                <div>
                  <PoolName>{draft.name || 'Untitled draft'}</PoolName>
                  <PoolMeta>
                    {draft.source === 'cloned' ? `Clone of ${draft.sourcePoolId}` : 'New from scratch'} ·{' '}
                    {draft.readiness?.replace(/_/g, ' ') || 'INCOMPLETE'}
                  </PoolMeta>
                </div>
              </PoolIdentity>
              <PoolColumn>
                <ColumnLabel>Updated</ColumnLabel>
                {new Date(draft.updatedAt).toLocaleString()}
              </PoolColumn>
              <PoolColumn>
                <ColumnLabel>Configuration</ColumnLabel>
                {draft.collections.length} NFTs · {draft.rewards.primary?.symbol || 'No reward'}
              </PoolColumn>
              <PoolActions>
                <Link href={`/admin/nft-pools/new?draft=${encodeURIComponent(draft.id)}`} passHref legacyBehavior>
                  <SoftLink>Continue</SoftLink>
                </Link>
                <SoftLink
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    const copy = duplicateNftPoolDraft(draft.id)
                    if (copy) refreshDrafts()
                  }}
                >
                  Duplicate
                </SoftLink>
                <SoftLink
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    deleteNftPoolDraft(draft.id)
                    refreshDrafts()
                  }}
                >
                  Delete
                </SoftLink>
              </PoolActions>
            </NftPoolRow>
          ))
        ) : (
          <Muted style={{ display: 'block', marginTop: 12 }}>
            No saved drafts yet. Start a new builder flow to create one.
          </Muted>
        )}
      </Panel>

      <Notice>
        Phase 2 remains dry-run only. Deployment, collection-weight updates, approvals, swaps and reward funding are not
        available here.
      </Notice>
    </AdminShell>
  )
}
