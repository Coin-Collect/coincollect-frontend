import { useState } from 'react'
import Link from 'next/link'
import { NftPool, NftPoolDraft, NftPoolDraftReward, NftRewardAsset } from '../../types'
import { formatBaseUnits } from '../../economics'
import { formatNftDuration } from '../../registry'
import {
  AdminPoolArtwork,
  AdminPoolArtworkImage,
  AdminPoolArtworkShade,
  AdminPoolArtworkTitle,
  AdminPoolArtworkVideo,
  AdminPoolCard,
  AdminPoolCardActions,
  AdminPoolCardBody,
  AdminPoolCardTop,
  AdminPoolIcon,
  AdminPoolIconCount,
  AdminPoolIconStack,
  AdminPoolMetric,
  AdminPoolMetricLabel,
  AdminPoolMetricRow,
  AdminPoolMetricValue,
  AdminPoolRewardChip,
  AdminPoolRewardRow,
  AdminPoolStatus,
  AdminPoolTokenFallback,
  AdminPoolTokenIcon,
  SoftLink,
  PoolMeta,
} from '../styles'

function fallbackHeroVideo(address: string): string {
  const suffix = Number.parseInt(address.slice(-2), 16)
  const index = Number.isFinite(suffix) ? (suffix % 9) + 1 : 1
  return `/images/superheroes/${index}.webm`
}

type RewardLike = NftPoolDraftReward | NftRewardAsset

function rewardIconCandidates(reward: RewardLike): string[] {
  const symbol = ('token' in reward ? reward.token.symbol : reward.symbol).toUpperCase()
  const address = 'token' in reward ? reward.token?.address : undefined
  const bySymbol: Record<string, string> = {
    COLLECT: '/images/games/tokens/0x56633733fc8BAf9f730AD2b6b9956Ae22c6d4148.png',
    USDT: '/images/games/tokens/0xc2132D05D31c914a87C6611C10748AEb04B58e8F.png',
    BLITZ: '/images/games/tokens/0x4e6D6d050BEEfd732344398aE20B23c245d6A59F.png',
    SHIB: '/images/games/tokens/shib-min.png',
  }
  return [
    bySymbol[symbol],
    address ? `/images/tokens/${address}.png` : '',
    address ? `/images/tokens/${address}.svg` : '',
  ].filter(Boolean) as string[]
}

function RewardIcon({ reward }: { reward: RewardLike }) {
  const [index, setIndex] = useState(0)
  const candidates = rewardIconCandidates(reward)
  const src = candidates[index]
  const symbol = 'token' in reward ? reward.token.symbol : reward.symbol
  return src ? (
    <AdminPoolTokenIcon src={src} alt="" onError={() => setIndex((current) => current + 1)} />
  ) : (
    <AdminPoolTokenFallback>{symbol.slice(0, 1)}</AdminPoolTokenFallback>
  )
}

function PoolArtwork({ pool }: { pool: NftPool }) {
  const [failed, setFailed] = useState(false)
  const src = pool.metadata.banner || pool.metadata.avatar
  return (
    <AdminPoolArtwork>
      {!src || failed ? (
        <AdminPoolArtworkVideo
          autoPlay
          loop
          muted
          playsInline
          src={fallbackHeroVideo(pool.address)}
          aria-hidden="true"
        />
      ) : (
        <AdminPoolArtworkImage src={src} alt="" onError={() => setFailed(true)} />
      )}
      <AdminPoolArtworkShade />
      <AdminPoolStatus $status={pool.status}>{pool.status}</AdminPoolStatus>
      <AdminPoolArtworkTitle>{pool.metadata.name}</AdminPoolArtworkTitle>
    </AdminPoolArtwork>
  )
}

function PoolCollectionStack({ pool }: { pool: NftPool }) {
  return (
    <AdminPoolIconStack aria-label={`${pool.collections.length} NFT collections`}>
      {pool.collections.slice(0, 3).map(({ collection }) => (
        <AdminPoolIcon key={collection.id} src={collection.image || '/images/nfts/no-profile-md.png'} alt="" />
      ))}
      {pool.collections.length > 3 ? <AdminPoolIconCount>+{pool.collections.length - 3}</AdminPoolIconCount> : null}
    </AdminPoolIconStack>
  )
}

