import { useState } from 'react'
import { BigNumber } from '@ethersproject/bignumber'
import styled from 'styled-components'
import { formatBaseUnits } from '../economics'
import type { PublicV2Pool } from '../publication'

const Card = styled.article`
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.cardBorder};
  border-radius: 24px;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  color: ${({ theme }) => theme.colors.text};
  min-width: 0;
  h3 {
    font-size: 24px;
    margin: 16px 0;
  }
  p {
    line-height: 1.6;
    margin: 8px 0;
    overflow-wrap: anywhere;
  }
  a,
  summary {
    color: ${({ theme }) => theme.colors.primary};
  }
  summary {
    cursor: pointer;
    padding: 16px 0;
    font-weight: 600;
  }
`
const Banner = styled.div`
  position: relative;
  height: 190px;
  background: linear-gradient(135deg, #392268, #f20a6d);
  img,
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  span {
    position: absolute;
    right: 16px;
    top: 16px;
    border-radius: 20px;
    padding: 8px 12px;
    background: #201532;
    color: white;
    font-weight: 600;
  }
`
const Body = styled.div`
  padding: 20px;
`
const Collection = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 6px 0;
  img {
    width: 36px;
    height: 36px;
    object-fit: cover;
    border-radius: 50%;
  }
`

function amount(value?: string, decimals?: number) {
  try {
    return value === undefined ? 'Unavailable' : formatBaseUnits(BigNumber.from(value), decimals)
  } catch {
    return 'Unavailable'
  }
}

export default function PublicNftPoolCard({
  pool,
  error,
  refreshing,
}: {
  pool: PublicV2Pool
  error?: string
  refreshing?: boolean
}) {
  const [brokenBanner, setBrokenBanner] = useState(false)
  const snapshot = pool.snapshot
  return (
    <Card data-testid="published-nft-pool" data-pool-address={pool.address}>
      <Banner>
        {pool.metadata.banner && !brokenBanner ? (
          <img src={pool.metadata.banner} alt="" onError={() => setBrokenBanner(true)} />
        ) : (
          <video autoPlay loop muted playsInline src="/images/superheroes/1.webm" aria-hidden="true" />
        )}
        <span>{snapshot.status === 'ACTIVE' ? 'LIVE' : snapshot.status}</span>
      </Banner>
      <Body>
        <Collection>
          {pool.metadata.avatar ? (
            <img
              src={pool.metadata.avatar}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = '/images/nfts/no-profile-md2.png'
              }}
            />
          ) : null}
          <h3>{pool.metadata.name}</h3>
        </Collection>
        {snapshot.collections.map((collection) => (
          <Collection key={collection.address}>
            <img
              src={collection.image || '/images/nfts/no-profile-md2.png'}
              alt=""
              onError={(event) => {
                event.currentTarget.onerror = null
                event.currentTarget.src = '/images/nfts/no-profile-md2.png'
              }}
            />
            <span>
              {collection.name} · {collection.weight}x
            </span>
          </Collection>
        ))}
        <p>Rewards: {snapshot.rewards.map((reward) => reward.symbol).join(' · ')}</p>
        <p>Minimum effective power: {snapshot.threshold}</p>
        <p>
          Blocks {snapshot.startBlock.toLocaleString()} → {snapshot.endBlock.toLocaleString()}
        </p>
        {refreshing || error ? (
          <p role="status">{error || 'Refreshing chain data; showing last verified snapshot.'}</p>
        ) : null}
        <details>
          <summary>Pool details</summary>
          <p>
            Schedule: {snapshot.startBlock.toLocaleString()} → {snapshot.endBlock.toLocaleString()}
          </p>
          <p>
            Primary reward rate: {amount(snapshot.rewardPerBlock, snapshot.rewards[0]?.decimals)}{' '}
            {snapshot.rewards[0]?.symbol} / block
          </p>
          {snapshot.rewards.map((reward) => (
            <p key={reward.address}>
              {reward.symbol} pool balance: {amount(reward.balance, reward.decimals)}
              {reward.percentage !== undefined ? ` · ${reward.percentage}% of primary payout (token units)` : ''}
            </p>
          ))}
          <p>Remaining capacity: {snapshot.capacity || 'Unavailable'}</p>
          <p>Last read: block {snapshot.currentBlock.toLocaleString()}</p>
          <p>
            <a href={`https://polygonscan.com/address/${pool.address}`} target="_blank" rel="noreferrer">
              View contract
            </a>
          </p>
          {pool.metadata.projectUrl ? (
            <p>
              <a href={pool.metadata.projectUrl} target="_blank" rel="noreferrer">
                Project website
              </a>
            </p>
          ) : null}
          {pool.metadata.getNftUrl ? (
            <p>
              <a href={pool.metadata.getNftUrl} target="_blank" rel="noreferrer">
                Explore NFT collection
              </a>
            </p>
          ) : null}
          <p>Staking controls for these new pools will be available in the next phase.</p>
        </details>
      </Body>
    </Card>
  )
}
