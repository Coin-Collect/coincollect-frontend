import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useV3Query } from './hooks'
import { V3_FALLBACK_ART } from './metadata'
import { dailyTarget, poolTiming, shortAmount, sourceName } from './presentation'
import { MAX_V3_PAGE, readV3Catalogue, type V3PoolSnapshot } from './reader'
import { createV3Client, getV3Deployment } from './runtime'
import { V3Actions, V3Badge, V3Button, V3Card, V3Error, V3Grid, V3Link, V3Metrics, V3Muted, V3Section } from './styles'

function PoolTile({ pool }: { pool: V3PoolSnapshot }) {
  const timing = poolTiming(pool)
  const sources = [...new Set(pool.collections.map((collection) => sourceName(collection.sourceChainId)))].join(', ')
  return (
    <V3Card>
      <img
        src={pool.presentation.artwork || V3_FALLBACK_ART}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(event) => {
          if (event.currentTarget.getAttribute('src') !== V3_FALLBACK_ART) event.currentTarget.src = V3_FALLBACK_ART
        }}
      />
      <div>
        <V3Badge>{timing}</V3Badge>
        <h3>{pool.presentation.name}</h3>
        {pool.presentation.description && <V3Muted>{pool.presentation.description}</V3Muted>}
        <V3Metrics>
          <div>
            <dt>Eligible NFTs</dt>
            <dd>{sources}</dd>
          </div>
          <div>
            <dt>Participant wallets</dt>
            <dd>
              {pool.activeWallets} / {pool.config.maxWallets}
            </dd>
          </div>
          <div>
            <dt>{timing === 'Finished' ? 'Reward assets' : 'Target per day · all participants'}</dt>
            <dd>
              {pool.rewards
                .map((asset) =>
                  timing === 'Finished'
                    ? asset.symbol
                    : `${shortAmount(dailyTarget(pool, asset), asset.decimals)} ${asset.symbol}`,
                )
                .join(' · ')}
            </dd>
          </div>
        </V3Metrics>
        <Link href={`/nftpools/v3/${pool.poolId}`} passHref legacyBehavior>
          <V3Link>{timing === 'Finished' ? 'View earned rewards' : 'View pool'}</V3Link>
        </Link>
      </div>
    </V3Card>
  )
}

export default function V3Catalogue({
  history = false,
  query = '',
  embedded = false,
  onVisibility,
}: {
  history?: boolean
  query?: string
  embedded?: boolean
  onVisibility?: (visible: boolean) => void
}) {
  const [offset, setOffset] = useState(0)
  const deployment = useMemo(getV3Deployment, [])
  const client = useMemo(createV3Client, [])
  const load = useCallback(async () => {
    if (!deployment) throw new Error('This V3 deployment is unavailable.')
    return readV3Catalogue(client, deployment, offset)
  }, [client, deployment, offset])
  const result = useV3Query(deployment ? `${deployment.address}:${offset}` : '', load, 45_000)
  const filter = query.trim().toLowerCase()
  const pools = (result.data?.pools ?? []).filter(
    (pool) =>
      (!embedded || (poolTiming(pool) === 'Finished') === history) &&
      (!filter ||
        pool.presentation.name.toLowerCase().includes(filter) ||
        pool.collections.some(({ collection }) => collection.toLowerCase().includes(filter))),
  )
  const hasPools = pools.length > 0
  useEffect(() => {
    onVisibility?.(hasPools)
  }, [hasPools, onVisibility])
  if (!deployment) {
    return embedded ? null : (
      <V3Muted role="status">Universal Rewards V3 has no active deployment in this environment.</V3Muted>
    )
  }
  if (
    embedded &&
    !hasPools &&
    !result.error &&
    !result.loading &&
    (result.data?.total ?? BigInt(0)) <= BigInt(MAX_V3_PAGE)
  ) {
    return null
  }

  return (
    <V3Section aria-label="Universal Rewards V3 pools">
      <header>
        {embedded ? <h2>Universal Rewards V3</h2> : <h1>Universal Rewards V3</h1>}
        <V3Muted>Join with eligible NFTs while they stay in your wallet. Rewards settle on Polygon.</V3Muted>
      </header>
      {result.error && (
        <V3Actions>
          <V3Error role="status">V3 pools could not be refreshed. {result.error}</V3Error>
          <V3Button type="button" $secondary onClick={result.refresh}>
            Retry
          </V3Button>
        </V3Actions>
      )}
      {result.loading && !result.data && <V3Muted role="status">Checking V3 pools…</V3Muted>}
      {!result.loading && !result.error && !hasPools && (
        <V3Muted role="status">No matching V3 pools on this page.</V3Muted>
      )}
      {hasPools && (
        <V3Grid>
          {pools.map((pool) => (
            <PoolTile key={pool.poolId.toString()} pool={pool} />
          ))}
        </V3Grid>
      )}
      {(offset > 0 || (result.data?.total ?? BigInt(0)) > BigInt(offset + MAX_V3_PAGE)) && (
        <V3Actions>
          <V3Button type="button" $secondary disabled={offset === 0} onClick={() => setOffset(offset - MAX_V3_PAGE)}>
            Previous pools
          </V3Button>
          <V3Button
            type="button"
            $secondary
            disabled={(result.data?.total ?? BigInt(0)) <= BigInt(offset + MAX_V3_PAGE)}
            onClick={() => setOffset(offset + MAX_V3_PAGE)}
          >
            Next pools
          </V3Button>
        </V3Actions>
      )}
    </V3Section>
  )
}
