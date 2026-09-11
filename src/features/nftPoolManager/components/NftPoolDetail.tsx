import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { formatUnits } from '@ethersproject/units'
import AdminShell from 'features/poolManager/components/AdminShell'
import {
  LinkText,
  Metric,
  MetricGrid,
  MetricLabel,
  MetricValue,
  Muted,
  Notice,
  Panel,
  PanelTitle,
  StatusPill,
  Table,
  TableWrap,
} from 'features/poolManager/components/styles'
import { formatNftDuration } from '../registry'
import { useNftPoolRegistry } from '../hooks'
import { NftPool } from '../types'
import {
  CollectionAddress,
  CollectionLine,
  CollectionList,
  CollectionName,
  DetailGrid,
  DetailHero,
  DetailHeroContent,
  DetailHeroImage,
  DetailTitle,
  WeightValue,
  WarningList,
} from './styles'

function amount(value: any, decimals?: number): string {
  if (!value || decimals === undefined) return 'Unavailable'
  try {
    return formatUnits(value, decimals)
  } catch {
    return 'Unavailable'
  }
}

function shortAddress(address?: string): string {
  if (!address) return 'Unavailable'
  return `${address.slice(0, 10)}…${address.slice(-8)}`
}

function findPool(pools: NftPool[], id: string): NftPool | undefined {
  return pools.find((pool) => pool.id === id || pool.address.toLowerCase() === id.toLowerCase())
}