export function NftPoolAdminCard({ pool, secondsPerBlock }: { pool: NftPool; secondsPerBlock: number }) {
  const rewards = [pool.rewards.primary, ...pool.rewards.side]
  const renewalLink = `/admin/nft-pools/new?clone=${encodeURIComponent(pool.id)}`
  return (
    <AdminPoolCard>
      <PoolArtwork pool={pool} />
      <AdminPoolCardBody>
        <AdminPoolCardTop>
          <PoolCollectionStack pool={pool} />
          <PoolMeta>
            {pool.collections.length} collection{pool.collections.length === 1 ? '' : 's'}
          </PoolMeta>
        </AdminPoolCardTop>
        <div>
          <PoolMeta>{pool.metadata.isCommunity ? 'Community pool' : 'CoinCollect pool'}</PoolMeta>
          <PoolMeta style={{ marginTop: 3 }}>
            {pool.metadata.projectUrl ? 'Project artwork ready' : 'Polygon NFT staking'}
          </PoolMeta>
        </div>
        <div>
          <PoolMeta style={{ marginBottom: 7 }}>Rewards</PoolMeta>
          <AdminPoolRewardRow>
            {rewards.map((reward) => (
              <AdminPoolRewardChip key={reward.token.address}>
                <RewardIcon reward={reward} />
                {reward.token.symbol}
              </AdminPoolRewardChip>
            ))}
          </AdminPoolRewardRow>
        </div>
        <AdminPoolMetricRow>
          <AdminPoolMetric>
            <AdminPoolMetricLabel>Duration</AdminPoolMetricLabel>
            <AdminPoolMetricValue>{formatNftDuration(pool, secondsPerBlock)}</AdminPoolMetricValue>
          </AdminPoolMetric>
          <AdminPoolMetric>
            <AdminPoolMetricLabel>Reward rate</AdminPoolMetricLabel>
            <AdminPoolMetricValue>
              {formatBaseUnits(pool.onChain.rewardPerBlock, pool.rewards.primary.token.decimals)} / block
            </AdminPoolMetricValue>
          </AdminPoolMetric>
        </AdminPoolMetricRow>
        {pool.onChain.startBlock !== undefined && pool.onChain.endBlock !== undefined ? (
          <PoolMeta>
            Schedule · {pool.onChain.startBlock.toLocaleString()} → {pool.onChain.endBlock.toLocaleString()}
          </PoolMeta>
        ) : (
          <PoolMeta>Schedule unavailable</PoolMeta>
        )}
        <AdminPoolCardActions>
          <Link href={`/admin/nft-pools/${pool.id}`} passHref legacyBehavior>
            <SoftLink>{pool.status === 'FINISHED' ? 'View' : 'View'}</SoftLink>
          </Link>
          {pool.cloneSupport !== 'UNAVAILABLE' ? (
            <Link href={renewalLink} passHref legacyBehavior>
              <SoftLink>{pool.status === 'FINISHED' ? 'Renew' : 'Duplicate'}</SoftLink>
            </Link>
          ) : null}
        </AdminPoolCardActions>
        {pool.warnings.length > 0 ? <PoolMeta style={{ color: 'inherit' }}>⚠ {pool.warnings[0]}</PoolMeta> : null}
      </AdminPoolCardBody>
    </AdminPoolCard>
  )
}

