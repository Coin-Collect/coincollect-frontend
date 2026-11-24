import { ArrowDownIcon, CopyIcon } from '@pancakeswap/uikit'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import RewardTokenIcon from 'views/NftFarms/components/FarmCard/RewardTokenIcon'
import { studioCollection } from './assetCatalog'
import { v3PoolTypeLabels } from './metadata'
import { poolShowroomArtwork, type V3PoolShowroomData, type V3PoolTeaser } from './poolShowroom'
import {
  CollectionShelf,
  CoverActions,
  CoverArtwork,
  CoverBadge,
  CoverContent,
  CoverDescription,
  CoverLabels,
  CoverTitle,
  DiscoverHeader,
  PoolCover,
  RelatedPools,
  ShareFeedback,
  ShowroomFacts,
  ShowroomSection,
} from './poolShowroomStyles'
import { sourceName } from './presentation'
import type { V3PoolSnapshot } from './reader'
import { v3DeploymentPath, type V3Deployment } from './runtime'
import { V3Link } from './styles'

export function PoolShowroomCover({
  pool,
  url,
  hasCardHeading,
  interactive = true,
}: {
  pool: V3PoolShowroomData
  url: string
  hasCardHeading: boolean
  interactive?: boolean
}) {
  const [shareStatus, setShareStatus] = useState<'copied' | 'manual'>()
  const [failedArtwork, setFailedArtwork] = useState('')
  const artwork = failedArtwork === pool.artwork ? poolShowroomArtwork : pool.artwork
  const schedule = new Date(pool.schedule * 1000)
  const hasSchedule = Number.isFinite(schedule.getTime())
  const dateLabel = pool.status === 'Upcoming' ? 'Starts' : pool.status === 'Live' ? 'Ends' : 'Ended'

  const copyLink = async () => {
    setShareStatus(undefined)
    try {
      await navigator.clipboard.writeText(url)
      setShareStatus('copied')
    } catch {
      setShareStatus('manual')
    }
  }

  return (
    <>
      <PoolCover aria-label="Pool overview">
        <CoverArtwork>
          <Image
            src={artwork}
            alt=""
            fill
            sizes="(max-width: 670px) 100vw, (max-width: 1360px) 66vw, 850px"
            loading="eager"
            fetchPriority="high"
            unoptimized={!artwork.startsWith('/')}
            onError={() => setFailedArtwork(pool.artwork)}
          />
        </CoverArtwork>
        <CoverContent>
          <CoverLabels>
            <CoverBadge $tone={pool.type}>{v3PoolTypeLabels[pool.type]}</CoverBadge>
            <CoverBadge $tone={pool.status}>{pool.status}</CoverBadge>
          </CoverLabels>
          <CoverTitle as={hasCardHeading ? 'p' : 'h1'}>{pool.name}</CoverTitle>
          {pool.description && <CoverDescription>{pool.description}</CoverDescription>}
          {interactive && (
            <CoverActions>
              <a href="#pool-farmcard">
                {pool.status === 'Live' ? 'Join pool' : 'View rewards'}
                <ArrowDownIcon color="currentColor" width="16px" aria-hidden="true" />
              </a>
              <button type="button" onClick={() => void copyLink()}>
                <CopyIcon color="currentColor" width="16px" aria-hidden="true" />
                Copy link
              </button>
            </CoverActions>
          )}
          {interactive && (
            <ShareFeedback data-empty={!shareStatus}>
              <span role="status">
                {shareStatus === 'copied'
                  ? 'Pool link copied.'
                  : shareStatus === 'manual'
                  ? 'Copy the pool link below.'
                  : ''}
              </span>
              {shareStatus === 'manual' && (
                <input aria-label="Pool link" readOnly value={url} onFocus={(event) => event.target.select()} />
              )}
            </ShareFeedback>
          )}
        </CoverContent>
      </PoolCover>
      <ShowroomFacts aria-label="Pool at a glance">
        <div>
          <dt>Reward tokens</dt>
          <dd>
            <ul>
              {pool.rewards.map(({ token, symbol }) => (
                <li key={token}>
                  <RewardTokenIcon token={symbol} tokenMeta={{ address: token }} size={20} />
                  {symbol}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt>{dateLabel}</dt>
          <dd>
            {hasSchedule ? (
              <time dateTime={schedule.toISOString()}>
                {schedule.toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  timeZone: 'UTC',
                })}
              </time>
            ) : (
              'Date unavailable'
            )}
          </dd>
        </div>
        <div>
          <dt>Eligible collections</dt>
          <dd>{pool.totalCollections}</dd>
        </div>
      </ShowroomFacts>
    </>
  )
}

export function PoolShowroomCollections({ collections }: { collections: V3PoolSnapshot['collections'] }) {
  const showNetworks = new Set(collections.map((rule) => (rule.managed ?? rule).sourceChainId)).size > 1
  return (
    <CollectionShelf aria-labelledby="pool-collections-title">
      <h3 id="pool-collections-title">Eligible collections</h3>
      <ul>
        {collections.map((rule) => {
          const { sourceChainId: chain, collection: address } = rule.managed ?? rule
          const featured = studioCollection(chain, address)
          const name = featured?.name || 'NFT collection'
          return (
            <li key={`${rule.sourceChainId}:${rule.collection}`}>
              {featured?.image ? (
                <img src={featured.image} alt="" width={42} height={42} loading="lazy" />
              ) : (
                <span aria-hidden="true">NFT</span>
              )}
              <div>
                <strong>{name}</strong>
                {showNetworks && <small>{sourceName(chain)}</small>}
              </div>
              <small>{rule.weight} power</small>
            </li>
          )
        })}
      </ul>
    </CollectionShelf>
  )
}

export function PoolShowroomDiscover({ related, deployment }: { related: V3PoolTeaser[]; deployment?: V3Deployment }) {
  return (
    <ShowroomSection aria-labelledby="more-pools-title">
      <DiscoverHeader>
        <h2 id="more-pools-title">Explore other pools</h2>
        <V3Link as={Link} href={v3DeploymentPath('/nftpools/v3', deployment)}>
          All V3 pools
        </V3Link>
      </DiscoverHeader>
      {related.length > 0 && (
        <RelatedPools>
          {related.map((pool) => (
            <Link href={v3DeploymentPath(`/nftpools/v3/${pool.id}`, deployment)} key={pool.id} prefetch={false}>
              <img src={pool.artwork} alt="" width={96} height={72} loading="lazy" />
              <span>
                <strong>{pool.name}</strong>
                <small>{pool.status}</small>
              </span>
            </Link>
          ))}
        </RelatedPools>
      )}
    </ShowroomSection>
  )
}