export default function NftPoolDetail() {
  const router = useRouter()
  const { data, loading, error } = useNftPoolRegistry()
  const poolId = typeof router.query.poolId === 'string' ? router.query.poolId : ''
  const pool = useMemo(() => findPool(data?.pools || [], poolId), [data?.pools, poolId])

  return (
    <AdminShell
      title="NFT pool detail"
      subtitle="A human-readable inspection of frontend metadata, on-chain configuration and contract health."
      authorityScope="nft"
    >
      {error ? <Notice $error>{error}</Notice> : null}
      {loading ? <Panel>Reading Polygon pool state…</Panel> : null}
      {!loading && !pool ? (
        <Panel>
          NFT pool not found in the unified registry. <Link href="/admin/nft-pools">Return to NFT pools.</Link>
        </Panel>
      ) : null}
      {pool && data ? (
        <>
          <DetailHero>
            {pool.metadata.banner ? <DetailHeroImage src={pool.metadata.banner} alt="" /> : null}
            <DetailHeroContent>
              <StatusPill $status={pool.status}>{pool.status}</StatusPill>
              <DetailTitle>{pool.metadata.name}</DetailTitle>
              <Muted>
                {pool.protocolVersion} · {shortAddress(pool.address)} · {pool.source}
              </Muted>
            </DetailHeroContent>
          </DetailHero>

          <MetricGrid style={{ marginTop: 16 }}>
            <Metric>
              <MetricLabel>Primary reward</MetricLabel>
              <MetricValue style={{ fontSize: 19 }}>{pool.rewards.primary.token.symbol}</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Reward / block</MetricLabel>
              <MetricValue style={{ fontSize: 17 }}>
                {amount(pool.onChain.rewardPerBlock, pool.rewards.primary.token.decimals)}
              </MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Total staked power</MetricLabel>
              <MetricValue style={{ fontSize: 19 }}>{pool.onChain.totalShares?.toString() || '—'}</MetricValue>
            </Metric>
            <Metric>
              <MetricLabel>Duration</MetricLabel>
              <MetricValue style={{ fontSize: 17 }}>{formatNftDuration(pool, data.secondsPerBlock)}</MetricValue>
            </Metric>
          </MetricGrid>

          {pool.warnings.length > 0 ? (
            <Notice>
              <strong>Review before using this pool as a template.</strong>
              <WarningList>
                {pool.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </WarningList>
            </Notice>
          ) : null}

          <DetailGrid>
            <Panel>
              <PanelTitle>Overview</PanelTitle>
              <TableWrap>
                <Table>
                  <tbody>
                    <tr>
                      <th>Contract</th>
                      <td>
                        <code>{pool.address}</code>
                      </td>
                    </tr>
                    <tr>
                      <th>Owner</th>
                      <td>
                        <code>{pool.onChain.owner || 'Unavailable'}</code>
                      </td>
                    </tr>
                    <tr>
                      <th>Factory</th>
                      <td>
                        <code>{pool.onChain.factoryAddress || 'Legacy MasterChef'}</code>
                      </td>
                    </tr>
                    <tr>
                      <th>Start block</th>
                      <td>{pool.onChain.startBlock?.toLocaleString() || 'Unavailable'}</td>
                    </tr>
                    <tr>
                      <th>End block</th>
                      <td>{pool.onChain.endBlock?.toLocaleString() || 'Legacy / unavailable'}</td>
                    </tr>
                    <tr>
                      <th>Current block</th>
                      <td>{data.currentBlock.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </Table>
              </TableWrap>
            </Panel>
            <Panel>
              <PanelTitle>Rewards</PanelTitle>
              <Muted>Human-readable reward setup</Muted>
              <CollectionList style={{ marginTop: 8 }}>
                <CollectionLine>
                  <div>
                    <CollectionName>{pool.rewards.primary.token.symbol}</CollectionName>
                    <CollectionAddress>{pool.rewards.primary.token.address}</CollectionAddress>
                  </div>
                  <WeightValue>Primary</WeightValue>
                </CollectionLine>
                {pool.rewards.side.map((reward) => (
                  <CollectionLine key={reward.token.address}>
                    <div>
                      <CollectionName>{reward.token.symbol}</CollectionName>
                      <CollectionAddress>{reward.token.address}</CollectionAddress>
                    </div>
                    <WeightValue>
                      {amount(reward.poolBalance, reward.token.decimals)} {reward.token.symbol}
                    </WeightValue>
                  </CollectionLine>
                ))}
              </CollectionList>
            </Panel>
          </DetailGrid>

          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>Staking NFTs</PanelTitle>
            <Muted>
              Weights below come from the contract where the V2 ABI exposes them; legacy rows are marked as defaults.
            </Muted>
            <CollectionList style={{ marginTop: 8 }}>
              {pool.collections.map(({ collection, primary, weight, weightSource }) => (
                <CollectionLine key={collection.id}>
                  <div>
                    <CollectionName>
                      {collection.displayName} {primary ? '· Primary' : '· Community'}
                    </CollectionName>
                    <CollectionAddress>
                      {collection.address} · {collection.symbol}
                    </CollectionAddress>
                  </div>
                  <WeightValue>
                    {weight.toString()}x <Muted>{weightSource === 'on-chain' ? 'on-chain' : 'review'}</Muted>
                  </WeightValue>
                </CollectionLine>
              ))}
            </CollectionList>
          </Panel>

          <DetailGrid>
            <Panel>
              <PanelTitle>Pool parameters</PanelTitle>
              <TableWrap>
                <Table>
                  <tbody>
                    <tr>
                      <th>Participant threshold</th>
                      <td>{pool.onChain.participantThreshold?.toString() || 'Unavailable'}</td>
                    </tr>
                    <tr>
                      <th>Initial capacity</th>
                      <td>{pool.sourceEconomics.originalInitialPoolCapacity?.toString() || 'Unavailable'}</td>
                    </tr>
                    <tr>
                      <th>Remaining capacity</th>
                      <td>{pool.sourceEconomics.currentRemainingCapacity?.toString() || 'Unavailable'}</td>
                    </tr>
                    <tr>
                      <th>User limit</th>
                      <td>
                        {pool.onChain.userLimit
                          ? `Enabled · ${pool.onChain.poolLimitPerUser?.toString() || '—'}`
                          : 'Disabled / unavailable'}
                      </td>
                    </tr>
                    <tr>
                      <th>Performance fee</th>
                      <td>
                        {pool.onChain.performanceFee?.toString() || '0'} · fee receiver{' '}
                        <code>{pool.onChain.feeTo || 'unset'}</code>
                      </td>
                    </tr>
                    <tr>
                      <th>Reward balance</th>
                      <td>
                        {amount(pool.onChain.rewardBalance, pool.rewards.primary.token.decimals)}{' '}
                        {pool.rewards.primary.token.symbol}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </TableWrap>
            </Panel>
            <Panel>
              <PanelTitle>Contract health</PanelTitle>
              <TableWrap>
                <Table>
                  <tbody>
                    <tr>
                      <th>Code found</th>
                      <td>{pool.health.codeFound ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr>
                      <th>ABI compatible</th>
                      <td>{pool.health.abiCompatible ? 'Yes' : 'Limited compatibility'}</td>
                    </tr>
                    <tr>
                      <th>Owner readable</th>
                      <td>{pool.health.ownerReadable ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr>
                      <th>Reward readable</th>
                      <td>{pool.health.rewardTokenReadable ? 'Yes' : 'No'}</td>
                    </tr>
                    <tr>
                      <th>Clone support</th>
                      <td>{pool.cloneSupport}</td>
                    </tr>
                  </tbody>
                </Table>
              </TableWrap>
            </Panel>
          </DetailGrid>

          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>Deployment provenance</PanelTitle>
            <TableWrap>
              <Table>
                <tbody>
                  <tr>
                    <th>Factory</th>
                    <td>
                      <code>{pool.deployment.factoryAddress || 'Unavailable'}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>Transaction</th>
                    <td>
                      <code>{pool.deployment.transactionHash || 'Unavailable'}</code>
                    </td>
                  </tr>
                  <tr>
                    <th>Decode status</th>
                    <td>{pool.deployment.decodeStatus}</td>
                  </tr>
                  <tr>
                    <th>Deployment block</th>
                    <td>{pool.deployment.blockNumber?.toLocaleString() || 'Unavailable'}</td>
                  </tr>
                  <tr>
                    <th>Original user limit source</th>
                    <td>{pool.sourceEconomics.userLimitSource || 'Unavailable'}</td>
                  </tr>
                </tbody>
              </Table>
            </TableWrap>
            {pool.deployment.error ? (
              <Muted style={{ display: 'block', marginTop: 10 }}>{pool.deployment.error}</Muted>
            ) : null}
          </Panel>

          <Panel style={{ marginTop: 16 }}>
            <PanelTitle>Advanced details</PanelTitle>
            <details>
              <summary>Show raw addresses and side reward configuration</summary>
              <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.8 }}>
                <div>
                  <Muted>Staked token:</Muted> <code>{pool.onChain.stakingTokenAddress || 'Unavailable'}</code>
                </div>
                <div>
                  <Muted>Reward token:</Muted> <code>{pool.onChain.rewardTokenAddress || 'Unavailable'}</code>
                </div>
                <div>
                  <Muted>Side rewards:</Muted>{' '}
                  {pool.rewards.side
                    .map((reward) => `${reward.token.symbol} (${reward.onChainPercentage?.toString() || 'unknown'})`)
                    .join(', ') || 'None detected'}
                </div>
                <div>
                  <Muted>Initial capacity:</Muted>{' '}
                  {pool.sourceEconomics.originalInitialPoolCapacity?.toString() || 'Unavailable'} ·{' '}
                  <Muted>remaining:</Muted> {pool.sourceEconomics.currentRemainingCapacity?.toString() || 'Unavailable'}
                </div>
              </div>
            </details>
          </Panel>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
            {pool.cloneSupport !== 'UNAVAILABLE' ? (
              <LinkText href={`/admin/nft-pools/new?clone=${encodeURIComponent(pool.id)}`}>
                {pool.status === 'FINISHED' ? 'Renew pool' : 'Duplicate pool'}
              </LinkText>
            ) : (
              <Muted>Clone unavailable for this pool</Muted>
            )}
            <LinkText href={`https://polygonscan.com/address/${pool.address}`} target="_blank" rel="noreferrer">
              Open on PolygonScan
            </LinkText>
            <Link href="/admin/nft-pools">Back to NFT pools</Link>
          </div>
        </>
      ) : null}
    </AdminShell>
  )
}