function DraftArtwork({ draft }: { draft: NftPoolDraft }) {
  const [failed, setFailed] = useState(false)
  const src = draft.banner || draft.avatar
  if (!src || failed) {
    return (
      <AdminPoolArtwork>
        <AdminPoolArtworkShade />
        <AdminPoolStatus $status="DRAFT">DRAFT</AdminPoolStatus>
        <AdminPoolArtworkTitle>{draft.name || 'Untitled pool'}</AdminPoolArtworkTitle>
      </AdminPoolArtwork>
    )
  }
  return (
    <AdminPoolArtwork>
      <AdminPoolArtworkImage src={src} alt="" onError={() => setFailed(true)} />
      <AdminPoolArtworkShade />
      <AdminPoolStatus $status="DRAFT">DRAFT</AdminPoolStatus>
      <AdminPoolArtworkTitle>{draft.name || 'Untitled pool'}</AdminPoolArtworkTitle>
    </AdminPoolArtwork>
  )
}

export function NftPoolDraftCard({
  draft,
  resumeSessionId,
  onDuplicate,
  onDelete,
}: {
  draft: NftPoolDraft
  resumeSessionId?: string
  onDuplicate: () => void
  onDelete: () => void
}) {
  const rewards = [draft.rewards.primary, ...draft.rewards.side].filter(Boolean) as NftPoolDraftReward[]
  return (
    <AdminPoolCard>
      <DraftArtwork draft={draft} />
      <AdminPoolCardBody>
        <AdminPoolCardTop>
          <AdminPoolIconStack aria-label={`${draft.collections.length} NFT collections`}>
            {draft.collections.slice(0, 3).map((collection) => (
              <AdminPoolIcon key={collection.collectionId} src="/images/nfts/no-profile-md.png" alt="" />
            ))}
            {draft.collections.length > 3 ? (
              <AdminPoolIconCount>+{draft.collections.length - 3}</AdminPoolIconCount>
            ) : null}
          </AdminPoolIconStack>
          <PoolMeta>Needs editing</PoolMeta>
        </AdminPoolCardTop>
        <PoolMeta>
          {draft.collections.map((collection) => collection.name).join(' · ') || 'Add an NFT collection'}
        </PoolMeta>
        <div>
          <PoolMeta style={{ marginBottom: 7 }}>Rewards</PoolMeta>
          <AdminPoolRewardRow>
            {rewards.map((reward) => (
              <AdminPoolRewardChip key={reward.address}>
                <RewardIcon reward={reward} />
                {reward.symbol}
              </AdminPoolRewardChip>
            ))}
          </AdminPoolRewardRow>
        </div>
        <AdminPoolMetricRow>
          <AdminPoolMetric>
            <AdminPoolMetricLabel>Budget</AdminPoolMetricLabel>
            <AdminPoolMetricValue>
              {draft.economics.totalBudget
                ? `${draft.economics.totalBudget} ${draft.economics.budgetDenomination || 'USDT'}`
                : 'Not set'}
            </AdminPoolMetricValue>
          </AdminPoolMetric>
          <AdminPoolMetric>
            <AdminPoolMetricLabel>Duration</AdminPoolMetricLabel>
            <AdminPoolMetricValue>
              {draft.economics.durationPreset === 'custom'
                ? `${draft.economics.customDurationDays || '—'} days`
                : draft.economics.durationPreset}
            </AdminPoolMetricValue>
          </AdminPoolMetric>
        </AdminPoolMetricRow>
        <PoolMeta>Saved {new Date(draft.updatedAt).toLocaleString()}</PoolMeta>
        <AdminPoolCardActions>
          {resumeSessionId ? (
            <Link href={`/admin/nft-pools/launch/${resumeSessionId}`} passHref legacyBehavior>
              <SoftLink>Resume launch</SoftLink>
            </Link>
          ) : null}
          <Link href={`/admin/nft-pools/new?draft=${encodeURIComponent(draft.id)}`} passHref legacyBehavior>
            <SoftLink>Continue editing</SoftLink>
          </Link>
          <SoftLink
            href="#"
            onClick={(event) => {
              event.preventDefault()
              onDuplicate()
            }}
          >
            Duplicate
          </SoftLink>
          <SoftLink
            href="#"
            onClick={(event) => {
              event.preventDefault()
              onDelete()
            }}
          >
            Delete
          </SoftLink>
        </AdminPoolCardActions>
      </AdminPoolCardBody>
    </AdminPoolCard>
  )
}
