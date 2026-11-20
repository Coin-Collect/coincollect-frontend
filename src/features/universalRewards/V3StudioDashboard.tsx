import { useCallback, useEffect, useState } from 'react'
import { zeroAddress } from 'viem'
import { useV3Query } from './hooks'
import type { V3PresentationDocument } from './poolPresentation'
import { withV3Presentation } from './poolPresentation'
import { poolTiming } from './presentation'
import { MAX_V3_PAGE, readV3StudioPools } from './reader'
import type { V3Client, V3Deployment } from './runtime'
import { V3Actions, V3Button, V3Error, V3Muted } from './styles'
import {
  PoolEmpty,
  PoolFilters,
  PoolList,
  PoolPagination,
  PoolRow,
  PoolSearch,
  PoolState,
  PoolThumb,
  PoolToolbar,
  WorkspaceHeading,
} from './studioDashboardStyles'

const filters = ['All pools', 'Live', 'Upcoming', 'Finished'] as const

export default function V3StudioDashboard({
  active,
  client,
  deployment,
  presentation,
  open,
  create,
}: {
  active: boolean
  client: V3Client
  deployment: V3Deployment
  presentation?: V3PresentationDocument
  open: (poolId: bigint) => void
  create: () => void
}) {
  const [offset, setOffset] = useState(0)
  const [filter, setFilter] = useState<(typeof filters)[number]>('All pools')
  const [search, setSearch] = useState('')
  const load = useCallback(() => readV3StudioPools(client, deployment, offset), [client, deployment, offset])
  const result = useV3Query(active ? `${deployment.address}:studio:${offset}` : '', load, 30_000)
  const total = result.data?.total
  const query = search.trim().toLowerCase()
  const pools = (result.data?.pools ?? [])
    .map((pool) => withV3Presentation(pool, presentation))
    .filter(
      (pool) =>
        (filter === 'All pools' || poolTiming(pool) === filter) &&
        (!query ||
          pool.presentation.name.toLowerCase().includes(query) ||
          pool.poolId.toString() === query.replace(/^#/, '')),
    )
  useEffect(() => {
    if (total !== undefined && offset > 0 && BigInt(offset) >= total) setOffset(0)
  }, [offset, total])

  return (
    <section aria-label="V3 pool dashboard">
      <PoolToolbar role="search" aria-label="Filter pools">
        <PoolFilters>
          {filters.map((item) => (
            <button type="button" key={item} aria-pressed={item === filter} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </PoolFilters>
        <PoolSearch
          type="search"
          aria-label="Search pools by name or ID"
          placeholder="Search name or pool ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </PoolToolbar>
      {result.error && (
        <V3Actions>
          <V3Error role="alert">Pool list couldn’t be refreshed. {result.error}</V3Error>
          <V3Button type="button" $secondary onClick={result.refresh}>
            Refresh pools
          </V3Button>
        </V3Actions>
      )}
      {result.loading && !result.data && <V3Muted role="status">Reading pools from the ledger…</V3Muted>}
      {result.data && pools.length === 0 && (
        <PoolEmpty>
          <WorkspaceHeading as="h3">
            {total === BigInt(0) ? 'Create your first pool' : 'No matching pools on this page'}
          </WorkspaceHeading>
          {total === BigInt(0) ? (
            <>
              <V3Muted>Set up your first NFT collection and reward budget on the FarmCard.</V3Muted>
              <V3Button type="button" onClick={create}>
                New pool
              </V3Button>
            </>
          ) : (
            <V3Muted>Try a different name, pool ID or status.</V3Muted>
          )}
        </PoolEmpty>
      )}
      {pools.length > 0 && (
        <PoolList aria-label="Pools">
          {pools.map((pool) => {
            const timing = poolTiming(pool)
            const time = new Date(Number(timing === 'Upcoming' ? pool.config.start : pool.config.end) * 1000)
            const hasDate = Number.isFinite(time.getTime())
            const funding = pool.funding
            const funded =
              funding.budget > BigInt(0) ? Number((funding.deposited * BigInt(100)) / funding.budget) : undefined
            return (
              <PoolRow key={pool.poolId.toString()}>
                <PoolThumb
                  src={pool.presentation.artwork || '/images/collectHeroes/14.jpg'}
                  alt=""
                  width="72"
                  height="54"
                  loading="lazy"
                  onError={(event) => {
                    const image = event.currentTarget
                    if (!image.src.endsWith('/images/collectHeroes/14.jpg')) image.src = '/images/collectHeroes/14.jpg'
                  }}
                />
                <div>
                  <h3>{pool.presentation.name}</h3>
                  <small>
                    #{pool.poolId.toString()} · {pool.activeNfts.toString()} participating
                  </small>
                </div>
                <div className="pool-timing">
                  <PoolState $state={timing}>{timing}</PoolState>
                  {hasDate && (
                    <time dateTime={time.toISOString()}>
                      {timing === 'Upcoming' ? 'Starts' : timing === 'Live' ? 'Ends' : 'Ended'}{' '}
                      {time.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  )}
                </div>
                <p className="pool-funding">
                  <small>
                    {funding.asset === zeroAddress
                      ? 'Direct rewards'
                      : funding.paused
                      ? 'Funding paused'
                      : `${funded ?? 0}% funded`}
                  </small>
                </p>
                <div className="pool-actions">
                  <V3Button
                    type="button"
                    $secondary
                    aria-label={`Manage ${pool.presentation.name}`}
                    onClick={() => open(pool.poolId)}
                  >
                    Manage
                  </V3Button>
                </div>
              </PoolRow>
            )
          })}
        </PoolList>
      )}
      {total !== undefined && total > BigInt(0) && (
        <PoolPagination>
          <V3Muted role="status">
            {total.toString()} pools · Page {Math.floor(offset / MAX_V3_PAGE) + 1}
          </V3Muted>
          {(offset > 0 || BigInt(offset + MAX_V3_PAGE) < total) && (
            <V3Actions>
              <V3Button
                type="button"
                $secondary
                disabled={offset === 0}
                onClick={() => setOffset(offset - MAX_V3_PAGE)}
              >
                Previous
              </V3Button>
              <V3Button
                type="button"
                $secondary
                disabled={BigInt(offset + MAX_V3_PAGE) >= total}
                onClick={() => setOffset(offset + MAX_V3_PAGE)}
              >
                Next
              </V3Button>
            </V3Actions>
          )}
        </PoolPagination>
      )}
    </section>
  )
}
