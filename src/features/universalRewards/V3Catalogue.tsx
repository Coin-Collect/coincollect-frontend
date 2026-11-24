import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import { useV3PresentationDocument, useV3Query } from './hooks'
import { withV3Presentation } from './poolPresentation'
import type { V3PoolType } from './metadata'
import { poolTiming, v3PoolType } from './presentation'
import { MAX_V3_PAGE, readV3Catalogue, type V3PoolSnapshot } from './reader'
import { createV3Client, getV3Deployment, type V3Deployment } from './runtime'
import { V3Actions, V3Button, V3Error, V3Muted, V3Section } from './styles'

export interface V3CatalogueCardsProps {
  pools: V3PoolSnapshot[]
  deployment: V3Deployment
  onPositionChange: () => void
}

export default function V3Catalogue({
  history = false,
  query = '',
  embedded = false,
  poolType,
  onVisibility,
  Cards,
  selectedDeployment,
}: {
  Cards: ComponentType<V3CatalogueCardsProps>
  selectedDeployment?: V3Deployment
  history?: boolean
  query?: string
  embedded?: boolean
  poolType?: V3PoolType
  onVisibility?: (visible: boolean) => void
}) {
  const [offset, setOffset] = useState(0)
  const defaultDeployment = useMemo(() => getV3Deployment(), [])
  const deployment = selectedDeployment ?? defaultDeployment
  const client = useMemo(createV3Client, [])
  const load = useCallback(async () => {
    if (!deployment) throw new Error('This V3 deployment is unavailable.')
    return readV3Catalogue(client, deployment, offset)
  }, [client, deployment, offset])
  const result = useV3Query(deployment ? `${deployment.address}:${offset}` : '', load, 45_000)
  const document = useV3PresentationDocument(deployment)
  const filter = query.trim().toLowerCase()
  const pools = useMemo(
    () =>
      (result.data?.pools ?? [])
        .map((pool) => withV3Presentation(pool, document))
        .filter(
          (pool) =>
            (!embedded || (poolTiming(pool) === 'Finished') === history) &&
            (!poolType || v3PoolType(pool) === poolType) &&
            (!filter ||
              pool.presentation.name.toLowerCase().includes(filter) ||
              pool.collections.some(({ collection }) => collection.toLowerCase().includes(filter))),
        ),
    [result.data, document, embedded, history, filter, poolType],
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
      {hasPools && <Cards pools={pools} deployment={deployment} onPositionChange={result.refresh} />}
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
