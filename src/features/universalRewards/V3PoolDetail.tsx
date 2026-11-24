import { ArrowBackIcon } from '@pancakeswap/uikit'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useState, type ComponentType, type MouseEvent } from 'react'
import { useV3PresentationDocument, useV3Query } from './hooks'
import { withV3Presentation } from './poolPresentation'
import { poolShowroomData, type V3PoolShowroomData, type V3PoolTeaser } from './poolShowroom'
import { FarmCardSlot, PoolStage, Showroom, ShowroomSection } from './poolShowroomStyles'
import type { V3PoolCardProps } from './presentation'
import { readV3PublicPool } from './reader'
import { createV3Client, v3DeploymentPath, type V3Deployment } from './runtime'
import { V3Actions, V3Button, V3Error, V3Field, V3Link, V3Muted } from './styles'
import { PoolShowroomCollections, PoolShowroomCover, PoolShowroomDiscover } from './V3PoolShowroom'
import V3PoolWalletDialog, { PoolDialogFrame } from './V3PoolWalletDialog'

type WalletView = 'nfts' | 'positions' | 'managed'
type PoolPanel = WalletView | 'contract'

export default function V3PoolDetail({
  poolId,
  Card,
  initialPool,
  related,
  shareUrl,
  deployment,
}: {
  poolId: bigint
  Card: ComponentType<V3PoolCardProps>
  initialPool: V3PoolShowroomData | null
  related: V3PoolTeaser[]
  shareUrl: string
  deployment: V3Deployment
}) {
  const router = useRouter()
  const client = useMemo(createV3Client, [])
  const [panel, setPanel] = useState<PoolPanel>()
  const [walletView, setWalletView] = useState<WalletView>()

  const readPool = useCallback(async () => {
    if (!deployment) throw new Error('V3 is unavailable in this environment.')
    return readV3PublicPool(client, deployment, poolId)
  }, [client, deployment, poolId])
  const result = useV3Query(deployment ? `${deployment.address}:${poolId}` : '', readPool, 20_000)
  const presentation = useV3PresentationDocument(deployment)
  const pool = useMemo(() => {
    if (!result.data) return undefined
    if (presentation) return withV3Presentation(result.data, presentation)
    return initialPool
      ? {
          ...result.data,
          presentation: {
            ...result.data.presentation,
            name: initialPool.name,
            description: initialPool.description,
            artwork: initialPool.artwork,
            poolType: initialPool.type,
          },
        }
      : result.data
  }, [result.data, presentation, initialPool])
  const overview = pool ? poolShowroomData(pool) : initialPool
  const hasPool = Boolean(pool)
  useEffect(() => {
    if (!hasPool) return undefined
    const reveal = () => {
      const hash = window.location.hash
      const next =
        hash === '#eligible-nfts'
          ? 'nfts'
          : hash === '#v3-positions'
          ? 'positions'
          : hash === '#managed-nfts'
          ? 'managed'
          : hash === '#contract'
          ? 'contract'
          : undefined
      setPanel(next)
      if (next && next !== 'contract') setWalletView(next)
    }
    reveal()
    window.addEventListener('hashchange', reveal)
    router.events.on('hashChangeComplete', reveal)
    return () => {
      window.removeEventListener('hashchange', reveal)
      router.events.off('hashChangeComplete', reveal)
    }
  }, [hasPool, router.events])

  const closePanel = () => {
    setPanel(undefined)
    void router.replace(router.asPath.split('#')[0], undefined, { shallow: true, scroll: false })
  }

  const followCardLink = (event: MouseEvent<HTMLElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    const link = event.target instanceof Element ? event.target.closest('a') : null
    if (!link || link.origin !== window.location.origin || link.pathname !== window.location.pathname ||
      link.search !== (deployment.id ? `?deployment=${deployment.id}` : '')) return
    if (link.hash !== '#eligible-nfts' && link.hash !== '#contract') return
    event.preventDefault()
    void router.push(link.hash, undefined, { shallow: true, scroll: false })
  }

  return (
    <Showroom>
      <V3Actions style={{ marginBottom: 12 }}>
        <V3Link as={Link} href={v3DeploymentPath('/nftpools/v3', deployment)}>
          <ArrowBackIcon color="currentColor" width="16px" mr="5px" aria-hidden="true" />
          All V3 pools
        </V3Link>
      </V3Actions>
      {overview && <PoolShowroomCover pool={overview} url={shareUrl} hasCardHeading={hasPool} />}
      {result.error && (
        <V3Actions style={{ marginTop: 12 }}>
          <V3Error role="status">Pool data is temporarily unavailable.</V3Error>
          <V3Button type="button" $secondary onClick={result.refresh}>
            Retry
          </V3Button>
        </V3Actions>
      )}

      <ShowroomSection id="pool-farmcard" aria-labelledby="pool-rewards-title">
        <header>
          <h2 id="pool-rewards-title">Pool rewards</h2>
        </header>
        {pool && deployment ? (
          <PoolStage>
            <FarmCardSlot onClick={followCardLink}>
              <Card pool={pool} deployment={deployment} detail onPositionChange={result.refresh} />
            </FarmCardSlot>
            <PoolShowroomCollections collections={pool.collections} />
          </PoolStage>
        ) : (
          !result.error && <V3Muted role="status">Loading the pool card…</V3Muted>
        )}
      </ShowroomSection>

      <PoolShowroomDiscover related={related} deployment={deployment} />
      {pool && deployment && walletView && (
        <V3PoolWalletDialog
          open={panel === walletView}
          initialView={walletView}
          pool={pool}
          client={client}
          deployment={deployment}
          refresh={result.refresh}
          onDismiss={closePanel}
        />
      )}
      {deployment && panel === 'contract' && (
        <PoolDialogFrame open title="Pool contract" subtitle={overview?.name} onDismiss={closePanel}>
          <V3Field>
            Contract address
            <input readOnly value={deployment.address} onFocus={(event) => event.target.select()} />
          </V3Field>
        </PoolDialogFrame>
      )}
    </Showroom>
  )
}
